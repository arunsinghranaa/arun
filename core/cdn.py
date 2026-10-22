"""Cloudflare R2 Object Storage and Cloudflare CDN Edge Caching Integration.
Provides direct-to-storage presigned uploads, CDN streaming URLs, and edge surrogate controls.
"""

import logging
from pathlib import Path
from typing import Any
from flask import Response

from config import (
    CDN_BASE_URL,
    R2_ACCESS_KEY_ID,
    R2_BUCKET_NAME,
    R2_ENDPOINT_URL,
    R2_SECRET_ACCESS_KEY,
)

logger = logging.getLogger("watchbloom.cdn")

try:
    import boto3
    from botocore.config import Config
    HAS_BOTO3 = True
except ImportError:
    boto3 = None  # type: ignore
    Config = None  # type: ignore
    HAS_BOTO3 = False


class CloudflareR2Client:
    """S3-compatible client for Cloudflare R2 Object Storage."""

    def __init__(self):
        self._client = None
        self.bucket = R2_BUCKET_NAME
        self.endpoint_url = R2_ENDPOINT_URL
        self.cdn_base = CDN_BASE_URL

    @property
    def is_configured(self) -> bool:
        """Check if Cloudflare R2 credentials and endpoint are present."""
        return bool(R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and self.endpoint_url and HAS_BOTO3)

    def _get_client(self) -> Any:
        if self._client is None and self.is_configured and boto3 is not None and Config is not None:
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=R2_ACCESS_KEY_ID,
                aws_secret_access_key=R2_SECRET_ACCESS_KEY,
                region_name="auto",
                config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
            )
        return self._client

    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str = "video/mp4",
        expires_in: int = 3600,
    ) -> dict[str, Any]:
        """Generate a presigned PUT URL allowing clients to upload directly to R2."""
        if not self.is_configured:
            # Local mock fallback
            return {
                "upload_url": f"/api/v1/upload/direct-mock?key={key}",
                "key": key,
                "provider": "local_mock",
                "expires_in": expires_in,
            }

        client = self._get_client()
        url = client.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires_in,
        )
        return {
            "upload_url": url,
            "key": key,
            "bucket": self.bucket,
            "provider": "cloudflare_r2",
            "expires_in": expires_in,
        }

    def generate_presigned_download_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate a time-limited presigned GET URL for an R2 asset."""
        if not self.is_configured:
            return f"/api/v1/media/{key}"

        client = self._get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def get_public_cdn_url(self, key: str) -> str:
        """Return public Cloudflare CDN edge URL if configured, else relative path."""
        clean_key = str(key).lstrip("/")
        if self.cdn_base:
            return f"{self.cdn_base}/{clean_key}"
        return f"/api/v1/media/{clean_key}"

    def upload_file(self, local_path: Path | str, s3_key: str, content_type: str | None = None) -> bool:
        """Upload a local file directly to Cloudflare R2."""
        if not self.is_configured:
            return False
        client = self._get_client()
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        try:
            client.upload_file(str(local_path), self.bucket, s3_key, ExtraArgs=extra_args or None)
            return True
        except Exception as err:
            logger.error(f"Failed to upload {local_path} to R2 ({s3_key}): {err}")
            return False

    def download_file(self, s3_key: str, local_path: Path | str) -> bool:
        """Download an R2 asset to a local file."""
        if not self.is_configured:
            return False
        client = self._get_client()
        if client is None:
            return False
        try:
            client.download_file(self.bucket, s3_key, str(local_path))
            return True
        except Exception as err:
            logger.error(f"Failed to download {s3_key} from R2 to {local_path}: {err}")
            return False


class MultiCDNManager:
    """Manages Multi-CDN global routing across Cloudflare, AWS CloudFront, and Fastly."""

    def __init__(self):
        import os
        self.providers = {
            "cloudflare": os.environ.get("CDN_BASE_URL", "").rstrip("/"),
            "cloudfront": os.environ.get("CLOUDFRONT_BASE_URL", "").rstrip("/"),
            "fastly": os.environ.get("FASTLY_BASE_URL", "").rstrip("/"),
        }

    def get_optimal_cdn_url(self, key: str, provider: str | None = None) -> str:
        """Route client to the optimal CDN edge based on provider or QoE telemetry."""
        clean_key = str(key).lstrip("/")
        chosen = provider if provider in self.providers else "cloudflare"
        base = self.providers.get(chosen) or self.providers.get("cloudflare")
        if base:
            return f"{base}/{clean_key}"
        return f"/api/v1/media/{clean_key}"


R2_CLIENT = CloudflareR2Client()
MULTI_CDN = MultiCDNManager()


def apply_cdn_cache_headers(response: Response, resource_type: str, item_id: str | None = None) -> Response:
    """Set hardened edge and browser cache controls tailored for Multi-CDN architectures."""
    if item_id:
        response.headers["Surrogate-Key"] = f"watchbloom-{item_id} watchbloom-global"

    if resource_type == "hls_segment":
        # Immutable video segments cached 1 year
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        response.headers["CDN-Cache-Control"] = "max-age=31536000"
        response.headers["Edge-Control"] = "cache-maxage=31536000"
    elif resource_type == "hls_vod_manifest":
        # Master playlists cached 1 hour at edge, with stale-while-revalidate
        response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400"
        response.headers["CDN-Cache-Control"] = "max-age=86400"
        response.headers["Edge-Control"] = "cache-maxage=86400"
    elif resource_type == "hls_live_manifest":
        # Rolling live manifest with ultra-low TTL
        response.headers["Cache-Control"] = "public, max-age=1, s-maxage=2"
        response.headers["CDN-Cache-Control"] = "max-age=2"
        response.headers["Edge-Control"] = "cache-maxage=2"
    elif resource_type == "catalog_query":
        # Search & Explore APIs
        response.headers["Cache-Control"] = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        response.headers["CDN-Cache-Control"] = "max-age=300"
        response.headers["Edge-Control"] = "cache-maxage=300"
    elif resource_type == "static_asset":
        response.headers["Cache-Control"] = "public, max-age=2592000, immutable"
        response.headers["Edge-Control"] = "cache-maxage=2592000"
    elif resource_type == "private":
        response.headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate"

    return response


def purge_cloudflare_cache(
    tags: list[str] | None = None,
    urls: list[str] | None = None,
    zone_id: str | None = None,
    api_token: str | None = None,
) -> dict[str, Any]:
    """Purge cached video assets or manifests across Cloudflare 300+ Edge Data Centers.
    Uses Cloudflare API v4 with Cache-Tags (Surrogate-Keys) or URL prefixes.
    """
    import json
    import os
    import urllib.request
    import urllib.error

    effective_zone = zone_id or os.environ.get("CLOUDFLARE_ZONE_ID", "")
    effective_token = api_token or os.environ.get("CLOUDFLARE_API_TOKEN", "")

    if not effective_zone or not effective_token:
        logger.info(f"Cloudflare credentials absent; skipping live purge for tags={tags}, urls={urls}")
        return {"success": True, "provider": "mock", "purged_tags": tags or [], "purged_urls": urls or []}

    payload: dict[str, Any] = {}
    if tags:
        payload["tags"] = tags
    if urls:
        payload["files"] = urls
    if not payload:
        payload["purge_everything"] = True

    req_url = f"https://api.cloudflare.com/client/v4/zones/{effective_zone}/purge_cache"
    req_body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        req_url,
        data=req_body,
        headers={
            "Authorization": f"Bearer {effective_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            logger.info(f"Cloudflare cache successfully purged: {data.get('success')}")
            return data
    except urllib.error.URLError as err:
        logger.warning(f"Cloudflare cache purge failed: {err}")
        return {"success": False, "error": str(err)}


