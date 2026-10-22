"""Migration utility to transfer SQLite data (Authentication & Engagement) and catalog.json into PostgreSQL Primary.
Supports direct execution against PostgreSQL or generating a standalone .sql dump for PgBouncer / RDS / Supabase.

Usage:
  python scripts/migrate_sqlite_to_pg.py                     # Executes against DATABASE_URL from .env
  python scripts/migrate_sqlite_to_pg.py --dump-sql          # Generates watchbloom_migration.sql without requiring active DB
  python scripts/migrate_sqlite_to_pg.py --target postgresql://user:pass@localhost:5432/watchbloom
"""

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import sqlite3
import sys

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from config import CATALOG_PATH, DATABASE_URL, REACTIONS_DB

AUTH_DB = BASE_DIR / "watchbloom_auth.sqlite3"


PG_SCHEMA_SQL = """
-- ==============================================================================
-- Watchbloom PostgreSQL Primary Schema & Indexes
-- Optimized for PgBouncer Connection Pooling (Transaction Mode)
-- ==============================================================================

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    mobile VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'viewer' NOT NULL,
    handle VARCHAR(60),
    bio VARCHAR(255) DEFAULT '',
    photo TEXT DEFAULT '',
    banner TEXT DEFAULT '',
    is_email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_mobile_verified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);

-- 2. User Personalized Collections (Strict Isolation)
CREATE TABLE IF NOT EXISTS user_saved_videos (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_saved_item UNIQUE (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_user_id ON user_saved_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_item_id ON user_saved_videos(item_id);

CREATE TABLE IF NOT EXISTS user_watch_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(64) NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_history_item UNIQUE (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_history_user_id ON user_watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_item_id ON user_watch_history(item_id);

CREATE TABLE IF NOT EXISTS user_liked_videos (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_liked_item UNIQUE (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_liked_user_id ON user_liked_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_item_id ON user_liked_videos(item_id);

-- 3. OTP Verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id VARCHAR(64) PRIMARY KEY,
    target VARCHAR(120) NOT NULL,
    code VARCHAR(16) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    verified BOOLEAN DEFAULT FALSE NOT NULL,
    attempts INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_otp_target ON otp_verifications(target);
CREATE INDEX IF NOT EXISTS idx_otp_target_purpose ON otp_verifications(target, purpose);

-- 4. Engagement Reactions
CREATE TABLE IF NOT EXISTS video_reactions (
    item_id VARCHAR(64) NOT NULL,
    visitor_id VARCHAR(64) NOT NULL,
    reaction VARCHAR(16) NOT NULL CHECK (reaction IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_pg_reactions_visitor ON video_reactions(visitor_id, reaction);
CREATE INDEX IF NOT EXISTS idx_pg_reactions_item ON video_reactions(item_id, reaction);

-- 5. Videos Catalog
CREATE TABLE IF NOT EXISTS videos (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    format VARCHAR(30) DEFAULT 'standard',
    views BIGINT DEFAULT 0,
    duration INT DEFAULT 0,
    mins INT DEFAULT 1,
    media_filename VARCHAR(255),
    hls_master_url VARCHAR(500),
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_date ON videos(date DESC);

-- 6. User Settings & Support
CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_visibility VARCHAR(32) DEFAULT 'public',
    show_subscriptions BOOLEAN DEFAULT TRUE,
    show_liked_videos BOOLEAN DEFAULT FALSE,
    search_indexing BOOLEAN DEFAULT TRUE,
    default_quality VARCHAR(32) DEFAULT 'auto',
    autoplay BOOLEAN DEFAULT TRUE,
    ambient_mode BOOLEAN DEFAULT TRUE,
    default_playback_rate REAL DEFAULT 1.0,
    captions_enabled BOOLEAN DEFAULT FALSE,
    captions_language VARCHAR(32) DEFAULT 'en',
    email_notifications BOOLEAN DEFAULT TRUE,
    subscriber_alerts BOOLEAN DEFAULT TRUE,
    recommendation_alerts BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS abuse_reports (
    report_id VARCHAR(64) PRIMARY KEY,
    reporter_id VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    reason_code VARCHAR(32) NOT NULL,
    description TEXT,
    target_metadata TEXT,
    status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS mail_inquiries (
    mail_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'queued',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_notifications (
    notification_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(64) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    metadata_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pg_notifs_user_read ON system_notifications(user_id, is_read, created_at DESC);
"""


