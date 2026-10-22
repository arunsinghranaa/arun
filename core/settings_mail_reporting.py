"""Settings, Support Mail, and Asynchronous Abuse/Copyright Reporting Module.
Handles persistence, Redis caching, indexing, and background task orchestration.
"""

from datetime import datetime, timezone
import json
import logging
import sqlite3
import threading
import time
from typing import Any, Dict, List, Optional, Tuple
import uuid

from config import REACTIONS_DB
from core.cache import CACHE
from core.db import get_db_connection

logger = logging.getLogger("watchbloom.settings")

# Default user settings template
DEFAULT_USER_SETTINGS: Dict[str, Any] = {
    "profile_visibility": "public",
    "show_subscriptions": True,
    "show_liked_videos": False,
    "search_indexing": True,
    "default_quality": "auto",
    "autoplay": True,
    "ambient_mode": True,
    "default_playback_rate": 1.0,
    "captions_enabled": False,
    "captions_language": "en",
    "email_notifications": True,
    "subscriber_alerts": True,
    "recommendation_alerts": True,
    "security_alerts": True,
}


def init_settings_tables(db_path=REACTIONS_DB) -> None:
    """Initialize database tables for user settings, abuse reports, support mail, and notifications."""
    with get_db_connection(db_path) as conn:
        with conn:
            # 1. User Settings Table
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

            # 2. Abuse & Copyright Reports Table
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

            # 3. Mail & Contact Inquiries Table
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

            # 4. System Notification Logs Table
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


# Auto-initialize on import
try:
    init_settings_tables()
except Exception as e:
    logger.debug(f"Initial schema migration notice: {e}")


# ── 1. USER SETTINGS REPOSITORY (WITH REDIS CACHING) ──

