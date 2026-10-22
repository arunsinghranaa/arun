"""Signed URLs & Media Access Protection Module.
Generates and verifies time-limited HMAC-SHA256 signatures for media streaming.
Prevents hotlinking, unauthorized sharing, and unauthenticated scrapers.
"""

import hashlib
import hmac
import time
from urllib.parse import urlencode

from config import SECRET_KEY


def generate_signed_media_url(
    path: str,
    expires_in: int = 3600,
    extra_params: dict | None = None,
    secret_key: str = SECRET_KEY,
) -> str:
    """Generate a time-limited HMAC-SHA256 signed URL for a media asset."""
    expires = int(time.time()) + int(expires_in)
    base_path = str(path).split("?")[0]
    message = f"{base_path}:{expires}"
    signature = hmac.new(
        secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()[:32]

    params = {"expires": str(expires), "sig": signature}
    if extra_params:
        params.update(extra_params)

    query_str = urlencode(params)
    return f"{base_path}?{query_str}"


def verify_signed_media_request(
    path: str,
    expires_str: str | None,
    sig_str: str | None,
    secret_key: str = SECRET_KEY,
    allow_unsigned: bool = True,
) -> tuple[bool, str]:
    """Verify incoming signed URL query parameters.
    Returns (is_valid, reason).
    """
    if not sig_str or not expires_str:
        if allow_unsigned:
            return True, "unsigned_allowed"
        return False, "Missing required signature or expiration timestamp."

    try:
        expires = int(expires_str)
    except (ValueError, TypeError):
        return False, "Malformed expiration parameter."

    # Check expiration
    if time.time() > expires:
        return False, "Signed media URL has expired."

    base_path = str(path).split("?")[0]

    def _sig_match(p: str) -> bool:
        msg = f"{p}:{expires}"
        exp = hmac.new(
            secret_key.encode("utf-8"),
            msg.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()[:32]
        return hmac.compare_digest(exp, sig_str.strip())

    matched = _sig_match(base_path)
    if not matched:
        if base_path.startswith("/api/v1/media/"):
            matched = _sig_match("/api/media/" + base_path[len("/api/v1/media/"):])
        elif base_path.startswith("/api/media/"):
            matched = _sig_match("/api/v1/media/" + base_path[len("/api/media/"):])

    if not matched:
        return False, "Invalid signature for requested media resource."

    return True, "valid"
