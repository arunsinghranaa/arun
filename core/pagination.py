"""Pagination Helper Module for Watchbloom Video Streaming Platform.
Enforces limits, validates offsets, and formats standardized pagination envelopes.
"""

from typing import Any, Mapping


def parse_pagination(
    args: Mapping[str, Any],
    default_limit: int = 20,
    max_limit: int = 50,
) -> tuple[int, int]:
    """Parse and clamp limit & offset parameters from query args.
    Supports either:
      - limit & offset (0-indexed offset)
      - limit & page (1-indexed page number)
    Raises ValueError on invalid (non-integer) parameters.
    """
    raw_limit = args.get("limit")
    raw_offset = args.get("offset")
    raw_page = args.get("page")

    try:
        limit = int(raw_limit) if raw_limit is not None else default_limit
    except (ValueError, TypeError):
        raise ValueError("limit must be an integer")

    limit = max(1, min(limit, max_limit))

    if raw_page is not None:
        try:
            page = int(raw_page)
        except (ValueError, TypeError):
            raise ValueError("page must be an integer")
        page = max(1, page)
        offset = (page - 1) * limit
    elif raw_offset is not None:
        try:
            offset = int(raw_offset)
        except (ValueError, TypeError):
            raise ValueError("offset must be an integer")
        offset = max(0, offset)
    else:
        offset = 0

    return limit, offset


def paginate_list(
    items: list[Any],
    limit: int,
    offset: int,
) -> tuple[list[Any], dict[str, Any]]:
    """Slice a list by offset and limit, returning the page slice and pagination metadata."""
    total = len(items)
    page_items = items[offset : offset + limit]
    page = (offset // limit) + 1 if limit > 0 else 1
    total_pages = max(1, (total + limit - 1) // limit) if total > 0 and limit > 0 else 1
    has_next = (offset + len(page_items)) < total
    has_prev = offset > 0

    meta = {
        "total": total,
        "limit": limit,
        "offset": offset,
        "page": page,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_prev": has_prev,
    }
    return page_items, meta


def paginate_payload(
    results: list[Any],
    total: int,
    limit: int,
    offset: int,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a complete standardized pagination response dictionary."""
    page = (offset // limit) + 1 if limit > 0 else 1
    total_pages = max(1, (total + limit - 1) // limit) if total > 0 and limit > 0 else 1
    has_next = (offset + len(results)) < total
    has_prev = offset > 0

    payload: dict[str, Any] = {
        "results": results,
        "total": total,
        "limit": limit,
        "offset": offset,
        "page": page,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_prev": has_prev,
    }
    if extra:
        payload.update(extra)
    return payload