def _enrich_settings(s: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure both flat database fields and structured sub-dictionaries exist."""
    privacy = {
        "profile_visibility": s.get("profile_visibility", "public"),
        "show_subscriptions": bool(s.get("show_subscriptions", True)),
        "show_liked_videos": bool(s.get("show_liked_videos", False)),
        "search_indexing": bool(s.get("search_indexing", True)),
    }
    playback = {
        "default_quality": s.get("default_quality", "auto"),
        "autoplay": bool(s.get("autoplay", True)),
        "autoplay_next": bool(s.get("autoplay", True)),
        "ambient_mode": bool(s.get("ambient_mode", True)),
        "default_playback_rate": float(s.get("default_playback_rate", 1.0)),
        "captions_enabled": bool(s.get("captions_enabled", False)),
        "captions_language": s.get("captions_language", "en"),
    }
    notifications = {
        "email_notifications": bool(s.get("email_notifications", True)),
        "new_subscriber_alerts": bool(s.get("subscriber_alerts", True)),
        "subscriber_alerts": bool(s.get("subscriber_alerts", True)),
        "recommendation_digests": bool(s.get("recommendation_alerts", True)),
        "recommendation_alerts": bool(s.get("recommendation_alerts", True)),
        "security_alerts": bool(s.get("security_alerts", True)),
    }
    return {
        **s,
        "privacy": privacy,
        "playback": playback,
        "notifications": notifications,
    }


def get_or_create_user_settings(user_id: str) -> Dict[str, Any]:
    """Retrieve user settings, checking Redis cache first with automatic fallback to DB."""
    if not user_id:
        user_id = "anonymous"

    cache_key = f"user:settings:{user_id}"
    cached = CACHE.get_json(cache_key)
    if cached is not None and isinstance(cached, dict):
        return _enrich_settings(cached)

    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM user_settings WHERE user_id = ?", (user_id,)
        ).fetchone()

        if row:
            settings = {
                "user_id": row["user_id"],
                "profile_visibility": row["profile_visibility"],
                "show_subscriptions": bool(row["show_subscriptions"]),
                "show_liked_videos": bool(row["show_liked_videos"]),
                "search_indexing": bool(row["search_indexing"]),
                "default_quality": row["default_quality"],
                "autoplay": bool(row["autoplay"]),
                "ambient_mode": bool(row["ambient_mode"]),
                "default_playback_rate": float(row["default_playback_rate"] or 1.0),
                "captions_enabled": bool(row["captions_enabled"]),
                "captions_language": row["captions_language"] or "en",
                "email_notifications": bool(row["email_notifications"]),
                "subscriber_alerts": bool(row["subscriber_alerts"]),
                "recommendation_alerts": bool(row["recommendation_alerts"]),
                "security_alerts": bool(row["security_alerts"]),
                "updated_at": str(row["updated_at"] or ""),
            }
        else:
            # Create default record
            settings = {"user_id": user_id, **DEFAULT_USER_SETTINGS, "updated_at": datetime.now(timezone.utc).isoformat()}
            with conn:
                conn.execute(
                    """
                    INSERT INTO user_settings (
                        user_id, profile_visibility, show_subscriptions, show_liked_videos,
                        search_indexing, default_quality, autoplay, ambient_mode,
                        default_playback_rate, captions_enabled, captions_language,
                        email_notifications, subscriber_alerts, recommendation_alerts,
                        security_alerts, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id) DO NOTHING
                    """,
                    (
                        user_id,
                        settings["profile_visibility"],
                        int(settings["show_subscriptions"]),
                        int(settings["show_liked_videos"]),
                        int(settings["search_indexing"]),
                        settings["default_quality"],
                        int(settings["autoplay"]),
                        int(settings["ambient_mode"]),
                        settings["default_playback_rate"],
                        int(settings["captions_enabled"]),
                        settings["captions_language"],
                        int(settings["email_notifications"]),
                        int(settings["subscriber_alerts"]),
                        int(settings["recommendation_alerts"]),
                        int(settings["security_alerts"]),
                    ),
                )

    CACHE.set_json(cache_key, settings, ttl=600)
    return _enrich_settings(settings)


def update_user_settings(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Atomically update user settings in database and update Redis cache."""
    current = get_or_create_user_settings(user_id)
    flat_updates = {}
    for k, v in updates.items():
        if isinstance(v, dict):
            flat_updates.update(v)
        else:
            flat_updates[k] = v
    if "autoplay_next" in flat_updates:
        flat_updates["autoplay"] = flat_updates["autoplay_next"]
    if "new_subscriber_alerts" in flat_updates:
        flat_updates["subscriber_alerts"] = flat_updates["new_subscriber_alerts"]
    if "recommendation_digests" in flat_updates:
        flat_updates["recommendation_alerts"] = flat_updates["recommendation_digests"]
    merged = _enrich_settings({**current, **flat_updates, "user_id": user_id})

    with get_db_connection() as conn:
        with conn:
            conn.execute(
                """
                INSERT INTO user_settings (
                    user_id, profile_visibility, show_subscriptions, show_liked_videos,
                    search_indexing, default_quality, autoplay, ambient_mode,
                    default_playback_rate, captions_enabled, captions_language,
                    email_notifications, subscriber_alerts, recommendation_alerts,
                    security_alerts, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    profile_visibility = excluded.profile_visibility,
                    show_subscriptions = excluded.show_subscriptions,
                    show_liked_videos = excluded.show_liked_videos,
                    search_indexing = excluded.search_indexing,
                    default_quality = excluded.default_quality,
                    autoplay = excluded.autoplay,
                    ambient_mode = excluded.ambient_mode,
                    default_playback_rate = excluded.default_playback_rate,
                    captions_enabled = excluded.captions_enabled,
                    captions_language = excluded.captions_language,
                    email_notifications = excluded.email_notifications,
                    subscriber_alerts = excluded.subscriber_alerts,
                    recommendation_alerts = excluded.recommendation_alerts,
                    security_alerts = excluded.security_alerts,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    user_id,
                    str(merged.get("profile_visibility", "public")),
                    int(bool(merged.get("show_subscriptions", True))),
                    int(bool(merged.get("show_liked_videos", False))),
                    int(bool(merged.get("search_indexing", True))),
                    str(merged.get("default_quality", "auto")),
                    int(bool(merged.get("autoplay", True))),
                    int(bool(merged.get("ambient_mode", True))),
                    float(merged.get("default_playback_rate", 1.0)),
                    int(bool(merged.get("captions_enabled", False))),
                    str(merged.get("captions_language", "en")),
                    int(bool(merged.get("email_notifications", True))),
                    int(bool(merged.get("subscriber_alerts", True))),
                    int(bool(merged.get("recommendation_alerts", True))),
                    int(bool(merged.get("security_alerts", True))),
                ),
            )

    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    cache_key = f"user:settings:{user_id}"
    CACHE.set_json(cache_key, merged, ttl=600)
    return merged


# ── 2. ASYNC ABUSE & COPYRIGHT REPORTING ──

def create_abuse_report(
    reporter_id: str,
    target_type: str,
    target_id: str,
    reason_code: str,
    description: str = "",
    target_metadata: str = "",
) -> Dict[str, Any]:
    """Persist a new abuse/copyright report in pending state."""
    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    clean_target_type = str(target_type).strip().lower() or "video"
    clean_reason = str(reason_code).strip().lower() or "other"

    with get_db_connection() as conn:
        with conn:
            conn.execute(
                """
                INSERT INTO abuse_reports (
                    report_id, reporter_id, target_type, target_id,
                    reason_code, description, target_metadata, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
                """,
                (
                    report_id,
                    reporter_id or "anonymous",
                    clean_target_type,
                    str(target_id).strip(),
                    clean_reason,
                    str(description).strip()[:2000],
                    str(target_metadata).strip()[:4000],
                ),
            )

    return {
        "report_id": report_id,
        "reporter_id": reporter_id,
        "target_type": clean_target_type,
        "target_id": target_id,
        "reason_code": clean_reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def get_abuse_report(report_id: str) -> Optional[Dict[str, Any]]:
    """Fetch report by report_id."""
    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM abuse_reports WHERE report_id = ?", (report_id,)
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["email"] = d.get("sender_email", "")
        return d


def update_abuse_report_status(report_id: str, status: str) -> bool:
    """Update report review status."""
    with get_db_connection() as conn:
        with conn:
            res = conn.execute(
                "UPDATE abuse_reports SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE report_id = ?",
                (status, report_id),
            )
            return res.rowcount > 0


# ── 3. SECURE SUPPORT MAIL & CONTACT INQUIRIES ──

def create_support_mail(
    user_id: str,
    sender_email: str,
    subject: str,
    category: str,
    message: str,
) -> Dict[str, Any]:
    """Persist a new support inquiry ticket."""
    mail_id = f"mail_{uuid.uuid4().hex[:12]}"
    clean_category = str(category).strip().lower() or "support"

    with get_db_connection() as conn:
        with conn:
            conn.execute(
                """
                INSERT INTO mail_inquiries (
                    mail_id, user_id, sender_email, subject, category, message, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'queued', CURRENT_TIMESTAMP)
                """,
                (
                    mail_id,
                    user_id or "guest",
                    str(sender_email).strip()[:255],
                    str(subject).strip()[:255],
                    clean_category,
                    str(message).strip()[:5000],
                ),
            )

    return {
        "mail_id": mail_id,
        "user_id": user_id,
        "sender_email": sender_email,
        "email": sender_email,
        "subject": subject,
        "category": clean_category,
        "status": "queued",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def get_support_mail(mail_id: str) -> Optional[Dict[str, Any]]:
    """Fetch support inquiry by ID."""
    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM mail_inquiries WHERE mail_id = ?", (mail_id,)
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d['email'] = d.get('sender_email', '')
        return d


def update_support_mail_status(mail_id: str, status: str) -> bool:
    """Update support ticket status."""
    with get_db_connection() as conn:
        with conn:
            res = conn.execute(
                "UPDATE mail_inquiries SET status = ? WHERE mail_id = ?",
                (status, mail_id),
            )
            return res.rowcount > 0


# ── 4. SYSTEM NOTIFICATIONS & LOGS ──

def create_system_notification(
    user_id: str,
    title: str,
    message: str,
    notif_type: str = "info",
    metadata_json: str = "",
    **kwargs,
) -> Dict[str, Any]:
    """Generate and store a system notification log."""
    notif_id = f"ntf_{uuid.uuid4().hex[:12]}"

    with get_db_connection() as conn:
        with conn:
            conn.execute(
                """
                INSERT INTO system_notifications (
                    notification_id, user_id, title, message, type, is_read, metadata_json, created_at
                ) VALUES (?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
                """,
                (
                    notif_id,
                    user_id,
                    str(title).strip()[:255],
                    str(message).strip()[:2000],
                    str(notif_type).strip()[:64],
                    str(metadata_json) if metadata_json else "{}",
                ),
            )

    # Invalidate unread cache
    CACHE.delete(f"user:unread_notifs:{user_id}")

    return {
        "id": notif_id,
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def get_user_notifications(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    unread_only: bool = False,
) -> Dict[str, Any]:
    """Fetch paginated notification logs for a user."""
    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row

        where_clause = "WHERE user_id = ?"
        params: List[Any] = [user_id]
        if unread_only:
            where_clause += " AND is_read = 0"

        # Count total
        count_row = conn.execute(
            f"SELECT COUNT(*) as cnt FROM system_notifications {where_clause}",
            tuple(params),
        ).fetchone()
        total = count_row["cnt"] if count_row else 0

        # Unread count
        unread_row = conn.execute(
            "SELECT COUNT(*) as cnt FROM system_notifications WHERE user_id = ? AND is_read = 0",
            (user_id,),
        ).fetchone()
        unread_count = unread_row["cnt"] if unread_row else 0

        # Query items
        query_sql = f"""
            SELECT * FROM system_notifications
            {where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """
        rows = conn.execute(query_sql, tuple(params + [limit, offset])).fetchall()

        items = [
            {
                "id": r["notification_id"],
                "user_id": r["user_id"],
                "title": r["title"],
                "message": r["message"],
                "type": r["type"],
                "is_read": bool(r["is_read"]),
                "metadata_json": r["metadata_json"] or "{}",
                "created_at": str(r["created_at"]),
            }
            for r in rows
        ]

    return {
        "notifications": items,
        "total": total,
        "unread_count": unread_count,
        "limit": limit,
        "offset": offset,
    }


def mark_notification_read(user_id: str, notification_id: str) -> bool:
    """Mark a notification as read."""
    with get_db_connection() as conn:
        with conn:
            if notification_id == "all":
                res = conn.execute(
                    "UPDATE system_notifications SET is_read = 1 WHERE user_id = ?",
                    (user_id,),
                )
            else:
                res = conn.execute(
                    "UPDATE system_notifications SET is_read = 1 WHERE user_id = ? AND notification_id = ?",
                    (user_id, notification_id),
                )
            success = res.rowcount > 0

    CACHE.delete(f"user:unread_notifs:{user_id}")
    return success
