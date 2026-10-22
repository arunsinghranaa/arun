"""Centralized configuration for Watchbloom Video Streaming Platform.
Supports environment overrides for production, development, and container deployments.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
STATIC_DIR = BASE_DIR / "static"
VIDEO_DIR = STATIC_DIR / "videos"
HLS_DIR = VIDEO_DIR / "hls"
SUBTITLE_DIR = STATIC_DIR / "subtitles"
REACTIONS_DB = BASE_DIR / "watchbloom-engagement.sqlite3"
CATALOG_PATH = BASE_DIR / "catalog.json"

# Security & Authentication
SECRET_KEY = os.environ.get("SECRET_KEY", "watchbloom-super-secret-key-change-in-production")
JWT_SECRET = os.environ.get("JWT_SECRET", SECRET_KEY)
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_SECONDS = int(os.environ.get("JWT_EXPIRATION_SECONDS", "86400"))  # 24 hours

# CORS settings
CORS_ORIGINS_RAW = os.environ.get("CORS_ALLOWED_ORIGINS", "http://127.0.0.1:5000,http://localhost:5000,*")
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]

# Upload limits
MAX_CONTENT_LENGTH = 250 * 1024 * 1024  # 250 MB
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm"}

# Redis Caching & Queue Broker
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CACHE_DEFAULT_TTL = int(os.environ.get("CACHE_DEFAULT_TTL", "300"))  # 5 minutes
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", os.environ.get("REDIS_URL", "redis://localhost:6379/1"))
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", os.environ.get("REDIS_URL", "redis://localhost:6379/2"))

# Cloudflare R2 Object Storage & Cloudflare CDN
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "watchbloom-media")
R2_ENDPOINT_URL = os.environ.get(
    "R2_ENDPOINT_URL",
    f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com" if R2_ACCOUNT_ID else ""
)
CDN_BASE_URL = os.environ.get("CDN_BASE_URL", "").rstrip("/")  # e.g. https://media.watchbloom.com

# PostgreSQL Primary + Read Replica Cluster with PgBouncer
DATABASE_URL = os.environ.get("DATABASE_URL", "")
DATABASE_READ_URLS_RAW = os.environ.get("DATABASE_READ_URLS", "")
DATABASE_READ_URLS = [u.strip() for u in DATABASE_READ_URLS_RAW.split(",") if u.strip()]
USE_POSTGRES = bool(DATABASE_URL)
PG_POOL_MINCONN = int(os.environ.get("PG_POOL_MINCONN", "5"))
PG_POOL_MAXCONN = int(os.environ.get("PG_POOL_MAXCONN", "50"))
PG_POOL_TIMEOUT = int(os.environ.get("PG_POOL_TIMEOUT", "30"))
PG_CONNECT_TIMEOUT = int(os.environ.get("PG_CONNECT_TIMEOUT", "5"))

# SQLAlchemy & Flask-Login Database Configuration
_db_url_env = os.environ.get("SQLALCHEMY_DATABASE_URI") or ""
if not _db_url_env:
    # Use PostgreSQL only when psycopg/psycopg2 is installed and explicitly requested
    if DATABASE_URL and ("sqlite" in DATABASE_URL or os.environ.get("USE_POSTGRES", "0") in ("1", "true")):
        _db_url_env = DATABASE_URL
    else:
        _db_url_env = f"sqlite:///{BASE_DIR / 'watchbloom_auth.sqlite3'}"
SQLALCHEMY_DATABASE_URI = _db_url_env
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Media Access Control
REQUIRE_SIGNED_MEDIA = os.environ.get("REQUIRE_SIGNED_MEDIA", "0").lower() in ("1", "true", "yes")

# Live Monitoring (Sentry)
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
SENTRY_ENVIRONMENT = os.environ.get("SENTRY_ENVIRONMENT", os.environ.get("FLASK_ENV", "production"))
SENTRY_TRACES_SAMPLE_RATE = float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.2"))

# Compression & Serialization
ENABLE_BROTLI = os.environ.get("ENABLE_BROTLI", "1").lower() in ("1", "true", "yes")
ENABLE_MSGPACK = os.environ.get("ENABLE_MSGPACK", "1").lower() in ("1", "true", "yes")
COMPRESSION_MIN_BYTES = int(os.environ.get("COMPRESSION_MIN_BYTES", "512"))

# Catalog Query Constants
TYPES = {"all", "video", "playlist", "course"}
FORMATS = {"all", "short", "reel", "video", "standard", "long"}
DURATIONS = {"all", "under3", "3to20", "over20"}
UPLOAD_WINDOWS = {"any", "today", "week", "month", "year"}
SORTS = {"relevance", "popularity", "newest"}
CATEGORIES = {
    "all", "technology", "gaming", "music", "news", "sports", "cooking",
    "travel", "entertainment", "lifestyle", "creative", "learning",
}

# ── SMTP & Flask-Mail Settings ──
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "1").lower() in ("1", "true", "yes")
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "watchbloomsupport@gmail.com")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")          # Gmail App Password (16-char)
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "watchbloomsupport@gmail.com")
SUPPORT_FROM_EMAIL = os.environ.get("SUPPORT_FROM_EMAIL", SMTP_USERNAME or "watchbloomsupport@gmail.com")

# Flask-Mail configuration
MAIL_SERVER = os.environ.get("MAIL_SERVER", SMTP_HOST)
MAIL_PORT = int(os.environ.get("MAIL_PORT", str(SMTP_PORT)))
MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "1").lower() in ("1", "true", "yes")
MAIL_USE_SSL = os.environ.get("MAIL_USE_SSL", "0").lower() in ("1", "true", "yes")
MAIL_USERNAME = os.environ.get("MAIL_USERNAME", SMTP_USERNAME)
MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", SMTP_PASSWORD)
MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER") or (
    MAIL_USERNAME if MAIL_USERNAME else "noreply@watchbloom.com"
)

# ── Twilio SMS & Fast2SMS Service Configuration ──
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")
FAST2SMS_API_KEY = os.environ.get("FAST2SMS_API_KEY", "")

# ── OTP Verification & Throttling ──
OTP_EXPIRATION_SECONDS = int(os.environ.get("OTP_EXPIRATION_SECONDS", "600"))  # 10 minutes
OTP_MAX_ATTEMPTS = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))
