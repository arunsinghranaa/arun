"""Global Error Handling and Edge Case Management.
Ensures uniform structured JSON error responses across all API endpoints without leaking internal traces.
"""

import logging
from flask import Flask, g, jsonify, request
from werkzeug.exceptions import HTTPException
from core.monitoring import capture_exception

logger = logging.getLogger(__name__)


def _req_id() -> str:
    """Extract or generate request correlation ID."""
    return getattr(g, "request_id", None) or request.headers.get("X-Request-ID") or "unknown"


def register_error_handlers(app: Flask) -> None:
    """Register centralized error handlers on the Flask application."""

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        if request.path.startswith("/api/") or request.is_json:
            return jsonify(
                error=e.description,
                code=e.code,
                status="error",
                request_id=_req_id(),
            ), e.code
        return e.get_response()

    @app.errorhandler(400)
    def bad_request(error):
        msg = getattr(error, "description", "Bad Request")
        if request.path.startswith("/api/"):
            return jsonify(error=msg, code=400, status="error", request_id=_req_id()), 400
        return f"Bad Request: {msg}", 400

    @app.errorhandler(401)
    def unauthorized(error):
        msg = getattr(error, "description", "Authentication required")
        if request.path.startswith("/api/"):
            return jsonify(error=msg, code=401, status="error", request_id=_req_id()), 401
        return "Unauthorized", 401

    @app.errorhandler(403)
    def forbidden(error):
        msg = getattr(error, "description", "Access forbidden")
        if request.path.startswith("/api/"):
            return jsonify(error=msg, code=403, status="error", request_id=_req_id()), 403
        return "Forbidden", 403

    @app.errorhandler(404)
    def not_found(error):
        msg = getattr(error, "description", "Resource not found")
        if request.path.startswith("/api/"):
            return jsonify(error=msg, code=404, status="error", request_id=_req_id()), 404
        return "Not Found", 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        if request.path.startswith("/api/"):
            return jsonify(error="Method Not Allowed", code=405, status="error", request_id=_req_id()), 405
        return "Method Not Allowed", 405

    @app.errorhandler(413)
    def request_entity_too_large(error):
        msg = "Uploaded payload exceeds the maximum allowed limit of 250 MB."
        if request.path.startswith("/api/"):
            return jsonify(error=msg, code=413, status="error", request_id=_req_id()), 413
        return msg, 413

    @app.errorhandler(500)
    def internal_server_error(error):
        req_id = _req_id()
        logger.error(f"[{req_id}] Internal server error processing {request.path}: {error}", exc_info=True)
        capture_exception(error, extra={"request_id": req_id})
        if request.path.startswith("/api/"):
            return jsonify(
                error="Internal server error. Please try again later.",
                code=500,
                status="error",
                request_id=req_id,
            ), 500
        return "Internal Server Error", 500

    @app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        req_id = _req_id()
        logger.error(f"[{req_id}] Unhandled exception on {request.method} {request.path}: {e}", exc_info=True)
        capture_exception(e, extra={"request_id": req_id})
        if request.path.startswith("/api/") or request.is_json:
            return jsonify(
                error="An unexpected server error occurred.",
                code=500,
                status="error",
                request_id=req_id,
            ), 500
        return "Internal Server Error", 500

