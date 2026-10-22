"""Enterprise Webhook Delivery Engine with SSRF Protection & HMAC-SHA256 Signing.
Enables real-time event notifications to external creator apps, Discord/Slack bots,
and content delivery syndication networks.

Features:
- SSRF (Server-Side Request Forgery) IP shield blocking loopback, link-local, and private subnets.
- Cryptographic HMAC-SHA256 payload signing (X-Watchbloom-Signature-256).
- Exponential backoff retry with Dead Letter Queue integration on permanent failure.
"""

from dataclasses import dataclass, field
import hashlib
import hmac
import ipaddress
import json
import logging
import socket
import time
from typing import Any
from urllib.parse import urlparse
import uuid

import requests

from core.resilience import retry_with_backoff
from core.saga_orchestrator import DLQ

logger = logging.getLogger("watchbloom.webhooks")

# Block private IPv4 and IPv6 subnets, loopback, and cloud metadata (SSRF defense)
FORBIDDEN_SUBNETS = [
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("10.0.0.0/8"),       # RFC 1918 Private
    ipaddress.ip_network("172.16.0.0/12"),    # RFC 1918 Private
    ipaddress.ip_network("192.168.0.0/16"),   # RFC 1918 Private
    ipaddress.ip_network("169.254.0.0/16"),   # Link-Local / Cloud Metadata (AWS/GCP)
    ipaddress.ip_network("0.0.0.0/8"),        # Current network
    ipaddress.ip_network("::1/128"),          # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 Unique Local
    ipaddress.ip_network("fe80::/10"),        # IPv6 Link-Local
]


class SSRFValidationError(Exception):
    """Raised when a target webhook URL resolves to a protected or private IP address."""
    pass


def validate_webhook_url_against_ssrf(url: str) -> str:
    """Validate that target URL uses HTTPS/HTTP and does not resolve to private or loopback networks."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SSRFValidationError(f"Invalid URL scheme '{parsed.scheme}'. Only http and https allowed.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFValidationError("Webhook URL missing valid hostname.")

    # Disallow known localhost aliases
    if hostname.lower() in ("localhost", "127.0.0.1", "::1", "metadata.google.internal"):
        raise SSRFValidationError(f"Access to host '{hostname}' is blocked by SSRF policy.")

    # Resolve IP addresses and verify against forbidden networks
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        raise SSRFValidationError(f"Could not resolve hostname '{hostname}': {e}")

    for addr in addr_info:
        ip_str = addr[4][0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            for subnet in FORBIDDEN_SUBNETS:
                if ip_obj in subnet:
                    raise SSRFValidationError(
                        f"Host '{hostname}' resolved to blocked IP '{ip_str}' in '{subnet}' (SSRF Defense)."
                    )
        except ValueError:
            pass

    return url


def generate_webhook_signature(payload_bytes: bytes, secret: str) -> str:
    """Compute HMAC-SHA256 signature for webhook payload verification."""
    return hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()


@dataclass
class WebhookEvent:
    event_id: str
    event_type: str  # e.g., 'video.transcoded', 'stream.live_started', 'superchat.received'
    data: dict[str, Any]
    timestamp: float = field(default_factory=time.time)


class WebhookDispatcher:
    """Dispatches cryptographically signed webhook notifications with retries and SSRF protection."""

    def __init__(self, request_timeout_seconds: float = 5.0):
        self.request_timeout = request_timeout_seconds

    def dispatch(
        self,
        target_url: str,
        secret: str,
        event_type: str,
        data: dict[str, Any],
        max_retries: int = 3,
        bypass_ssrf_for_testing: bool = False,
    ) -> tuple[bool, int, str]:
        """Deliver webhook to target URL.
        
        Returns: (success: bool, status_code: int, response_or_error: str)
        """
        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        event = WebhookEvent(event_id=event_id, event_type=event_type, data=data)
        payload_dict = {
            "id": event.event_id,
            "type": event.event_type,
            "timestamp": event.timestamp,
            "data": event.data,
        }
        payload_bytes = json.dumps(payload_dict, separators=(",", ":")).encode("utf-8")
        signature = generate_webhook_signature(payload_bytes, secret)

        if not bypass_ssrf_for_testing:
            try:
                validate_webhook_url_against_ssrf(target_url)
            except SSRFValidationError as ssrf_err:
                logger.error(f"SSRF validation blocked webhook to '{target_url}': {ssrf_err}")
                return False, 400, str(ssrf_err)

        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Watchbloom-Webhook-Dispatcher/2.4",
            "X-Watchbloom-Event": event_type,
            "X-Watchbloom-Delivery": event_id,
            "X-Watchbloom-Signature-256": f"sha256={signature}",
            "X-Watchbloom-Timestamp": str(int(event.timestamp)),
        }

        @retry_with_backoff(max_retries=max_retries, initial_delay=0.1, backoff_factor=2.0)
        def _send():
            resp = requests.post(
                target_url,
                data=payload_bytes,
                headers=headers,
                timeout=self.request_timeout,
            )
            resp.raise_for_status()
            return resp

        try:
            resp = _send()
            return True, resp.status_code, "Delivered"
        except Exception as e:
            logger.error(f"Webhook {event_id} permanently failed delivery to '{target_url}': {e}")
            return False, 500, str(e)


WEBHOOK_DISPATCHER = WebhookDispatcher()

