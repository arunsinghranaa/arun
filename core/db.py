"""Database connection pool, schema initialization, and performance indexing.
Configures SQLite WAL (Write-Ahead Logging) mode, connection pooling, covering indexes,
and Redis caching for reaction counts.
"""

from contextlib import contextmanager
import logging
from pathlib import Path
import sqlite3
import threading

from config import REACTIONS_DB
from core.cache import CACHE

logger = logging.getLogger("watchbloom.db")


class SQLiteConnectionPool:
    """Thread-safe connection pool for SQLite to eliminate file open/close overhead."""

    def __init__(self, db_path: Path = REACTIONS_DB, max_connections: int = 25):
        self.db_path = db_path
        self.max_connections = max_connections
        self._pool: list[sqlite3.Connection] = []
        self._lock = threading.Lock()

    def get_connection(self) -> sqlite3.Connection:
        with self._lock:
            while self._pool:
                conn = self._pool.pop()
                try:
                    conn.execute("SELECT 1;")
                    return conn
                except Exception:
                    try:
                        conn.close()
                    except Exception:
                        pass

        conn = sqlite3.connect(self.db_path, timeout=10, check_same_thread=False)
        # High-performance SQLite pragmas
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        conn.execute("PRAGMA cache_size = -64000;")  # 64 MB memory page cache
        return conn

    def release_connection(self, conn: sqlite3.Connection) -> None:
        if not conn:
            return
        with self._lock:
            if len(self._pool) < self.max_connections:
                self._pool.append(conn)
            else:
                try:
                    conn.close()
                except Exception:
                    pass

    def close_all(self) -> None:
        with self._lock:
            while self._pool:
                try:
                    self._pool.pop().close()
                except Exception:
                    pass


SQLITE_POOL = SQLiteConnectionPool()
import atexit
atexit.register(SQLITE_POOL.close_all)


@contextmanager
def get_db_connection(db_path: Path = REACTIONS_DB):
    """Context manager for pooled SQLite connections with WAL mode and automatic return."""
    if db_path == REACTIONS_DB:
        conn = SQLITE_POOL.get_connection()
        try:
            yield conn
        finally:
            SQLITE_POOL.release_connection(conn)
    else:
        conn = sqlite3.connect(db_path, timeout=10)
        try:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            conn.execute("PRAGMA busy_timeout = 5000;")
            yield conn
        finally:
            conn.close()


get_db = get_db_connection