def dump_sql_file(out_path: Path) -> None:
    """Generate a clean PostgreSQL SQL migration script from SQLite and JSON."""
    print(f"Generating full PostgreSQL migration dump to: {out_path}")
    lines = [PG_SCHEMA_SQL, "\n-- ── DATA MIGRATION INSERTS ──\n"]

    # 1. Users
    if AUTH_DB.is_file():
        conn = sqlite3.connect(AUTH_DB)
        cur = conn.cursor()
        cur.execute("SELECT id, username, email, mobile, password_hash, role, handle, bio, photo, banner, is_email_verified, is_mobile_verified, created_at, updated_at FROM users")
        users = cur.fetchall()
        for u in users:
            vals = [
                repr(u[0]), repr(u[1]), repr(u[2]), repr(u[3]) if u[3] else "NULL",
                repr(u[4]), repr(u[5]), repr(u[6]) if u[6] else "NULL",
                repr(u[7] or ""), repr(u[8] or ""), repr(u[9] or ""),
                "TRUE" if u[10] else "FALSE", "TRUE" if u[11] else "FALSE",
                repr(u[12]) if u[12] else "CURRENT_TIMESTAMP",
                repr(u[13]) if u[13] else "CURRENT_TIMESTAMP",
            ]
            lines.append(f"INSERT INTO users (id, username, email, mobile, password_hash, role, handle, bio, photo, banner, is_email_verified, is_mobile_verified, created_at, updated_at) VALUES ({', '.join(vals)}) ON CONFLICT (id) DO NOTHING;")
        print(f"  Extracted {len(users)} users from {AUTH_DB.name}")

        # 2. user_saved_videos
        cur.execute("SELECT user_id, item_id, created_at FROM user_saved_videos")
        saved = cur.fetchall()
        for s in saved:
            lines.append(f"INSERT INTO user_saved_videos (user_id, item_id, created_at) VALUES ({repr(s[0])}, {repr(s[1])}, {repr(s[2])}) ON CONFLICT DO NOTHING;")
        print(f"  Extracted {len(saved)} saved video bookmarks")

        # 3. user_watch_history
        cur.execute("SELECT user_id, item_id, viewed_at FROM user_watch_history")
        hist = cur.fetchall()
        for h in hist:
            lines.append(f"INSERT INTO user_watch_history (user_id, item_id, viewed_at) VALUES ({repr(h[0])}, {repr(h[1])}, {repr(h[2])}) ON CONFLICT DO NOTHING;")
        print(f"  Extracted {len(hist)} watch history entries")

        # 4. user_liked_videos
        cur.execute("SELECT user_id, item_id, created_at FROM user_liked_videos")
        liked = cur.fetchall()
        for l in liked:
            lines.append(f"INSERT INTO user_liked_videos (user_id, item_id, created_at) VALUES ({repr(l[0])}, {repr(l[1])}, {repr(l[2])}) ON CONFLICT DO NOTHING;")
        print(f"  Extracted {len(liked)} user likes")
        conn.close()

    # 5. video_reactions
    if REACTIONS_DB.is_file():
        conn = sqlite3.connect(REACTIONS_DB)
        cur = conn.cursor()
        cur.execute("SELECT item_id, visitor_id, reaction FROM video_reactions")
        reactions = cur.fetchall()
        for r in reactions:
            lines.append(f"INSERT INTO video_reactions (item_id, visitor_id, reaction) VALUES ({repr(r[0])}, {repr(r[1])}, {repr(r[2])}) ON CONFLICT (item_id, visitor_id) DO UPDATE SET reaction = EXCLUDED.reaction;")
        print(f"  Extracted {len(reactions)} visitor reactions from {REACTIONS_DB.name}")
        conn.close()

    # 6. catalog.json
    if CATALOG_PATH.is_file():
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            items = json.load(f)
        video_count = 0
        for it in items:
            if it.get("type") == "video":
                item_id = it.get("id")
                hls_url = f"/api/v1/hls/live/{item_id}/live.m3u8" if (it.get("format") == "live" or it.get("isLiveVod")) else f"/api/v1/hls/{item_id}/master.m3u8"
                vals = [
                    repr(item_id), repr(it.get("title", "")), repr(it.get("author", "Watchbloom")),
                    repr(it.get("description", "")), repr(it.get("category", "entertainment")),
                    repr(it.get("format", "standard")), str(it.get("views", 0)),
                    str(it.get("duration", 0)), str(it.get("mins", 1)),
                    repr(it.get("media", "")), repr(hls_url),
                    repr(it.get("date")) if it.get("date") else "CURRENT_DATE",
                ]
                lines.append(f"INSERT INTO videos (id, title, author, description, category, format, views, duration, mins, media_filename, hls_master_url, date) VALUES ({', '.join(vals)}) ON CONFLICT (id) DO NOTHING;")
                video_count += 1
        print(f"  Extracted {video_count} catalog videos from {CATALOG_PATH.name}")

    with open(out_path, "w", encoding="utf-8") as out:
        out.write("\n".join(lines))
    print(f"Migration SQL successfully written to: {out_path} ({out_path.stat().st_size:,} bytes)")


