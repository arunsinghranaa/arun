"""Watchbloom Core Module
Centralized security, authentication, CORS, Redis/in-memory caching, database,
pagination, signed URLs, monitoring, error handling, Cloudflare R2/CDN,
asynchronous background tasks, and compression.
"""

from core.auth import decode_token, generate_token, require_jwt
from core.cache import CACHE, CacheManager, InMemoryTTLCache, cached_json
RedisCache = CacheManager
from core.cdn import R2_CLIENT, CloudflareR2Client, apply_cdn_cache_headers
from core.compression import init_compression
from core.cors import apply_cors_headers, handle_cors_preflight
from core.counter_buffer import (
    buffer_reaction,
    buffer_view_increment,
    flush_counter_buffer,
    get_buffered_views,
)
from core.db import (
    get_db as get_sqlite_db,
    get_live_event_record,
    init_database,
    list_active_live_events,
    mutate_video_reaction,
    query_liked_items,
    query_reaction_summary,
    save_live_event_record,
    update_live_event_status,
)
from core.errors import register_error_handlers
from core.monitoring import capture_exception, capture_message, init_monitoring
from core.pagination import paginate_list, paginate_payload, parse_pagination
from core.pg_pool import DB_CLUSTER, get_db
from core.sanitization import (
    is_safe_path,
    is_safe_video_filename,
    sanitize_id,
    sanitize_int,
    sanitize_query,
    sanitize_text,
)
from core.serialization import (
    parse_fields_param,
    project_collection,
    project_fields,
    serialize_response,
)
from core.signed_urls import generate_signed_media_url, verify_signed_media_request
from core.tasks import (
    celery_app,
    dispatch_async_job,
    flush_counters_task,
    generate_live_segment_task,
    transcode_video_task,
)

__all__ = [
    "CACHE",
    "DB_CLUSTER",
    "InMemoryTTLCache",
    "R2_CLIENT",
    "RedisCache",
    "apply_cdn_cache_headers",
    "apply_cors_headers",
    "buffer_reaction",
    "buffer_view_increment",
    "cached_json",
    "capture_exception",
    "capture_message",
    "celery_app",
    "decode_token",
    "dispatch_async_job",
    "flush_counter_buffer",
    "flush_counters_task",
    "generate_live_segment_task",
    "generate_signed_media_url",
    "generate_token",
    "get_buffered_views",
    "get_db",
    "get_sqlite_db",
    "handle_cors_preflight",
    "init_compression",
    "init_database",
    "init_monitoring",
    "is_safe_path",
    "is_safe_video_filename",
    "mutate_video_reaction",
    "paginate_list",
    "paginate_payload",
    "parse_fields_param",
    "parse_pagination",
    "project_collection",
    "project_fields",
    "query_liked_items",
    "query_reaction_summary",
    "register_error_handlers",
    "require_jwt",
    "sanitize_id",
    "sanitize_int",
    "sanitize_query",
    "sanitize_text",
    "serialize_response",
    "transcode_video_task",
    "verify_signed_media_request",
]
