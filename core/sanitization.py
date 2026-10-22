from typing import Any
"""Input validation, path normalization, and sanitization utilities.
Defends against Path Traversal (CWE-22), XSS (CWE-79), and Injection attacks.
"""

import re
import unicodedata
from pathlib import Path

from config import ALLOWED_VIDEO_EXTENSIONS, VIDEO_DIR


def sanitize_id(raw_id: Any, max_len: int = 64) -> str:
    """Sanitize an item or resource ID to safe alphanumeric characters and underscores, preventing path traversal."""
    if raw_id is None:
        return ""
    base_name = Path(str(raw_id).replace("\\", "/")).name
    clean = re.sub(r"[^a-zA-Z0-9_-]", "_", base_name.strip()).strip("_")
    return clean[:max_len]


def sanitize_text(raw_text: Any, max_len: int = 500, strip_html: bool = True) -> str:
    """Normalize, strip HTML/script tags, and strip control characters from user text inputs."""
    if raw_text is None:
        return ""
    text = str(raw_text).strip()
    # Normalize unicode to avoid visual deception or normalization bypasses
    normalized = unicodedata.normalize("NFKC", text)
    if strip_html:
        # Strip script/style blocks completely
        normalized = re.sub(r"(?is)<script.*?>.*?</script>", "", normalized)
        normalized = re.sub(r"(?is)<style.*?>.*?</style>", "", normalized)
        # Strip all HTML tags
        normalized = re.sub(r"<[^>]+>", "", normalized)
    # Strip unprintable control characters (except common whitespace)
    cleaned = "".join(ch for ch in normalized if ch == " " or ch == "\n" or not unicodedata.category(ch).startswith("C"))
    return cleaned[:max_len].strip()


def sanitize_query(raw_query: Any, max_len: int = 100) -> str:
    """Sanitize search query strings."""
    if raw_query is None:
        return ""
    query = sanitize_text(raw_query, max_len)
    return query[:max_len].strip()


def sanitize_int(val: Any, default: int = 0, min_val: int | None = None, max_val: int | None = None) -> int:
    """Safely parse an integer with optional clamping."""
    try:
        parsed = int(val)
    except (ValueError, TypeError):
        parsed = default

    if min_val is not None:
        parsed = max(min_val, parsed)
    if max_val is not None:
        parsed = min(max_val, parsed)
    return parsed


def is_safe_video_filename(filename: str | None) -> bool:
    """Validate that filename is a simple basename without path traversal,
    resolves strictly within VIDEO_DIR, and has an allowed video extension.
    """
    if not filename or not isinstance(filename, str):
        return False
    clean = filename.strip()
    if not clean or "/" in clean or "\\" in clean or ".." in clean:
        return False
    if Path(clean).name != clean:
        return False
    ext = Path(clean).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        return False
    try:
        resolved = (VIDEO_DIR / clean).resolve()
        video_dir_resolved = VIDEO_DIR.resolve()
        return resolved.is_relative_to(video_dir_resolved) and resolved != video_dir_resolved
    except Exception:
        return False


def is_safe_path(base_dir: str | Path, filename_or_path: str | Path) -> bool:
    """Ensure a target file or subpath cannot escape base_dir."""
    try:
        base = Path(base_dir).resolve()
        target = (base / filename_or_path).resolve()
        return target.is_relative_to(base) and target != base
    except Exception:
        return False

