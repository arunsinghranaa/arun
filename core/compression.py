from typing import Any
"""Dynamic Brotli and Gzip HTTP response compression middleware.
Minimizes network payloads and transfer latencies for JSON and text responses.
"""

import gzip
import logging
from flask import Flask, request

from config import COMPRESSION_MIN_BYTES, ENABLE_BROTLI

logger = logging.getLogger("watchbloom.compression")

try:
    import brotli
    HAS_BROTLI = True
except ImportError:
    brotli = None  # type: ignore
    HAS_BROTLI = False


def init_compression(app: Flask) -> None:
    """Register response compression after_request handler on the Flask app."""

    @app.after_request
    def compress_response(response):
        # Only compress 2xx successful responses
        if response.status_code < 200 or response.status_code >= 300:
            return response

        # Don't compress direct passthrough or streaming file responses
        if getattr(response, "direct_passthrough", False) or not getattr(response, "is_sequence", True):
            return response

        # Don't re-compress already encoded responses
        if "Content-Encoding" in response.headers:
            return response

        # Only compress text, JSON, and WebVTT mime types
        mimetype = (response.mimetype or "").lower()
        if not (
            mimetype.startswith("application/json")
            or mimetype.startswith("text/")
            or mimetype == "application/vnd.apple.mpegurl"
        ):
            return response

        # Get response body
        try:
            data = response.get_data()
        except (RuntimeError, Exception):
            return response

        if len(data) < COMPRESSION_MIN_BYTES:
            return response

        accept_encoding = request.headers.get("Accept-Encoding", "").lower()

        # Prioritize Brotli when supported and available
        if ENABLE_BROTLI and HAS_BROTLI and brotli is not None and "br" in accept_encoding:
            try:
                b_mod: Any = brotli
                compressed_data = b_mod.compress(data, quality=4)
                response.set_data(compressed_data)
                response.headers["Content-Encoding"] = "br"
                response.headers["Vary"] = "Accept-Encoding"
                response.headers["Content-Length"] = str(len(compressed_data))
                return response
            except Exception as e:
                logger.warning(f"Brotli compression failed: {e}")

        # Fall back to standard Gzip
        if "gzip" in accept_encoding:
            try:
                compressed_data = gzip.compress(data, compresslevel=6)
                response.set_data(compressed_data)
                response.headers["Content-Encoding"] = "gzip"
                response.headers["Vary"] = "Accept-Encoding"
                response.headers["Content-Length"] = str(len(compressed_data))
                return response
            except Exception as e:
                logger.warning(f"Gzip compression failed: {e}")

        return response