def init_database(db_path: Path = REACTIONS_DB) -> None:
    """Initialize database tables and create optimal indexes."""
    with get_db_connection(db_path) as conn:
        with conn:
            # 1. Main reactions table
            conn.execute(
                "CREATE TABLE IF NOT EXISTS video_reactions ("
                "item_id TEXT NOT NULL, "
                "visitor_id TEXT NOT NULL, "
                "reaction TEXT NOT NULL, "
                "PRIMARY KEY (item_id, visitor_id), "
                "CHECK (reaction IN ('like', 'dislike')))"
            )

            # 2. Performance indexes for fast querying without full table scans
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_reactions_visitor_reaction "
                "ON video_reactions(visitor_id, reaction);"
            )

            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_reactions_item_reaction "
                "ON video_reactions(item_id, reaction);"
            )

            # 3. User settings table
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS user_settings (
                    user_id TEXT PRIMARY KEY,
                    profile_visibility TEXT DEFAULT 'public',
                    show_subscriptions INTEGER DEFAULT 1,
                    show_liked_videos INTEGER DEFAULT 0,
                    search_indexing INTEGER DEFAULT 1,
                    default_quality TEXT DEFAULT 'auto',
                    autoplay INTEGER DEFAULT 1,
                    ambient_mode INTEGER DEFAULT 1,
                    default_playback_rate REAL DEFAULT 1.0,
                    captions_enabled INTEGER DEFAULT 0,
                    captions_language TEXT DEFAULT 'en',
                    email_notifications INTEGER DEFAULT 1,
                    subscriber_alerts INTEGER DEFAULT 1,
                    recommendation_alerts INTEGER DEFAULT 1,
                    security_alerts INTEGER DEFAULT 1,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_user_settings_uid ON user_settings(user_id);"
            )

            # 4. Abuse & copyright reports table
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS abuse_reports (
                    report_id TEXT PRIMARY KEY,
                    reporter_id TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    reason_code TEXT NOT NULL,
                    description TEXT,
                    target_metadata TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TIMESTAMP
                );
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_reports_target ON abuse_reports(target_type, target_id);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_reports_reporter ON abuse_reports(reporter_id);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_reports_status ON abuse_reports(status);"
            )

            # 5. Mail & contact inquiries table
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS mail_inquiries (
                    mail_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    sender_email TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    category TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT DEFAULT 'queued',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_mail_user ON mail_inquiries(user_id);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_mail_status ON mail_inquiries(status);"
            )

            # 6. System notification logs table
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS system_notifications (
                    notification_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    type TEXT DEFAULT 'info',
                    is_read INTEGER DEFAULT 0,
                    metadata_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_notifications_user_read "
                "ON system_notifications(user_id, is_read, created_at DESC);"
            )

            # 7. Live streaming events table for Creator Studio
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS live_events (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    author TEXT NOT NULL,
                    description TEXT,
                    category TEXT DEFAULT 'entertainment',
                    status TEXT DEFAULT 'active',
                    media_filename TEXT,
                    hls_url TEXT,
                    media_url TEXT,
                    views INTEGER DEFAULT 0,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ended_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id TEXT
                );
                """
            )
            # Ensure user_id column exists if table was created in an older schema
            try:
                conn.execute("ALTER TABLE live_events ADD COLUMN user_id TEXT;")
            except Exception:
                pass
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_live_events_status ON live_events(status);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_live_events_author ON live_events(author);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_live_events_user ON live_events(user_id);"
            )


def query_reaction_summary(item_id: str, visitor_id: str) -> dict:
    """Query total likes, dislikes, and current visitor reaction.
    Caches shared reaction counts in Redis with 60s TTL to protect database.
    """
    cache_key = f"reaction:counts:{item_id}"
    counts = CACHE.get_json(cache_key)

    with get_db_connection() as conn:
        if counts is None:
            counts = dict(conn.execute(
                "SELECT reaction, COUNT(*) FROM video_reactions WHERE item_id = ? GROUP BY reaction",
                (item_id,),
            ).fetchall())
            CACHE.set_json(cache_key, counts, ttl=60)

        current = conn.execute(
            "SELECT reaction FROM video_reactions WHERE item_id = ? AND visitor_id = ?",
            (item_id, visitor_id),
        ).fetchone()

    return {
        "video_id": item_id,
        "likes": counts.get("like", 0),
        "dislikes": counts.get("dislike", 0),
        "reaction": current[0] if current else None,
    }


def mutate_video_reaction(item_id: str, visitor_id: str, reaction: str | None) -> None:
    """Insert, update, or remove a visitor reaction and invalidate reaction cache."""
    with get_db_connection() as conn:
        with conn:
            if reaction is None:
                conn.execute(
                    "DELETE FROM video_reactions WHERE item_id = ? AND visitor_id = ?",
                    (item_id, visitor_id),
                )
            else:
                conn.execute(
                    "INSERT INTO video_reactions(item_id, visitor_id, reaction) VALUES (?, ?, ?) "
                    "ON CONFLICT(item_id, visitor_id) DO UPDATE SET reaction = excluded.reaction",
                    (item_id, visitor_id, reaction),
                )

    # Invalidate cached reaction count for this video
    CACHE.delete(f"reaction:counts:{item_id}")


def query_liked_items(visitor_id: str) -> list[str]:
    """Query item_ids liked by a visitor using indexed scan."""
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT item_id FROM video_reactions WHERE visitor_id = ? AND reaction = 'like' ORDER BY rowid DESC",
            (visitor_id,)
        ).fetchall()
    return [row[0] for row in rows]


def save_live_event_record(event: dict) -> None:
    """Save or update live event streaming record in database."""
    user_id = str(event.get("user_id") or "")
    with get_db_connection() as conn:
        with conn:
            conn.execute(
                """
                INSERT INTO live_events (
                    id, title, author, description, category, status,
                    media_filename, hls_url, media_url, views, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    author = excluded.author,
                    description = excluded.description,
                    category = excluded.category,
                    status = excluded.status,
                    media_filename = COALESCE(excluded.media_filename, live_events.media_filename),
                    hls_url = excluded.hls_url,
                    media_url = excluded.media_url,
                    views = excluded.views,
                    user_id = COALESCE(NULLIF(excluded.user_id, ''), live_events.user_id)
                """,
                (
                    str(event.get("id")),
                    str(event.get("title") or "Live Broadcast"),
                    str(event.get("author") or "Watchbloom Creator"),
                    str(event.get("description") or ""),
                    str(event.get("category") or "entertainment"),
                    str(event.get("status") or "active"),
                    str(event.get("media_filename") or event.get("media") or ""),
                    str(event.get("hls_url") or f"/api/v1/hls/live/{event.get('id')}/live.m3u8"),
                    str(event.get("media_url") or f"/api/media/{event.get('id')}"),
                    int(event.get("views") or 0),
                    user_id,
                ),
            )
    CACHE.delete(f"live:event:{event.get('id')}")
    CACHE.delete("live:events:active")


def list_user_live_events(user_id: str, author: str | None = None) -> list[dict]:
    """Retrieve all live broadcast events (active or replay) created by a specific creator."""
    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row
        if author:
            rows = conn.execute(
                """
                SELECT id, title, author, description, category, status,
                       media_filename, hls_url, media_url, views, started_at, ended_at, user_id
                FROM live_events
                WHERE (user_id IS NOT NULL AND user_id != '' AND user_id = ?)
                   OR author = ?
                   OR lower(author) = lower(?)
                ORDER BY created_at DESC
                """,
                (user_id, author, author),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT id, title, author, description, category, status,
                       media_filename, hls_url, media_url, views, started_at, ended_at, user_id
                FROM live_events
                WHERE user_id = ?
                ORDER BY created_at DESC
                """,
                (user_id,),
            ).fetchall()
    return [dict(r) for r in rows]