def migrate_to_pg(target_url: str) -> None:
    """Connect to live PostgreSQL instance and execute schema & data transfer."""
    try:
        import psycopg2
        from psycopg2.extras import execute_batch
    except ImportError:
        print("Error: psycopg2 is required. Run: pip install psycopg2-binary")
        sys.exit(1)

    print(f"Connecting to PostgreSQL: {target_url} ...")
    conn = psycopg2.connect(target_url)
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            print("1. Initializing schema and indexes...")
            cur.execute(PG_SCHEMA_SQL)
            conn.commit()

            # Migrate Users from SQLite
            if AUTH_DB.is_file():
                print(f"2. Migrating auth accounts from {AUTH_DB}...")
                s_conn = sqlite3.connect(AUTH_DB)
                s_cur = s_conn.cursor()
                s_cur.execute("SELECT id, username, email, mobile, password_hash, role, handle, bio, photo, banner, is_email_verified, is_mobile_verified, created_at, updated_at FROM users")
                users = s_cur.fetchall()
                if users:
                    execute_batch(
                        cur,
                        """
                        INSERT INTO users (id, username, email, mobile, password_hash, role, handle, bio, photo, banner, is_email_verified, is_mobile_verified, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            username = EXCLUDED.username,
                            email = EXCLUDED.email,
                            mobile = EXCLUDED.mobile,
                            password_hash = EXCLUDED.password_hash;
                        """,
                        users,
                    )
                    conn.commit()
                    print(f"   Successfully migrated {len(users)} users.")
                s_conn.close()

            # Migrate Reactions
            if REACTIONS_DB.is_file():
                print(f"3. Migrating reactions from {REACTIONS_DB}...")
                s_conn = sqlite3.connect(REACTIONS_DB)
                s_cur = s_conn.cursor()
                s_cur.execute("SELECT item_id, visitor_id, reaction FROM video_reactions")
                reactions = s_cur.fetchall()
                if reactions:
                    execute_batch(
                        cur,
                        """
                        INSERT INTO video_reactions (item_id, visitor_id, reaction)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (item_id, visitor_id) DO UPDATE SET reaction = EXCLUDED.reaction;
                        """,
                        reactions,
                    )
                    conn.commit()
                    print(f"   Successfully migrated {len(reactions)} reactions.")
                s_conn.close()

            # Migrate Catalog
            if CATALOG_PATH.is_file():
                print(f"4. Migrating catalog items from {CATALOG_PATH}...")
                with open(CATALOG_PATH, "r", encoding="utf-8") as f:
                    items = json.load(f)
                video_data = []
                for it in items:
                    if it.get("type") == "video":
                        item_id = it.get("id")
                        hls_url = f"/api/v1/hls/live/{item_id}/live.m3u8" if (it.get("format") == "live" or it.get("isLiveVod")) else f"/api/v1/hls/{item_id}/master.m3u8"
                        video_data.append((
                            item_id, it.get("title", ""), it.get("author", "Watchbloom"),
                            it.get("description", ""), it.get("category", "entertainment"),
                            it.get("format", "standard"), it.get("views", 0),
                            it.get("duration", 0), it.get("mins", 1),
                            it.get("media", ""), hls_url, it.get("date"),
                        ))
                if video_data:
                    execute_batch(
                        cur,
                        """
                        INSERT INTO videos (id, title, author, description, category, format, views, duration, mins, media_filename, hls_master_url, date)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            title = EXCLUDED.title,
                            views = EXCLUDED.views,
                            description = EXCLUDED.description;
                        """,
                        video_data,
                    )
                    conn.commit()
                    print(f"   Successfully migrated {len(video_data)} catalog videos.")

        print("\nPostgreSQL Migration Succeeded 100%!")
    except Exception as exc:
        conn.rollback()
        print(f"\nMigration failed: {exc}")
        raise
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Watchbloom SQLite to PostgreSQL & PgBouncer Migration Utility")
    parser.add_argument("--target", type=str, default="", help="Target PostgreSQL connection string (defaults to DATABASE_URL)")
    parser.add_argument("--dump-sql", action="store_true", help="Dump migration as standalone SQL file (does not require active Postgres)")
    parser.add_argument("--output", type=str, default="watchbloom_pg_migration.sql", help="Output path for SQL dump")
    args = parser.parse_args()

    if args.dump_sql:
        dump_sql_file(BASE_DIR / args.output)
        return

    target_url = args.target or DATABASE_URL
    if not target_url:
        print("DATABASE_URL is not set. Use --dump-sql to generate SQL file or provide --target.")
        sys.exit(1)

    try:
        migrate_to_pg(target_url)
    except Exception:
        print("\nDirect connection to PostgreSQL failed.")
        print("Generating fallback SQL file 'watchbloom_pg_migration.sql' so no data is delayed...")
        dump_sql_file(BASE_DIR / args.output)


if __name__ == "__main__":
    main()
