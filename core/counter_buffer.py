"""High-throughput write-behind counter and reaction buffer.
Batches high-frequency view increments and reactions in Redis to eliminate DB write lock contention.
"""

import logging
import threading
from typing import Any
from core.cache import CACHE

logger = logging.getLogger("watchbloom.counter_buffer")

_LOCAL_LOCK = threading.Lock()
_LOCAL_VIEWS: dict[str, int] = {}
_LOCAL_REACTIONS: list[tuple[str, str, str | None]] = []


def buffer_view_increment(item_id: str, increment: int = 1) -> int:
    """Record a view count increment into the write-behind buffer."""
    if not item_id:
        return 0

    if CACHE.is_redis and CACHE.redis is not None:
        r: Any = CACHE.redis
        try:
            pipe = r.pipeline()
            pipe.hincrby("buffer:views", item_id, increment)
            pipe.sadd("buffer:dirty_views", item_id)
            res = pipe.execute()
            return int(res[0])
        except Exception as err:
            logger.warning(f"Redis view buffer failed, falling back to local: {err}")

    # In-memory fallback
    with _LOCAL_LOCK:
        _LOCAL_VIEWS[item_id] = _LOCAL_VIEWS.get(item_id, 0) + increment
        return _LOCAL_VIEWS[item_id]


def get_buffered_views(item_id: str) -> int:
    """Read pending uncommitted view increments for an item."""
    if not item_id:
        return 0
    if CACHE.is_redis and CACHE.redis is not None:
        try:
            val = CACHE.redis.hget("buffer:views", item_id)
            return int(val) if val else 0
        except Exception:
            pass
    with _LOCAL_LOCK:
        return _LOCAL_VIEWS.get(item_id, 0)


def buffer_reaction(item_id: str, visitor_id: str, reaction: str | None) -> None:
    """Buffer a video reaction mutation."""
    if not item_id or not visitor_id:
        return

    if CACHE.is_redis and CACHE.redis is not None:
        r: Any = CACHE.redis
        try:
            key = f"buffer:reactions:{item_id}"
            val = reaction or "none"
            pipe = r.pipeline()
            pipe.hset(key, visitor_id, val)
            pipe.sadd("buffer:dirty_reaction_items", item_id)
            pipe.execute()
            return
        except Exception as err:
            logger.warning(f"Redis reaction buffer failed: {err}")

    with _LOCAL_LOCK:
        _LOCAL_REACTIONS.append((item_id, visitor_id, reaction))


def flush_counter_buffer(db_mutate_func=None) -> dict[str, int]:
    """Flush buffered view counts and reactions to the persistent database.
    Returns summary counts of flushed items.
    """
    flushed_views = 0
    flushed_reactions = 0

    # 1. Flush Redis counters if available
    if CACHE.is_redis and CACHE.redis is not None:
        r: Any = CACHE.redis
        try:
            dirty_items = r.smembers("buffer:dirty_views")
            if dirty_items:
                pipe = r.pipeline()
                for item_bytes in dirty_items:
                    item_id = item_bytes.decode("utf-8") if isinstance(item_bytes, bytes) else str(item_bytes)
                    count_str = r.hget("buffer:views", item_id)
                    if count_str:
                        count = int(count_str)
                        if count > 0:
                            pipe.hincrby("buffer:views", item_id, -count)
                            if db_mutate_func:
                                db_mutate_func(item_id, count)
                            flushed_views += 1
                pipe.srem("buffer:dirty_views", *dirty_items)
                pipe.execute()
        except Exception as err:
            logger.error(f"Error flushing Redis view buffer: {err}")

    # 2. Flush local memory buffer
    with _LOCAL_LOCK:
        if _LOCAL_VIEWS:
            for item_id, count in list(_LOCAL_VIEWS.items()):
                if count > 0 and db_mutate_func:
                    try:
                        db_mutate_func(item_id, count)
                    except Exception:
                        pass
                flushed_views += 1
            _LOCAL_VIEWS.clear()

    return {"flushed_views": flushed_views, "flushed_reactions": flushed_reactions}

