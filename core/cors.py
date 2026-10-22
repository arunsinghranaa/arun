"""Strict Cross-Origin Resource Sharing (CORS) Module.
Enforces origin whitelisting, credentials handling, and secure preflight responses.
"""

from flask import Response, make_response, request
from config import CORS_ALLOWED_ORIGINS


def get_allowed_origin(request_origin: str | None) -> str | None:
    """Validate incoming Origin header against whitelist."""
    if not request_origin:
        return None
    if "*" in CORS_ALLOWED_ORIGINS:
        return request_origin
    if request_origin in CORS_ALLOWED_ORIGINS:
        return request_origin
    return None


def handle_cors_preflight() -> Response | None:
    """Handle OPTIONS preflight requests if the method is OPTIONS."""
    if request.method == "OPTIONS":
        origin = request.headers.get("Origin")
        allowed = get_allowed_origin(origin)

        res = make_response("", 204)
        if allowed:
            res.headers["Access-Control-Allow-Origin"] = allowed
            res.headers["Access-Control-Allow-Credentials"] = "true"
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, HEAD"
        res.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, X-Watchbloom-Visitor, X-Auth-Token, Range, "
            "ngrok-skip-browser-warning, bypass-tunnel-reminder"
        )
        res.headers["Access-Control-Expose-Headers"] = (
            "Content-Range, Accept-Ranges, Content-Length, Content-Type"
        )
        res.headers["Access-Control-Max-Age"] = "86400"
        return res
    return None


def apply_cors_headers(response: Response) -> Response:
    """Attach validated CORS headers to an outgoing response."""
    origin = request.headers.get("Origin")
    allowed = get_allowed_origin(origin)
    if allowed:
        response.headers["Access-Control-Allow-Origin"] = allowed
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = (
            "Content-Range, Accept-Ranges, Content-Length, Content-Type"
        )
    return response

