"""Payload size minimization, sparse field selection, and binary serialization utilities.
Supports GraphQL-like sparse field projection and MessagePack binary encoding.
"""

from typing import Any, Mapping
from flask import Response, jsonify, request

from config import ENABLE_MSGPACK

try:
    import msgpack
    HAS_MSGPACK = True
except ImportError:
    msgpack = None  # type: ignore
    HAS_MSGPACK = False


def parse_fields_param(fields_str: str | None) -> set[str] | None:
    """Parse comma-separated field projection parameter: ?fields=id,title,views,art,duration"""
    if not fields_str or not isinstance(fields_str, str):
        return None
    parsed = {f.strip() for f in fields_str.split(",") if f.strip()}
    return parsed or None


def project_fields(item: Mapping[str, Any], fields: set[str] | None) -> dict[str, Any]:
    """Filter dictionary to only requested fields. If fields is None, returns all fields."""
    if not fields:
        return dict(item)
    return {k: v for k, v in item.items() if k in fields}


def project_collection(items: list[Mapping[str, Any]], fields: set[str] | None) -> list[dict[str, Any]]:
    """Filter each dictionary in a collection to requested fields."""
    if not fields:
        return [dict(it) for it in items]
    return [project_fields(it, fields) for it in items]


def serialize_response(data: Any, status: int = 200, headers: dict[str, str] | None = None) -> Response:
    """Return MessagePack binary response if requested by client, else JSON."""
    accept = request.headers.get("Accept", "").lower()

    if ENABLE_MSGPACK and HAS_MSGPACK and msgpack is not None and ("application/x-msgpack" in accept or "application/msgpack" in accept):
        try:
            mp: Any = msgpack
            packed_bytes = mp.packb(data, use_bin_type=True)
            resp = Response(packed_bytes, status=status, mimetype="application/x-msgpack")
            resp.headers["Vary"] = "Accept"
            if headers:
                for k, v in headers.items():
                    resp.headers[k] = v
            return resp
        except Exception:
            pass  # Fall back to standard JSON on packing error

    resp = jsonify(data)
    resp.status_code = status
    if headers:
        for k, v in headers.items():
            resp.headers[k] = v
    return resp