def delete_live_event_record(event_id: str) -> None:
    """Delete a live broadcast event from the database."""
    with get_db_connection() as conn:
        with conn:
            conn.execute("DELETE FROM live_events WHERE id = ?", (event_id,))
    CACHE.delete(f"live:event:{event_id}")
    CACHE.delete("live:events:active")


def get_live_event_record(event_id: str) -> dict | None:
    """Retrieve live event streaming record by ID."""
    cached = CACHE.get_json(f"live:event:{event_id}")
    if cached is not None:
        return cached

    with get_db_connection() as conn:
        row = conn.execute(
            """
            SELECT id, title, author, description, category, status,
                   media_filename, hls_url, media_url, views, started_at, ended_at
            FROM live_events WHERE id = ?
            """,
            (event_id,),
        ).fetchone()

    if not row:
        return None

    data = {
        "id": row[0],
        "title": row[1],
        "author": row[2],
        "description": row[3],
        "category": row[4],
        "status": row[5],
        "media_filename": row[6],
        "hls_url": row[7],
        "media_url": row[8],
        "views": row[9],
        "started_at": str(row[10]) if row[10] else None,
        "ended_at": str(row[11]) if row[11] else None,
    }
    CACHE.set_json(f"live:event:{event_id}", data, ttl=30)
    return data


def list_active_live_events() -> list[dict]:
    """Retrieve all currently active live streams."""
    cached = CACHE.get_json("live:events:active")
    if cached is not None and isinstance(cached, list):
        return cached

    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, author, description, category, status,
                   media_filename, hls_url, media_url, views, started_at
            FROM live_events WHERE status = 'active'
            ORDER BY started_at DESC
            """
        ).fetchall()

    events = [
        {
            "id": r[0],
            "title": r[1],
            "author": r[2],
            "description": r[3],
            "category": r[4],
            "status": r[5],
            "media_filename": r[6],
            "hls_url": r[7],
            "media_url": r[8],
            "views": r[9],
            "started_at": str(r[10]) if r[10] else None,
            "isLive": True,
        }
        for r in rows
    ]
    CACHE.set_json("live:events:active", events, ttl=10)
    return events


def update_live_event_status(event_id: str, status: str, media_filename: str | None = None) -> None:
    """Update live event status ('active', 'ended') and final media path."""
    with get_db_connection() as conn:
        with conn:
            if status == "ended":
                conn.execute(
                    """
                    UPDATE live_events
                    SET status = ?,
                        media_filename = COALESCE(?, media_filename),
                        ended_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (status, media_filename, event_id),
                )
            else:
                conn.execute(
                    """
                    UPDATE live_events
                    SET status = ?,
                        media_filename = COALESCE(?, media_filename)
                    WHERE id = ?
                    """,
                    (status, media_filename, event_id),
                )
    CACHE.delete(f"live:event:{event_id}")
    CACHE.delete("live:events:active")
