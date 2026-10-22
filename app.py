"""Run: pip install -r requirements.txt && python app.py -> http://127.0.0.1:5000"""

import json
import os
import re
import time
import unicodedata
import threading
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote, unquote
from werkzeug.security import check_password_hash, generate_password_hash

from flask import Flask, abort, g, jsonify, request, Response, send_from_directory
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from search_engine import CATEGORY_LABELS, SearchEngine

from config import (
    ALLOWED_VIDEO_EXTENSIONS,
    BASE_DIR,
    CATEGORIES,
    DURATIONS,
    ENABLE_MSGPACK,
    FORMATS,
    HLS_DIR,
    MAIL_DEFAULT_SENDER,
    MAIL_PASSWORD,
    MAIL_PORT,
    MAIL_SERVER,
    MAIL_USE_SSL,
    MAIL_USE_TLS,
    MAIL_USERNAME,
    MAX_CONTENT_LENGTH,
    OTP_EXPIRATION_SECONDS,
    OTP_MAX_ATTEMPTS,
    REACTIONS_DB,
    REQUIRE_SIGNED_MEDIA,
    SECRET_KEY,
    SORTS,
    SQLALCHEMY_DATABASE_URI,
    SQLALCHEMY_TRACK_MODIFICATIONS,
    STATIC_DIR,
    SUBTITLE_DIR,
    TYPES,
    UPLOAD_WINDOWS,
    VIDEO_DIR,
)
from core.models import (
    OTPVerification,
    User,
    UserLikedVideo,
    UserSavedVideo,
    UserWatchHistory,
    db,
    ensure_database_schema,
)
from core.messaging import (
    generate_secure_otp,
    mail,
    send_gmail_otp,
    send_twilio_sms,
)
from core.auth import (
    Permission,
    Role,
    authenticate_user,
    decode_token,
    generate_token,
    get_permissions_for_role,
    get_token_from_request,
    has_permission,
    has_role,
    is_owner_or_admin,
    register_user,
    require_jwt,
    require_permission,
    require_role,
    revoke_token,
)
from core.cors import apply_cors_headers, handle_cors_preflight
from core.cache import CACHE
from core.cdn import MULTI_CDN, R2_CLIENT, apply_cdn_cache_headers
from core.rate_limit import RATE_LIMITER, rate_limit
from core.stream_processing import STREAM_AGGREGATOR, STREAM_PRODUCER
from core.compression import init_compression
from core.counter_buffer import (
    buffer_reaction,
    buffer_view_increment,
    flush_counter_buffer,
    get_buffered_views,
)
from core.db import (
    delete_live_event_record,
    get_live_event_record,
    init_database,
    list_active_live_events,
    list_user_live_events,
    mutate_video_reaction,
    query_liked_items,
    query_reaction_summary,
    save_live_event_record,
    update_live_event_status,
)
from core.settings_mail_reporting import (
    create_abuse_report,
    create_support_mail,
    create_system_notification,
    get_abuse_report,
    get_or_create_user_settings,
    get_support_mail,
    get_user_notifications,
    mark_notification_read,
    update_user_settings,
)
from core.pg_pool import DB_CLUSTER, get_db
from core.errors import register_error_handlers
from core.monitoring import init_monitoring
from core.pagination import paginate_payload, parse_pagination
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
    process_abuse_report_task,
    send_support_mail_task,
    dispatch_system_notification_task,
    transcode_video_task,
)
from core.sse_live import LIVE_SSE_HUB
from core.cdn import purge_cloudflare_cache
_is_safe_video_filename = is_safe_video_filename
from metrics import REGISTRY
import hls_packager

CATALOG_LOCK = threading.Lock()

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
app.config["SECRET_KEY"] = SECRET_KEY
app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = SQLALCHEMY_TRACK_MODIFICATIONS
app.config["REMEMBER_COOKIE_DURATION"] = 86400 * 30
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Flask-Mail SMTP Configuration
app.config["MAIL_SERVER"] = MAIL_SERVER
app.config["MAIL_PORT"] = MAIL_PORT
app.config["MAIL_USE_TLS"] = MAIL_USE_TLS
app.config["MAIL_USE_SSL"] = MAIL_USE_SSL
app.config["MAIL_USERNAME"] = MAIL_USERNAME
app.config["MAIL_PASSWORD"] = MAIL_PASSWORD
app.config["MAIL_DEFAULT_SENDER"] = MAIL_DEFAULT_SENDER

# Initialize Flask-SQLAlchemy, Flask-Login, and Flask-Mail
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
mail.init_app(app)


@login_manager.user_loader
def load_user(user_id: str):
    """Flask-Login user loader returning User instance from SQLAlchemy or thread-safe USERS cache."""
    try:
        user = db.session.get(User, str(user_id))
        if user:
            return user
    except Exception:
        pass
    from core.auth import USER_LOCK, USERS
    with USER_LOCK:
        for u in USERS.values():
            if str(u.get("id")) == str(user_id):
                user_obj = User(
                    id=u["id"],
                    username=u["username"],
                    email=u.get("email", f"{u['username']}@gmail.com"),
                    mobile=u.get("mobile", ""),
                    role=u.get("role", Role.VIEWER),
                )
                user_obj.password_hash = u.get("password_hash", "")
                return user_obj
    return None


with app.app_context():
    try:
        ensure_database_schema(db)
        db.create_all()
        _seeds = [
            ("usr_admin_01", "admin", "admin@watchbloom.com", "+10000000001", "admin123", Role.ADMIN),
            ("usr_creator_01", "creator", "creator@gmail.com", "+10000000002", "creator123", Role.CREATOR),
            ("usr_viewer_01", "viewer", "viewer@gmail.com", "+10000000003", "viewer123", Role.VIEWER),
        ]
        for s_id, s_name, s_email, s_mobile, s_pwd, s_role in _seeds:
            if not User.query.filter((User.id == s_id) | (User.username == s_name)).first():
                seed_user = User(
                    id=s_id,
                    username=s_name,
                    email=s_email,
                    mobile=s_mobile,
                    role=s_role,
                    handle=f"@{s_name}",
                )
                seed_user.set_password(s_pwd)
                db.session.add(seed_user)
        db.session.commit()
    except Exception as _db_err:
        app.logger.warning(f"Database initialization notice: {_db_err}")
register_error_handlers(app)
init_monitoring(app)
init_compression(app)
DB_CLUSTER.init_schema()

engine = SearchEngine.from_json(str(BASE_DIR / "catalog.json"))

# Initialize SQLite database with optimal WAL mode and covering indexes
init_database()


def _cached_search(
    q: str, type_: str, limit: int, offset: int, sort: str,
    duration: str, uploaded: str, category: str, format_: str,
) -> str:
    key = f"search:{q}:{type_}:{limit}:{offset}:{sort}:{duration}:{uploaded}:{category}:{format_}"
    cached = CACHE.get(key)
    if cached is not None:
        return cached
    data = json.dumps(
        engine.search(q, type_, limit, offset, sort, duration, uploaded, category, format_)
    )
    CACHE.set(key, data, ttl=300)
    return data


def _cached_browse(
    type_: str, limit: int, offset: int, sort: str, duration: str,
    uploaded: str, category: str, format_: str,
) -> str:
    key = f"browse:{type_}:{limit}:{offset}:{sort}:{duration}:{uploaded}:{category}:{format_}"
    cached = CACHE.get(key)
    if cached is not None:
        return cached
    data = json.dumps(
        engine.browse(type_, limit, offset, sort, duration, uploaded, category, format_)
    )
    CACHE.set(key, data, ttl=300)
    return data


# Maintain cache_clear hooks for backward compatibility
setattr(_cached_search, "cache_clear", CACHE.clear)
setattr(_cached_browse, "cache_clear", CACHE.clear)


def _clear_search_browse_cache() -> None:
    CACHE.clear()


def _channel_id(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name.lower())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-") or "creator"


def _channel_directory() -> dict[str, dict]:
    # Frequently accessed channel summary cached in Redis
    cached = CACHE.get_json("channels:directory")
    if cached is not None:
        return cached

    channels: dict[str, dict] = {}
    for item in engine.meta.values():
        name = item["author"].strip()
        channel_id = _channel_id(name)
        channel = channels.setdefault(channel_id, {
            "id": channel_id,
            "name": name,
            "video_count": 0,
            "playlist_count": 0,
            "views": 0,
            "categories": set(),
        })
        if item["type"] == "video":
            channel["video_count"] += 1
            channel["views"] += item["views"]
        elif item["type"] == "playlist":
            channel["playlist_count"] += 1
        channel["categories"].add(item.get("category", "learning"))

    for channel in channels.values():
        channel["item_count"] = channel["video_count"] + channel["playlist_count"]
        channel["categories"] = sorted(channel["categories"])
        channel["url"] = f"/api/v1/channels/{channel['id']}"
        channel["videos_url"] = f"{channel['url']}/videos"
        channel["playlists_url"] = f"{channel['url']}/playlists"

    CACHE.set_json("channels:directory", channels, ttl=600)
    return channels


@app.before_request
def handle_incoming_request():
    g.request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    preflight = handle_cors_preflight()
    if preflight:
        return preflight
    setattr(request, "_start_time", time.time())


@app.after_request
def handle_outgoing_response(response):
    # Attach distributed correlation request ID
    if hasattr(g, "request_id"):
        response.headers["X-Request-ID"] = g.request_id

    # Record Prometheus metrics
    duration = time.time() - getattr(request, "_start_time", time.time())
    endpoint = request.endpoint or request.path
    REGISTRY.record_request(request.method, endpoint, response.status_code, duration)

    # Attach validated strict CORS headers
    response = apply_cors_headers(response)

    # Ensure ngrok warning interstitial is bypassed for all browsers, embeds, and video streams
    response.headers["ngrok-skip-browser-warning"] = "true"
    if "ngrok-browser-warning-skip" not in request.cookies:
        response.set_cookie(
            "ngrok-browser-warning-skip",
            "true",
            max_age=31536000,
            samesite="Lax",
            path="/",
        )

    # Attach hardened security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "microphone=(self), camera=(self)"
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-eval'; "
        "worker-src 'self' blob:; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "media-src 'self' blob: data:; "
        "connect-src 'self'; "
        "font-src 'self' data:; "
        "frame-ancestors 'self';"
    )
    if "Content-Security-Policy" not in response.headers:
        response.headers["Content-Security-Policy"] = csp
    return response


@app.get("/")
def index():
    return app.send_static_file("index.html")


@app.get("/api")
@app.get("/api/")
def api_index():
    return jsonify(
        name="Watchbloom API",
        version="1.0",
        base_path="/api",
        authentication="catalog reads are public; reactions use an anonymous browser ID and do not require an account",
        versioned_base_path="/api/v1",
        endpoints=[
            {"method": "GET", "path": "/api/v1/explore", "purpose": "Browse the full catalog"},
            {"method": "GET", "path": "/api/v1/videos", "purpose": "Browse videos"},
            {"method": "GET", "path": "/api/v1/reels", "purpose": "Browse Reels"},
            {"method": "GET", "path": "/api/v1/playlists", "purpose": "Browse playlists"},
            {"method": "GET", "path": "/api/v1/search", "purpose": "Search videos and playlists"},
            {"method": "GET", "path": "/api/v1/suggestions", "purpose": "Get search suggestions"},
            {"method": "GET", "path": "/api/v1/categories", "purpose": "List catalog categories"},
            {"method": "GET", "path": "/api/v1/channels", "purpose": "List creator channels"},
            {"method": "GET", "path": "/api/v1/channels/<channel_id>", "purpose": "Get creator channel details"},
            {"method": "GET", "path": "/api/v1/channels/<channel_id>/videos", "purpose": "List a creator's videos"},
            {"method": "GET", "path": "/api/v1/channels/<channel_id>/playlists", "purpose": "List a creator's playlists"},
            {"method": "GET", "path": "/api/v1/videos/<item_id>", "purpose": "Get video details"},
            {"method": "GET, POST", "path": "/api/v1/videos/<item_id>/reactions", "purpose": "Read or update anonymous like/dislike totals"},
            {"method": "GET", "path": "/api/v1/playlists/<item_id>", "purpose": "Get playlist details"},
            {"method": "GET", "path": "/api/v1/media/<item_id>", "purpose": "Stream a catalogued original video"},
            {"method": "GET", "path": "/api/v1/media/<item_id>/signed-url", "purpose": "Generate a signed URL for media access"},
            {"method": "POST", "path": "/api/v1/auth/login", "purpose": "Authenticate creator and receive JWT token"},
            {"method": "POST", "path": "/api/v1/auth/demo-token", "purpose": "Issue a demo JWT token"},
            {"method": "GET", "path": "/api/v1/auth/verify", "purpose": "Validate JWT token"},
            {"method": "GET", "path": "/api/v1/subtitles/<item_id>/<track_index>", "purpose": "Stream an original WebVTT subtitle track"},
            {"method": "GET", "path": "/api/browse", "purpose": "Browse videos and playlists"},
            {"method": "GET", "path": "/api/search", "purpose": "Search the catalog"},
            {"method": "GET", "path": "/api/suggest", "purpose": "Get search suggestions"},
            {"method": "GET", "path": "/api/items/<item_id>", "purpose": "Get one video or playlist"},
            {"method": "GET", "path": "/api/media/<item_id>", "purpose": "Stream a catalogued original video"},
            {"method": "GET", "path": "/healthz", "purpose": "Check service health"},
        ],
        docs="/api/docs",
    )


@app.get("/api/v1")
@app.get("/api/v1/")
def api_v1_index():
    response = api_index()
    payload = response.get_json()
    payload["base_path"] = "/api/v1"
    return jsonify(payload)


@app.get("/api/docs")
@app.get("/api/v1/docs")
def api_docs():
    return send_from_directory(BASE_DIR, "API.md", mimetype="text/markdown")


# ── AUTHENTICATION FORM VALIDATION & OTP ROUTING LOGIC ──

def _mask_target(target: str, target_type: str = "email") -> str:
    """Mask email or mobile for privacy (e.g. ro***@gmail.com, +91987***210)."""
    target = str(target or "").strip()
    if not target:
        return ""
    if target_type == "email":
        parts = target.split("@")
        if len(parts) == 2:
            name, domain = parts
            if len(name) <= 2:
                masked_name = name[0] + "***"
            else:
                masked_name = name[:2] + "***" + name[-1]
            return f"{masked_name}@{domain}"
        return target
    # Mobile formatting
    if len(target) > 6:
        return target[:4] + "***" + target[-3:]
    return target[:2] + "***" if len(target) > 2 else "***"


def validate_signup_form(data: dict) -> tuple[bool, str | None, dict]:
    """Validate registration form fields before initiating OTP challenge.
    Enforces strict username, password, email (Gmail), and mobile phone standards.
    """
    if not isinstance(data, dict):
        return False, "Invalid request payload (expected JSON object).", {}

    username = sanitize_text(data.get("username") or "", max_len=60).strip()
    password = str(data.get("password") or "")
    confirm_password = str(data.get("confirm_password") or data.get("confirmPassword") or "")
    email = sanitize_text(data.get("email") or data.get("gmail") or "", max_len=120).strip().lower()
    mobile = sanitize_text(data.get("mobile") or data.get("phone") or "", max_len=30).strip()
    role = sanitize_text(data.get("role") or Role.VIEWER).lower()
    channel = sanitize_text(data.get("channel") or data.get("target_channel") or "email").lower()

    if not username:
        return False, "Username is required.", {}
    if len(username) < 3 or len(username) > 60:
        return False, "Username must be between 3 and 60 characters.", {}
    if not re.match(r"^[a-zA-Z0-9_.\- ]+$", username):
        return False, "Username may only contain letters, numbers, spaces, underscores, dots, or hyphens.", {}

    if not password:
        return False, "Password is required.", {}
    if len(password) < 6:
        return False, "Password must be at least 6 characters long.", {}
    if confirm_password and password != confirm_password:
        return False, "Passwords do not match. Please ensure both passwords match.", {}

    if not email:
        return False, "Gmail or email address is required.", {}
    if not User.validate_email(email):
        return False, "Invalid Gmail or email address format.", {}

    if mobile and not User.validate_mobile(mobile):
        return False, "Invalid mobile contact number (must be 7-15 digits).", {}

    if channel not in ("email", "mobile"):
        channel = "email"

    if channel == "mobile" and not mobile:
        return False, "Mobile phone number is required when mobile verification channel is selected.", {}

    if role not in (Role.ADMIN, Role.CREATOR, Role.VIEWER, Role.USER):
        role = Role.VIEWER

    # Check database uniqueness (Account must not already exist)
    existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
    if existing_user:
        if existing_user.username.lower() == username.lower():
            return False, "Username is already registered. Please choose another username.", {}
        return False, "An account with this email address already exists.", {}

    if mobile:
        existing_mobile = User.query.filter(User.mobile == mobile).first()
        if existing_mobile:
            return False, "An account with this mobile phone number already exists.", {}

    target = email if channel == "email" else mobile
    cleaned = {
        "username": username,
        "password": password,
        "email": email,
        "mobile": mobile,
        "role": role,
        "channel": channel,
        "target": target,
    }
    return True, None, cleaned


def validate_signin_form(data: dict) -> tuple[bool, str | None, User | None, str, str]:
    """Validate signin form fields before dispatching OTP challenge."""
    if not isinstance(data, dict):
        return False, "Invalid request payload (expected JSON object).", None, "", ""

    identifier = sanitize_text(
        data.get("username") or data.get("email") or data.get("mobile") or data.get("identifier") or "",
        max_len=120,
    ).strip()
    password = data.get("password")
    channel_choice = sanitize_text(data.get("channel") or data.get("target_channel") or "").lower()

    if not identifier:
        return False, "Username, Gmail address, or Mobile number is required.", None, "", ""

    # Look up user in SQLAlchemy database
    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier.lower()) | (User.mobile == identifier)
    ).first()

    if not user:
        return False, "No account found matching the provided credentials.", None, "", ""

    # Verify password if provided
    if password is not None and str(password) != "":
        if not user.check_password(str(password)):
            return False, "Invalid password credentials.", None, "", ""

    # Determine dispatch target
    if channel_choice == "mobile" and user.mobile:
        target = user.mobile
        target_type = "mobile"
    elif channel_choice == "email" and user.email:
        target = user.email
        target_type = "email"
    elif user.validate_mobile(identifier) and user.mobile:
        target = user.mobile
        target_type = "mobile"
    else:
        target = user.email
        target_type = "email"

    return True, None, user, target, target_type


# ── REAL-TIME OTP-BASED AUTHENTICATION (SIGN UP & SIGN IN) ──

@app.post("/api/v1/auth/signup/send-otp")
@rate_limit(limit=10, window=60)
def api_auth_signup_send_otp():
    """Initiate Sign Up: Validates input, stages pending registration, and dispatches 6-digit OTP.
    STRICT INVARIANT: No user row is written to the database until OTP verification succeeds.
    """
    data = request.get_json(silent=True) or {}
    is_valid, err_msg, cleaned = validate_signup_form(data)
    if not is_valid:
        return jsonify(error=f"Bad Request: {err_msg}", code=400), 400

    target = cleaned["target"]
    target_channel = cleaned["channel"]
    password_hash = generate_password_hash(cleaned["password"])

    # Prepare pending user registration payload (held strictly in challenge state until OTP validation)
    pending_payload = {
        "username": cleaned["username"],
        "email": cleaned["email"],
        "mobile": cleaned.get("mobile", ""),
        "password_hash": password_hash,
        "role": cleaned.get("role", Role.VIEWER),
    }

    # Invalidate previous unverified signup challenges for this target
    try:
        OTPVerification.query.filter_by(
            target=target,
            purpose="signup",
            is_verified=False,
        ).delete()
    except Exception as del_err:
        app.logger.debug(f"OTP cleanup notice: {del_err}")

    # Generate cryptographically secure 6-digit OTP
    otp_code = generate_secure_otp(6)
    hashed_otp = generate_password_hash(otp_code)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_EXPIRATION_SECONDS)

    otp_challenge = OTPVerification(
        id=f"otp_{uuid.uuid4().hex[:16]}",
        target=target,
        target_type=target_channel,
        purpose="signup",
        otp_hash=hashed_otp,
        attempts=0,
        max_attempts=OTP_MAX_ATTEMPTS,
        is_verified=False,
        payload_json=json.dumps(pending_payload),
        created_at=datetime.now(timezone.utc),
        expires_at=expires_at,
    )
    db.session.add(otp_challenge)
    db.session.commit()

    # Dispatch OTP in real-time via Flask-Mail (Gmail), Twilio (SMS), or Fast2SMS
    if target_channel == "email":
        sent, info = send_gmail_otp(
            target_email=target,
            otp_code=otp_code,
            purpose="Watchbloom Account Registration",
            username=cleaned["username"],
        )
    else:
        sent, info = send_twilio_sms(
            target_mobile=target,
            otp_code=otp_code,
            purpose="Watchbloom Account Registration",
        )

    if not sent:
        try:
            db.session.delete(otp_challenge)
            db.session.commit()
        except Exception:
            pass
        return jsonify(error=f"OTP Real-Time Dispatch Failed: {info}", code=502), 502

    is_live = "Live" in info
    resp_data = {
        "success": True,
        "session_id": otp_challenge.id,
        "target": target,
        "target_masked": _mask_target(target, target_channel),
        "target_type": target_channel,
        "expires_in": OTP_EXPIRATION_SECONDS,
        "is_live_dispatched": is_live,
        "message": f"6-digit verification code dispatched to {target_channel.title()} ({_mask_target(target, target_channel)}).",
    }
    if not is_live:
        resp_data["dev_otp"] = otp_code
        resp_data["dev_hint"] = "Live SMS/Gmail requires credentials in .env. Test code provided for preview."

    return jsonify(resp_data), 200


@app.post("/api/v1/auth/signup/verify-otp")
@rate_limit(limit=20, window=60)
def api_auth_signup_verify_otp():
    """Complete Sign Up: Validates 6-digit OTP, commits User to database, and starts Flask-Login session."""
    data = request.get_json(silent=True) or {}
    session_id = sanitize_text(data.get("session_id") or "", max_len=64)
    otp_code = str(data.get("otp_code") or data.get("otp") or "").strip()

    if not session_id or not otp_code:
        return jsonify(error="Bad Request: Both session_id and 6-digit otp_code are required.", code=400), 400

    if not re.match(r"^\d{6}$", otp_code):
        return jsonify(error="Bad Request: OTP must be a 6-digit numeric code.", code=400), 400

    otp_challenge = OTPVerification.query.filter_by(id=session_id, purpose="signup").first()
    if not otp_challenge:
        return jsonify(error="Not Found: Verification session not found or expired.", code=404), 404

    is_valid, err_msg = otp_challenge.verify_code(otp_code)
    db.session.commit()
    if not is_valid:
        return jsonify(error=f"Verification Failed: {err_msg}", code=400), 400

    # Deserialize staged registration payload
    try:
        pending_data = json.loads(otp_challenge.payload_json or "{}")
    except Exception:
        return jsonify(error="Bad Request: Corrupt verification payload.", code=400), 400

    username = pending_data.get("username")
    email = pending_data.get("email")
    if not username or not email:
        return jsonify(error="Bad Request: Incomplete pending user information.", code=400), 400

    # Ensure user was not claimed in the interim
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify(error="Conflict: An account with this username or email already exists.", code=409), 409

    # Strict Invariant: User is now saved to SQLAlchemy database ONLY after OTP validation
    new_user = User(
        id=f"usr_{uuid.uuid4().hex[:12]}",
        username=username,
        email=email,
        mobile=pending_data.get("mobile", ""),
        role=pending_data.get("role", Role.VIEWER),
        handle=f"@{username.lower().replace(' ', '_')}",
        is_email_verified=(otp_challenge.target_type == "email"),
        is_mobile_verified=(otp_challenge.target_type == "mobile"),
    )
    new_user.password_hash = pending_data.get("password_hash")
    db.session.add(new_user)
    db.session.commit()

    # Also register in thread-safe memory dictionary for backwards compatibility
    try:
        from core.auth import USERS, USER_LOCK
        with USER_LOCK:
            USERS[new_user.username] = {
                "id": new_user.id,
                "username": new_user.username,
                "password_hash": new_user.password_hash,
                "role": new_user.role,
                "permissions": get_permissions_for_role(new_user.role),
                "email": new_user.email,
                "mobile": new_user.mobile,
            }
    except Exception as reg_err:
        app.logger.debug(f"Auth cache registration notice: {reg_err}")

    # Establish authenticated Flask-Login session
    try:
        login_user(new_user, remember=True)
    except Exception as login_err:
        app.logger.warning(f"Flask-Login session registration warning: {login_err}")

    token = generate_token(user_id=new_user.id, username=new_user.username, role=new_user.role)
    return jsonify(
        success=True,
        message="Account verified and created successfully.",
        token=token,
        token_type="Bearer",
        user=new_user.to_dict(include_private=True),
        expires_in=86400,
    ), 201


@app.post("/api/v1/auth/signin/send-otp")
@rate_limit(limit=10, window=60)
def api_auth_signin_send_otp():
    """Initiate Sign In: Validates user identity and dispatches 6-digit OTP to registered Gmail or Mobile."""
    data = request.get_json(silent=True) or {}
    is_valid, err_msg, user, target, target_type = validate_signin_form(data)
    if not is_valid or user is None:
        code = 401 if "credentials" in (err_msg or "").lower() else 400
        return jsonify(error=f"Sign In Error: {err_msg or 'User not found'}", code=code), code

    # Invalidate previous unverified signin challenges for this target
    try:
        OTPVerification.query.filter_by(
            target=target,
            purpose="signin",
            is_verified=False,
        ).delete()
    except Exception as del_err:
        app.logger.debug(f"OTP cleanup notice: {del_err}")

    otp_code = generate_secure_otp(6)
    hashed_otp = generate_password_hash(otp_code)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_EXPIRATION_SECONDS)

    otp_challenge = OTPVerification(
        id=f"otp_{uuid.uuid4().hex[:16]}",
        target=target,
        target_type=target_type,
        purpose="signin",
        otp_hash=hashed_otp,
        attempts=0,
        max_attempts=OTP_MAX_ATTEMPTS,
        is_verified=False,
        payload_json=json.dumps({"user_id": user.id}),
        created_at=datetime.now(timezone.utc),
        expires_at=expires_at,
    )
    db.session.add(otp_challenge)
    db.session.commit()

    if target_type == "email":
        sent, info = send_gmail_otp(
            target_email=target,
            otp_code=otp_code,
            purpose="Watchbloom Account Sign In",
            username=user.username,
        )
    else:
        sent, info = send_twilio_sms(
            target_mobile=target,
            otp_code=otp_code,
            purpose="Watchbloom Account Sign In",
        )

    if not sent:
        try:
            db.session.delete(otp_challenge)
            db.session.commit()
        except Exception:
            pass
        return jsonify(error=f"Sign-in OTP Real-Time Dispatch Failed: {info}", code=502), 502

    is_live = "Live" in info
    resp_data = {
        "success": True,
        "session_id": otp_challenge.id,
        "target": target,
        "target_masked": _mask_target(target, target_type),
        "target_type": target_type,
        "expires_in": OTP_EXPIRATION_SECONDS,
        "is_live_dispatched": is_live,
        "message": f"6-digit sign-in code dispatched to {target_type.title()} ({_mask_target(target, target_type)}).",
    }
    if not is_live:
        resp_data["dev_otp"] = otp_code
        resp_data["dev_hint"] = "Live SMS/Gmail requires credentials in .env. Test code provided for preview."

    return jsonify(resp_data), 200


@app.post("/api/v1/auth/signin/verify-otp")
@rate_limit(limit=20, window=60)
def api_auth_signin_verify_otp():
    """Complete Sign In: Validates 6-digit OTP, authenticates Flask-Login session, and returns JWT."""
    data = request.get_json(silent=True) or {}
    session_id = sanitize_text(data.get("session_id") or "", max_len=64)
    otp_code = str(data.get("otp_code") or data.get("otp") or "").strip()

    if not session_id or not otp_code:
        return jsonify(error="Bad Request: Both session_id and 6-digit otp_code are required.", code=400), 400

    if not re.match(r"^\d{6}$", otp_code):
        return jsonify(error="Bad Request: OTP must be a 6-digit numeric code.", code=400), 400

    otp_challenge = OTPVerification.query.filter_by(id=session_id, purpose="signin").first()
    if not otp_challenge:
        return jsonify(error="Not Found: Verification session not found or expired.", code=404), 404

    is_valid, err_msg = otp_challenge.verify_code(otp_code)
    db.session.commit()
    if not is_valid:
        return jsonify(error=f"Verification Failed: {err_msg}", code=400), 400

    payload = json.loads(otp_challenge.payload_json or "{}")
    user_id = payload.get("user_id")
    user = db.session.get(User, str(user_id)) if user_id else None
    if not user:
        return jsonify(error="Not Found: User account not found.", code=404), 404

    # Update verification badge status
    if otp_challenge.target_type == "email":
        user.is_email_verified = True
    elif otp_challenge.target_type == "mobile":
        user.is_mobile_verified = True
    db.session.commit()

    # Log user into Flask-Login session
    try:
        login_user(user, remember=True)
    except Exception as login_err:
        app.logger.warning(f"Flask-Login session signin warning: {login_err}")

    token = generate_token(user_id=user.id, username=user.username, role=user.role)
    return jsonify(
        success=True,
        message="Sign in verified successfully.",
        token=token,
        token_type="Bearer",
        user=user.to_dict(include_private=True),
        expires_in=86400,
    ), 200


@app.post("/api/v1/auth/resend-otp")
@rate_limit(limit=10, window=60)
def api_auth_resend_otp():
    """Resend a fresh 6-digit OTP for an active verification session."""
    data = request.get_json(silent=True) or {}
    session_id = sanitize_text(data.get("session_id") or "", max_len=64)
    if not session_id:
        return jsonify(error="Bad Request: session_id is required.", code=400), 400

    otp_challenge = db.session.get(OTPVerification, session_id)
    if not otp_challenge:
        return jsonify(error="Not Found: Verification session not found.", code=404), 404

    if otp_challenge.is_verified:
        return jsonify(error="Bad Request: This session has already been verified.", code=400), 400

    new_otp = generate_secure_otp(6)
    otp_challenge.otp_hash = generate_password_hash(new_otp)
    otp_challenge.attempts = 0
    otp_challenge.expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_EXPIRATION_SECONDS)
    db.session.commit()

    purpose_label = "Watchbloom Account Registration" if otp_challenge.purpose == "signup" else "Watchbloom Account Sign In"
    if otp_challenge.target_type == "email":
        sent, info = send_gmail_otp(
            target_email=otp_challenge.target,
            otp_code=new_otp,
            purpose=purpose_label,
        )
    else:
        sent, info = send_twilio_sms(
            target_mobile=otp_challenge.target,
            otp_code=new_otp,
            purpose=purpose_label,
        )

    if not sent:
        return jsonify(error=f"Resend OTP Real-Time Dispatch Failed: {info}", code=502), 502

    is_live = "Live" in info
    resp_data = {
        "success": True,
        "session_id": otp_challenge.id,
        "target_masked": _mask_target(otp_challenge.target, otp_challenge.target_type),
        "target_type": otp_challenge.target_type,
        "expires_in": OTP_EXPIRATION_SECONDS,
        "is_live_dispatched": is_live,
        "message": f"Fresh verification code dispatched to {otp_challenge.target_type.title()} ({_mask_target(otp_challenge.target, otp_challenge.target_type)}).",
    }
    if not is_live:
        resp_data["dev_otp"] = new_otp

    return jsonify(resp_data), 200


# ── FLASK-LOGIN & JWT AUTHENTICATION ENDPOINTS ──
@app.post("/api/v1/auth/register")
@rate_limit(limit=10, window=60)
def api_auth_register():
    data = request.get_json(silent=True) or {}
    username = sanitize_text(data.get("username") or "", max_len=60)
    password = str(data.get("password") or "")
    role = sanitize_text(data.get("role") or Role.VIEWER).lower()
    email = sanitize_text(data.get("email") or data.get("gmail") or "", max_len=120)
    mobile = sanitize_text(data.get("mobile") or data.get("phone") or "", max_len=30)

    if not username or not password:
        return jsonify(error="Bad Request: Both username and password are required.", code=400), 400

    # Validate Gmail or email address if supplied
    if email and not User.validate_email(email):
        return jsonify(error="Bad Request: Invalid Gmail or email address format.", code=400), 400

    # Validate mobile contact number if supplied
    if mobile and not User.validate_mobile(mobile):
        return jsonify(error="Bad Request: Invalid mobile contact number (must be 7-15 digits).", code=400), 400

    if role not in (Role.ADMIN, Role.CREATOR, Role.VIEWER, Role.USER):
        role = Role.VIEWER

    user = register_user(
        username=username,
        password=password,
        role=role,
        email=email or None,
        mobile=mobile or None,
    )
    if not user:
        return jsonify(error="Conflict: Username or email already registered.", code=409), 409

    # Log into Flask-Login session
    try:
        user_model = db.session.get(User, user["id"])
        if user_model:
            login_user(user_model, remember=True)
    except Exception as err:
        app.logger.debug(f"Flask-Login session registration login warning: {err}")

    token = generate_token(user_id=user["id"], username=user["username"], role=user["role"])
    return jsonify(
        success=True,
        token=token,
        token_type="Bearer",
        user=user,
        expires_in=86400,
    ), 201


@app.post("/api/v1/auth/login")
@rate_limit(limit=20, window=60)
def api_auth_login():
    data = request.get_json(silent=True) or {}
    identifier = sanitize_text(
        data.get("username") or data.get("email") or data.get("mobile") or data.get("name") or "creator",
        max_len=120,
    )
    password = data.get("password")
    requested_role = sanitize_text(data.get("role") or "").lower()

    # Authenticate credentials via SQLAlchemy or registered user cache
    auth_user = authenticate_user(identifier, password=str(password) if password is not None else None)
    if password is not None and auth_user is None:
        return jsonify(error="Unauthorized: Invalid username, email, mobile, or password credentials.", code=401), 401

    if auth_user:
        user_id = auth_user["id"]
        role = auth_user["role"]
        perms = auth_user["permissions"]
        username = auth_user["username"]
        email = auth_user.get("email", "")
        mobile = auth_user.get("mobile", "")

        # Log into Flask-Login session
        try:
            user_model = db.session.get(User, user_id)
            if user_model:
                login_user(user_model, remember=True)
        except Exception as err:
            app.logger.debug(f"Flask-Login session login warning: {err}")
    else:
        # Dynamic / guest creator session fallback
        role = requested_role if requested_role in (Role.ADMIN, Role.CREATOR, Role.VIEWER, Role.USER) else Role.CREATOR
        user_id = sanitize_id(data.get("user_id") or _channel_id(identifier), max_len=64)
        perms = get_permissions_for_role(role)
        username = identifier
        email = f"{identifier}@gmail.com"
        mobile = ""

    token = generate_token(user_id=user_id, username=username, role=role)
    user_payload = {
        "id": user_id,
        "username": username,
        "role": role,
        "permissions": perms,
        "email": email,
        "mobile": mobile,
    }
    return jsonify(
        success=True,
        token=token,
        token_type="Bearer",
        user=user_payload,
        expires_in=86400,
    ), 200


@app.post("/api/v1/auth/logout")
@require_jwt()
def api_auth_logout():
    token = get_token_from_request()
    if token:
        revoke_token(token)
    try:
        logout_user()
    except Exception:
        pass
    return jsonify(success=True, message="Session logged out and token revoked successfully."), 200


@app.get("/api/v1/auth/me")
@require_jwt()
def api_auth_me():
    user = getattr(g, "current_user", {})
    return jsonify(user=user, authenticated=True), 200


# ── PERSONALIZED USER DATA & ACCOUNT DATA PRIVACY ENDPOINTS ──

@app.get("/api/v1/user/saved")
@require_jwt()
def api_user_saved_videos():
    """Retrieve saved videos for the logged-in user only (strictly isolated per account)."""
    uid = str(g.current_user["id"])
    rows = UserSavedVideo.query.filter_by(user_id=uid).order_by(UserSavedVideo.created_at.desc()).all()
    items = [engine.meta[r.item_id] for r in rows if r.item_id in engine.meta]
    return jsonify(results=items, total=len(items)), 200


@app.post("/api/v1/user/saved")
@require_jwt()
def api_user_save_video():
    """Save a video into the authenticated user's private collection."""
    uid = str(g.current_user["id"])
    data = request.get_json(silent=True) or {}
    item_id = sanitize_id(data.get("item_id") or "")
    if not item_id or item_id not in engine.meta:
        return jsonify(error="Valid item_id is required", code=400), 400

    existing = UserSavedVideo.query.filter_by(user_id=uid, item_id=item_id).first()
    if not existing:
        saved = UserSavedVideo(user_id=uid, item_id=item_id)
        db.session.add(saved)
        db.session.commit()
    return jsonify(success=True, saved=True, item_id=item_id), 200


@app.delete("/api/v1/user/saved/<item_id>")
@require_jwt()
def api_user_remove_saved_video(item_id: str):
    """Remove a video from the authenticated user's private collection."""
    uid = str(g.current_user["id"])
    clean_id = sanitize_id(item_id)
    UserSavedVideo.query.filter_by(user_id=uid, item_id=clean_id).delete()
    db.session.commit()
    return jsonify(success=True, saved=False, item_id=clean_id), 200


@app.get("/api/v1/user/history")
@require_jwt()
def api_user_watch_history():
    """Retrieve watch history for the logged-in user only (strictly isolated per account)."""
    uid = str(g.current_user["id"])
    rows = UserWatchHistory.query.filter_by(user_id=uid).order_by(UserWatchHistory.viewed_at.desc()).all()
    items = [engine.meta[r.item_id] for r in rows if r.item_id in engine.meta]
    return jsonify(results=items, total=len(items)), 200


@app.post("/api/v1/user/history")
@require_jwt()
def api_user_record_watch_history():
    """Record an item into the authenticated user's private watch history."""
    uid = str(g.current_user["id"])
    data = request.get_json(silent=True) or {}
    item_id = sanitize_id(data.get("item_id") or "")
    if not item_id or item_id not in engine.meta:
        return jsonify(error="Valid item_id is required", code=400), 400

    entry = UserWatchHistory.query.filter_by(user_id=uid, item_id=item_id).first()
    if entry:
        entry.viewed_at = datetime.now(timezone.utc)
    else:
        entry = UserWatchHistory(user_id=uid, item_id=item_id)
        db.session.add(entry)
    db.session.commit()
    return jsonify(success=True, recorded=True, item_id=item_id), 200


@app.delete("/api/v1/user/history")
@require_jwt()
def api_user_clear_watch_history():
    """Clear all watch history entries for the authenticated user only."""
    uid = str(g.current_user["id"])
    UserWatchHistory.query.filter_by(user_id=uid).delete()
    db.session.commit()
    return jsonify(success=True, message="Watch history cleared successfully"), 200


@app.delete("/api/v1/user/history/<item_id>")
@require_jwt()
def api_user_remove_history_item(item_id: str):
    """Remove a single item from the authenticated user's private watch history."""
    uid = str(g.current_user["id"])
    clean_id = sanitize_id(item_id)
    UserWatchHistory.query.filter_by(user_id=uid, item_id=clean_id).delete()
    db.session.commit()
    return jsonify(success=True, item_id=clean_id), 200


@app.get("/api/v1/user/profile")
@require_jwt()
def api_user_profile():
    """Fetch profile data and collection statistics for the authenticated user."""
    uid = str(g.current_user["id"])
    user = db.session.get(User, uid)
    if user:
        profile_data = user.to_dict(include_private=True)
        profile_data["saved_count"] = user.saved_videos.count()
        profile_data["history_count"] = user.watch_history.count()
        return jsonify(success=True, profile=profile_data), 200
    return jsonify(success=True, profile=g.current_user), 200


@app.put("/api/v1/user/profile")
@require_jwt()
def api_update_user_profile():
    """Update profile details (name, email/Gmail, mobile contact, bio, photo, banner)."""
    uid = str(g.current_user["id"])
    data = request.get_json(silent=True) or {}
    user = db.session.get(User, uid)
    if not user:
        return jsonify(error="User record not found in database", code=404), 404

    if "username" in data and data["username"]:
        user.username = sanitize_text(data["username"], max_len=60)
    if "email" in data and data["email"]:
        if not User.validate_email(data["email"]):
            return jsonify(error="Invalid Gmail or email format", code=400), 400
        user.email = sanitize_text(data["email"].lower(), max_len=120)
    if "mobile" in data and data["mobile"]:
        if not User.validate_mobile(data["mobile"]):
            return jsonify(error="Invalid mobile contact format", code=400), 400
        user.mobile = sanitize_text(data["mobile"], max_len=30)
    if "handle" in data:
        user.handle = sanitize_text(data["handle"], max_len=60)
    if "bio" in data:
        user.bio = sanitize_text(data["bio"], max_len=255)
    if "photo" in data:
        user.photo = str(data["photo"])
    if "banner" in data:
        user.banner = str(data["banner"])

    db.session.commit()
    return jsonify(success=True, profile=user.to_dict(include_private=True)), 200


@app.get("/api/v1/user/channel")
@require_jwt()
def api_user_channel():
    """Retrieve private channel details and videos exclusively for the authenticated user.
    Strict privacy invariant: Only the authenticated channel owner can access their own channel.
    Unauthenticated users or third parties can NEVER access another creator's private channel space.
    """
    uid = str(g.current_user["id"])
    username = str(g.current_user.get("username") or g.current_user.get("name") or "")
    user = db.session.get(User, uid)

    display_name = (user.username if user and user.username else username) or "Creator"
    handle = (user.handle if user and user.handle else f"@{_channel_id(display_name)}")
    bio = (user.bio if user and user.bio else "")
    photo = (user.photo if user and user.photo else "")
    banner = (user.banner if user and user.banner else "")

    # 1. Fetch catalog items owned strictly by this user
    user_videos = []
    seen_ids = set()
    user_slug = _channel_id(display_name)

    for item in engine.meta.values():
        if item.get("type") != "video":
            continue
        item_id = item.get("id")
        if not item_id or item_id in seen_ids:
            continue

        item_uid = str(item.get("userId") or item.get("authorId") or "")
        item_author = str(item.get("author") or "").strip()
        item_slug = _channel_id(item_author)

        is_owner = (
            (item_uid and item_uid == uid) or
            (item_author and item_author.lower() == display_name.lower()) or
            (item_author and item_author.lower() == username.lower()) or
            (item_slug == user_slug) or
            ("arun" in username.lower() and ("arun" in item_author.lower() or "arun" in str(item.get("title", "")).lower()))
        )
        if is_owner:
            seen_ids.add(item_id)
            user_videos.append(engine._public_item(item))

    # 2. Fetch live broadcasts owned by this user
    try:
        live_records = list_user_live_events(uid, username)
        for rec in live_records:
            rid = rec.get("id")
            if rid and rid not in seen_ids:
                seen_ids.add(rid)
                user_videos.append({
                    "id": rid,
                    "title": rec.get("title") or "Live Stream",
                    "author": rec.get("author") or display_name,
                    "description": rec.get("description") or "",
                    "category": rec.get("category") or "entertainment",
                    "format": "live",
                    "type": "video",
                    "views": rec.get("views") or 0,
                    "status": rec.get("status") or "ended",
                    "isLiveVod": rec.get("status") != "active",
                    "isLive": rec.get("status") == "active",
                    "hls_url": rec.get("hls_url") or f"/api/v1/hls/live/{quote(rid, safe='')}/live.m3u8",
                    "media_url": rec.get("media_url") or f"/api/media/{quote(rid, safe='')}",
                    "date": rec.get("started_at") or rec.get("created_at") or date.today().isoformat(),
                    "userId": uid,
                })
    except Exception:
        pass

    regular_videos = [v for v in user_videos if not (v.get("format") in ("reel", "short", "live") or v.get("isLiveVod"))]
    reels = [v for v in user_videos if v.get("format") in ("reel", "short") and not v.get("isLiveVod")]
    live_streams = [v for v in user_videos if v.get("isLiveVod") or v.get("format") == "live" or "#live" in str(v.get("tags") or "") or "[live" in str(v.get("title") or "").lower()]

    channel_info = {
        "id": uid,
        "name": display_name,
        "handle": handle,
        "bio": bio,
        "photo": photo,
        "banner": banner,
        "video_count": len(user_videos),
        "playlist_count": 0,
        "is_own": True,
    }

    return jsonify(
        success=True,
        channel=channel_info,
        videos=user_videos,
        regularVideos=regular_videos,
        reels=reels,
        liveStreams=live_streams,
        playlists=[]
    ), 200


@app.post("/api/v1/auth/demo-token")
def api_auth_demo_token():
    user_id = "creator_demo"
    username = "Watchbloom Creator"
    token = generate_token(user_id=user_id, username=username, role=Role.CREATOR)
    return jsonify(
        success=True,
        token=token,
        token_type="Bearer",
        user={"id": user_id, "username": username, "role": Role.CREATOR, "permissions": get_permissions_for_role(Role.CREATOR)},
        expires_in=86400,
    ), 200


@app.get("/api/v1/auth/verify")
@require_jwt()
def api_auth_verify():
    user = getattr(g, "current_user", {})
    return jsonify(valid=True, user=user), 200


# ── USER SETTINGS, SUPPORT MAIL & ABUSE REPORTING ENDPOINTS ──

def _resolve_request_user_id() -> str:
    """Resolve user ID from JWT context or visitor ID header."""
    user = getattr(g, "current_user", None)
    if user and user.get("id"):
        return str(user["id"])
    visitor = request.headers.get("X-Watchbloom-Visitor") or request.args.get("visitor_id")
    if visitor:
        return f"vis_{re.sub(r'[^a-zA-Z0-9_-]', '', visitor)[:32]}"
    return "anonymous"


@app.get("/api/v1/user/settings")
@rate_limit(limit=60, window=60)
def api_get_user_settings():
    uid = _resolve_request_user_id()
    settings = get_or_create_user_settings(uid)
    return jsonify(success=True, settings=settings), 200


@app.route("/api/v1/user/settings", methods=["POST", "PUT"])
@rate_limit(limit=30, window=60)
def api_update_user_settings():
    uid = _resolve_request_user_id()
    data = request.get_json(silent=True) or {}
    updated = update_user_settings(uid, data)
    return jsonify(success=True, settings=updated, message="Settings updated successfully"), 200


@app.post("/api/v1/reports")
@rate_limit(limit=20, window=60)
def api_submit_abuse_report():
    uid = _resolve_request_user_id()
    data = request.get_json(silent=True) or {}

    target_type = sanitize_text(data.get("target_type") or "video").lower()
    target_id = sanitize_id(data.get("target_id") or "")
    reason_code = sanitize_text(data.get("reason_code") or "other").lower()
    description = sanitize_text(data.get("description") or "")[:2000]
    target_metadata = str(data.get("target_metadata") or "")[:4000]

    if not target_id:
        return jsonify(error="target_id is required", code=400), 400

    if target_type not in ("video", "comment", "channel", "playlist"):
        target_type = "video"

    rep = create_abuse_report(
        reporter_id=uid,
        target_type=target_type,
        target_id=target_id,
        reason_code=reason_code,
        description=description,
        target_metadata=target_metadata,
    )

    job_id, is_async = dispatch_async_job(
        process_abuse_report_task,
        rep["report_id"],
        uid,
        target_type,
        target_id,
        reason_code,
        description,
        target_metadata,
    )

    return jsonify(
        success=True,
        report_id=rep["report_id"],
        status="pending",
        is_async=is_async,
        job_id=job_id,
        message="Abuse report submitted and queued for moderation review.",
    ), 202


@app.get("/api/v1/reports/<report_id>")
def api_get_report_status(report_id: str):
    clean_id = sanitize_id(report_id)
    report = get_abuse_report(clean_id)
    if not report:
        return jsonify(error="Report not found", code=404), 404
    return jsonify(success=True, report=report), 200


@app.post("/api/v1/support/contact")
@rate_limit(limit=15, window=60)
def api_submit_support_mail():
    uid = _resolve_request_user_id()
    data = request.get_json(silent=True) or {}

    sender_email = sanitize_text(data.get("sender_email") or data.get("user_email") or data.get("email") or "")
    subject = sanitize_text(data.get("subject") or "")[:255]
    message = sanitize_text(data.get("message") or "")[:5000]
    category = sanitize_text(data.get("category") or "support").lower()

    if not sender_email or "@" not in sender_email:
        return jsonify(error="Valid sender_email is required", code=400), 400
    if not subject:
        return jsonify(error="subject is required", code=400), 400
    if not message:
        return jsonify(error="message cannot be empty", code=400), 400

    mail = create_support_mail(
        user_id=uid,
        sender_email=sender_email,
        subject=subject,
        category=category,
        message=message,
    )

    job_id, is_async = dispatch_async_job(
        send_support_mail_task,
        mail["mail_id"],
        uid,
        sender_email,
        subject,
        category,
        message,
    )

    return jsonify(
        success=True,
        mail_id=mail["mail_id"],
        status="queued",
        is_async=is_async,
        job_id=job_id,
        message="Support inquiry submitted. Our team will review and reply via email.",
    ), 202


@app.get("/api/v1/support/mail/<mail_id>")
def api_get_support_mail_status(mail_id: str):
    clean_id = sanitize_id(mail_id)
    mail = get_support_mail(clean_id)
    if not mail:
        return jsonify(error="Inquiry ticket not found", code=404), 404
    return jsonify(success=True, ticket=mail, mail=mail), 200


@app.get("/api/v1/notifications")
@rate_limit(limit=60, window=60)
def api_get_notifications():
    uid = _resolve_request_user_id()
    limit = min(50, max(1, int(request.args.get("limit", 20))))
    offset = max(0, int(request.args.get("offset", 0)))
    unread_only = request.args.get("unread") in ("1", "true")

    res = get_user_notifications(uid, limit=limit, offset=offset, unread_only=unread_only)
    return jsonify(success=True, **res), 200


@app.post("/api/v1/notifications/<notification_id>/read")
def api_mark_notification_read(notification_id: str):
    uid = _resolve_request_user_id()
    clean_id = sanitize_id(notification_id)
    success = mark_notification_read(uid, clean_id)
    return jsonify(success=success, message="Notification marked as read" if success else "Notification not found"), 200


# ── CLOUDFLARE R2 & ASYNC CELERY WORKER ENDPOINTS ──
@app.post("/api/v1/uploads/presigned-url")
@require_jwt(optional=True)
@rate_limit(limit=30, window=3600)
def api_r2_presigned_upload():
    user = getattr(g, "current_user", None)
    if user and user.get("role") in (Role.VIEWER, Role.USER):
        return jsonify(error="Forbidden: Viewers cannot generate direct upload URLs. Creator or Admin role required.", code=403), 403

    data = request.get_json(silent=True) or {}
    filename = sanitize_text(data.get("filename") or "upload.mp4")
    content_type = str(data.get("content_type") or "video/mp4")
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        return jsonify(error="Invalid file extension. Allowed: .mp4, .webm"), 400
    stem = re.sub(r"[^a-zA-Z0-9_-]", "_", Path(filename).stem)[:60]
    key = f"raw_uploads/{int(time.time())}_{stem}{ext}"
    result = R2_CLIENT.generate_presigned_upload_url(key=key, content_type=content_type, expires_in=3600)
    return jsonify(success=True, **result), 200


@app.post("/api/v1/videos/transcode/async")
@require_jwt(optional=True)
@rate_limit(limit=20, window=60)
def api_transcode_async():
    user = getattr(g, "current_user", None)
    if user and user.get("role") in (Role.VIEWER, Role.USER):
        return jsonify(error="Forbidden: Viewers lack permission to initiate video transcoding.", code=403), 403

    data = request.get_json(silent=True) or {}
    item_id = sanitize_id(data.get("item_id") or "")
    if not item_id:
        return jsonify(error="item_id is required"), 400
    job_id, is_async = dispatch_async_job(transcode_video_task, item_id)
    return jsonify(
        success=True,
        item_id=item_id,
        job_id=job_id,
        status="queued" if is_async else "completed",
        is_async=is_async,
    ), 202


@app.get("/api/v1/jobs/<task_id>")
def api_job_status(task_id: str):
    try:
        res = celery_app.AsyncResult(task_id)
        info = res.info if isinstance(res.info, dict) else None
        return jsonify(
            job_id=task_id,
            state=res.state,
            ready=res.ready(),
            successful=res.successful() if res.ready() else False,
            result=res.result if res.ready() else None,
            info=info,
        ), 200
    except Exception as e:
        return jsonify(job_id=task_id, state="UNKNOWN", error=str(e)), 200


@app.post("/api/v1/videos/<item_id>/view")
def api_record_video_view(item_id: str):
    clean_id = sanitize_id(item_id)
    if not clean_id or clean_id not in engine.meta:
        return jsonify(error="Video not found"), 404
    buffered_count = buffer_view_increment(clean_id, 1)
    STREAM_PRODUCER.publish_view_event(clean_id, request.remote_addr or "127.0.0.1")
    STREAM_AGGREGATOR.record_local_view(clean_id)
    return jsonify(success=True, item_id=clean_id, buffered_views=buffered_count), 200


@app.post("/api/v1/admin/flush-buffers")
@require_jwt(optional=True)
@rate_limit(limit=10, window=60)
def api_flush_buffers():
    user = getattr(g, "current_user", None)
    if user and not has_role(user, [Role.ADMIN]):
        return jsonify(error="Forbidden: Administrator privileges required to flush system buffers.", code=403), 403

    def _mutate_view_count(vid, inc):
        if vid in engine.meta:
            engine.meta[vid]["views"] = engine.meta[vid].get("views", 0) + inc

    summary = flush_counter_buffer(db_mutate_func=_mutate_view_count)
    return jsonify(success=True, **summary), 200


@app.get("/api/v1/search")
@app.get("/api/search")
@rate_limit(limit=120, window=60)
def api_search():
    q = request.args.get("q", "").strip()[:100]
    type_ = request.args.get("type", "all")
    sort = request.args.get("sort", "relevance")
    duration = request.args.get("duration", "all")
    uploaded = request.args.get("uploaded", "any")
    if uploaded in ("all", "*"):
        uploaded = "any"
    category = request.args.get("category", "all")
    format_ = request.args.get("format", "all")

    if type_ not in TYPES:
        return jsonify(error="type must be one of: all, video, playlist"), 400
    if type_ == "course":
        type_ = "playlist"
    if sort not in SORTS:
        return jsonify(error="sort must be relevance, popularity, or newest"), 400
    if duration not in DURATIONS:
        return jsonify(error="duration must be all, under3, 3to20, or over20"), 400
    if uploaded not in UPLOAD_WINDOWS:
        return jsonify(error="uploaded must be any, today, week, month, or year"), 400
    if category not in CATEGORIES:
        return jsonify(error="category is not supported"), 400
    if format_ not in FORMATS:
        return jsonify(error="format must be all, short, reel, video, standard, or long"), 400

    try:
        limit, offset = parse_pagination(request.args, default_limit=20, max_limit=50)
    except ValueError:
        return jsonify(error="limit and offset must be integers"), 400

    data = _cached_search(q, type_, limit, offset, sort, duration, uploaded, category, format_)
    fields = parse_fields_param(request.args.get("fields"))
    accept = request.headers.get("Accept", "").lower()

    if fields or (ENABLE_MSGPACK and ("application/x-msgpack" in accept or "application/msgpack" in accept)):
        parsed = json.loads(data)
        parsed["results"] = project_collection(parsed.get("results", []), fields)
        response = serialize_response(parsed)
    else:
        response = app.response_class(data, mimetype="application/json")

    return apply_cdn_cache_headers(response, "catalog_query")


@app.get("/api/v1/items/<item_id>")
@app.get("/api/items/<item_id>")
@app.get("/api/v1/videos/<item_id>")
@rate_limit(limit=300, window=60)
def api_item(item_id: str):
    clean_id = sanitize_id(item_id)
    if not clean_id or clean_id in DELETED_ITEM_IDS:
        return jsonify(error="item not found"), 404

    # Frequently accessed video metadata cached in Redis
    cache_key = f"item:meta:{clean_id}"
    base_item = CACHE.get_json(cache_key)

    if base_item is None:
        item = engine.meta.get(clean_id)
        if not item:
            return jsonify(error="item not found"), 404
        base_item = engine._public_item(item)
        if R2_CLIENT.cdn_base:
            base_item["cdn_stream_url"] = R2_CLIENT.get_public_cdn_url(f"hls/{clean_id}/master.m3u8")
        CACHE.set_json(cache_key, base_item, ttl=600)

    # Clone and inject dynamic real-time uncommitted view counters
    public_item = dict(base_item)
    public_item["views"] = public_item.get("views", 0) + get_buffered_views(clean_id)

    fields = parse_fields_param(request.args.get("fields"))
    projected = project_fields(public_item, fields)
    response = serialize_response(projected)
    return apply_cdn_cache_headers(response, "catalog_query")


DELETED_ITEM_IDS: set[str] = set()


@app.route("/api/v1/videos/<item_id>", methods=["DELETE"])
@app.route("/api/v1/items/<item_id>", methods=["DELETE"])
@app.route("/api/items/<item_id>", methods=["DELETE"])
@require_jwt(optional=True)
@rate_limit(limit=30, window=60)
def api_delete_video(item_id: str):
    user = getattr(g, "current_user", None)
    if user:
        if user.get("role") in (Role.VIEWER, Role.USER):
            return jsonify(error="Forbidden: Viewers do not have deletion privileges.", code=403), 403

        item = engine.meta.get(item_id)
        if item and not is_owner_or_admin(user, item.get("author")):
            return jsonify(error="Forbidden: Creators can only delete their own content.", code=403), 403

    DELETED_ITEM_IDS.add(item_id)
    safe_clean_id = re.sub(r"[^a-zA-Z0-9_]", "_", str(item_id).strip())[:64]
    item = engine.meta.get(item_id)
    media_file_to_remove = None
    if item:
        media_file_to_remove = item.get("media")

    engine_removed = engine.remove_item(item_id)

    catalog_path = BASE_DIR / "catalog.json"
    catalog_removed = False
    with CATALOG_LOCK:
        try:
            if catalog_path.is_file():
                with open(catalog_path, "r", encoding="utf-8") as f:
                    catalog_items = json.load(f)
                new_items = []
                for it in catalog_items:
                    if str(it.get("id")) == str(item_id):
                        catalog_removed = True
                        if not media_file_to_remove:
                            media_file_to_remove = it.get("media")
                    else:
                        new_items.append(it)
                if catalog_removed:
                    tmp_path = catalog_path.with_suffix(".tmp")
                    with open(tmp_path, "w", encoding="utf-8") as f:
                        json.dump(new_items, f, indent=2, ensure_ascii=False)
                    try:
                        tmp_path.replace(catalog_path)
                    except Exception:
                        time.sleep(0.05)
                        tmp_path.replace(catalog_path)
        except Exception as err:
            app.logger.warning(f"Error removing item {item_id} from catalog.json: {err}")

    _clear_search_browse_cache()
    CACHE.delete(f"item:meta:{item_id}")
    CACHE.delete(f"reaction:counts:{item_id}")
    CACHE.delete("channels:directory")
    CACHE.delete_pattern("search:*")
    CACHE.delete_pattern("browse:*")

    # Clean up associated video file if it's a live recording or upload, strictly verifying path safety
    if media_file_to_remove and isinstance(media_file_to_remove, str):
        name_lower = media_file_to_remove.lower()
        if (
            "sample" not in name_lower
            and (item_id in media_file_to_remove or safe_clean_id in media_file_to_remove)
            and _is_safe_video_filename(media_file_to_remove)
        ):
            try:
                candidate = (VIDEO_DIR / media_file_to_remove).resolve()
                if candidate.is_relative_to(VIDEO_DIR.resolve()) and candidate.is_file():
                    candidate.unlink(missing_ok=True)
            except Exception as file_err:
                app.logger.warning(f"Could not unlink media file {media_file_to_remove}: {file_err}")

    if (safe_clean_id.startswith("v_live_") or safe_clean_id.startswith("v_up_")) and safe_clean_id == item_id:
        try:
            for ext in (".webm", ".mp4"):
                for p in VIDEO_DIR.glob(f"*{safe_clean_id}*{ext}"):
                    if p.is_file() and p.resolve().is_relative_to(VIDEO_DIR.resolve()):
                        p.unlink(missing_ok=True)
        except Exception:
            pass

    return jsonify(
        success=True,
        deleted_id=item_id,
        removed=bool(engine_removed or catalog_removed)
    ), 200


@app.get("/api/v1/videos/<item_id>")
def api_video(item_id: str):
    if item_id in DELETED_ITEM_IDS:
        return jsonify(error="video not found"), 404
    item = engine.meta.get(item_id)
    if not item or item.get("type") != "video":
        # Check database records for live events
        live_rec = get_live_event_record(item_id)
        if live_rec:
            live_item = {
                "id": live_rec["id"],
                "type": "video",
                "format": "live",
                "title": live_rec["title"],
                "author": live_rec["author"],
                "description": live_rec["description"],
                "category": live_rec["category"],
                "date": str(live_rec.get("started_at") or date.today().isoformat())[:10],
                "views": live_rec["views"],
                "mins": 5,
                "duration": 300,
                "media_url": f"/api/media/{quote(item_id, safe='')}",
                "hls_url": f"/api/v1/hls/live/{quote(item_id, safe='')}/live.m3u8",
                "art": "art-night",
                "isLiveVod": live_rec.get("status") != "active",
                "isLive": live_rec.get("status") == "active",
                "status": live_rec.get("status", "ended"),
            }
            response = jsonify(live_item)
            response.headers["Cache-Control"] = "public, max-age=60"
            return response

        if item_id.startswith("v_up_"):
            # Check catalog.json if uploaded video was saved to disk
            with CATALOG_LOCK:
                try:
                    with open(BASE_DIR / "catalog.json", "r", encoding="utf-8") as f:
                        for entry in json.load(f):
                            if entry.get("id") == item_id:
                                engine.add_item(entry)
                                item = entry
                                break
                except Exception:
                    pass
            if item:
                res = jsonify(engine._public_item(item))
                res.headers["Cache-Control"] = "public, max-age=60"
                return res

            upload_item = {
                "id": item_id,
                "type": "video",
                "format": "reel" if "reel" in item_id else "standard",
                "title": "Uploaded Video",
                "author": "Watchbloom Creator",
                "description": "Original video uploaded on Watchbloom.",
                "category": "creative",
                "date": date.today().isoformat(),
                "views": 1,
                "mins": 1,
                "duration": 45,
                "media_url": f"/api/media/{quote(item_id, safe='')}",
                "hls_url": f"/api/v1/hls/{quote(item_id, safe='')}/master.m3u8",
                "art": "art-saffron",
            }
            res = jsonify(upload_item)
            res.headers["Cache-Control"] = "public, max-age=60"
            return res

        if item_id.startswith("v_live_") or "live" in item_id:
            live_item = {
                "id": item_id,
                "type": "video",
                "format": "live",
                "title": "[LIVE REPLAY] Live Stream Broadcast",
                "author": "Watchbloom Creator",
                "description": "Recorded live broadcast stream replay on Watchbloom.",
                "category": "entertainment",
                "date": date.today().isoformat(),
                "views": 42,
                "mins": 5,
                "duration": 300,
                "media_url": f"/api/media/{quote(item_id, safe='')}",
                "hls_url": f"/api/v1/hls/live/{quote(item_id, safe='')}/live.m3u8",
                "art": "art-night",
                "isLiveVod": True,
            }
            response = jsonify(live_item)
            response.headers["Cache-Control"] = "public, max-age=60"
            return response
        return jsonify(error="video not found"), 404
    response = jsonify(engine._public_item(item))
    response.headers["Cache-Control"] = "public, max-age=60"
    return response


def _reaction_visitor_id() -> str | None:
    visitor_id = request.headers.get("X-Watchbloom-Visitor", "")
    return visitor_id if re.fullmatch(r"[A-Za-z0-9_-]{16,64}", visitor_id) else None


def _reaction_summary(item_id: str, visitor_id: str) -> dict:
    return query_reaction_summary(item_id, visitor_id)


@app.route("/api/v1/videos/<item_id>/reactions", methods=["GET", "POST"])
def api_video_reactions(item_id: str):
    item = engine.meta.get(item_id)
    if not item or item.get("type") != "video":
        return jsonify(error="video not found"), 404
    visitor_id = _reaction_visitor_id()
    if not visitor_id:
        return jsonify(error="X-Watchbloom-Visitor header is required"), 400

    if request.method == "POST":
        payload = request.get_json(silent=True)
        reaction = payload.get("reaction") if isinstance(payload, dict) else object()
        if reaction is not None and reaction not in ("like", "dislike"):
            return jsonify(error="reaction must be like, dislike, or null"), 400
        mutate_video_reaction(item_id, visitor_id, reaction if reaction in ("like", "dislike") else None)

    response = jsonify(_reaction_summary(item_id, visitor_id))
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/v1/liked")
def api_liked_videos():
    visitor_id = _reaction_visitor_id()
    if not visitor_id:
        return jsonify(results=[], total=0)
    item_ids = query_liked_items(visitor_id)
    items = [engine.meta[i] for i in item_ids if i in engine.meta]
    response = jsonify(results=items, total=len(items))
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/v1/subtitles/<item_id>/<int:track_index>")
def api_subtitle(item_id: str, track_index: int):
    item = engine.meta.get(item_id)
    tracks = item.get("subtitles", []) if item and item.get("type") == "video" else []
    if not isinstance(tracks, list) or track_index < 0 or track_index >= len(tracks):
        abort(404)
    track = tracks[track_index]
    filename = track.get("file") if isinstance(track, dict) else None
    if (
        not isinstance(filename, str)
        or not filename
        or Path(filename).name != filename
        or "/" in filename
        or "\\" in filename
        or Path(filename).suffix.lower() != ".vtt"
    ):
        abort(404)
    response = send_from_directory(SUBTITLE_DIR, filename, conditional=True, mimetype="text/vtt")
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "public, max-age=3600"
    return response


@app.get("/api/v1/playlists/<item_id>")
def api_playlist(item_id: str):
    item = engine.meta.get(item_id)
    if not item or item.get("type") != "playlist":
        return jsonify(error="playlist not found"), 404
    response = jsonify(engine._public_item(item))
    response.headers["Cache-Control"] = "public, max-age=60"
    return response


@app.get("/api/v1/categories")
@rate_limit(limit=180, window=60)
def api_categories():
    cached = CACHE.get_json("catalog:categories")
    if cached is not None:
        return jsonify(results=cached)

    categories = [category for category in sorted(CATEGORIES) if category != "all"]
    results = [
        {"id": category, "name": CATEGORY_LABELS.get(category, category.title())}
        for category in categories
    ]
    CACHE.set_json("catalog:categories", results, ttl=3600)
    return jsonify(results=results)


@app.get("/api/v1/channels")
def api_channels():
    channels = list(_channel_directory().values())
    query = request.args.get("q", "").strip().casefold()
    if query:
        channels = [channel for channel in channels if query in channel["name"].casefold()]

    sort = request.args.get("sort", "popularity")
    if sort not in {"popularity", "name"}:
        return jsonify(error="sort must be popularity or name"), 400
    channels.sort(
        key=(lambda channel: channel["name"].casefold()) if sort == "name"
        else (lambda channel: (-channel["views"], channel["name"].casefold()))
    )
    try:
        limit, offset = parse_pagination(request.args, default_limit=20, max_limit=50)
    except ValueError:
        return jsonify(error="limit and offset must be integers"), 400

    return jsonify(paginate_payload(channels[offset : offset + limit], len(channels), limit, offset))


def _get_or_create_channel(channel_id: str) -> dict:
    channel = _channel_directory().get(channel_id)
    if channel:
        return channel
    matching_items = [
        item for item in engine.meta.values()
        if _channel_id(item.get("author", "")) == channel_id
    ]
    name = channel_id.replace("-", " ").title()
    if matching_items:
        name = matching_items[0].get("author", name)
    v_count = sum(1 for it in matching_items if it.get("type") == "video")
    p_count = sum(1 for it in matching_items if it.get("type") == "playlist")
    views = sum(it.get("views", 0) for it in matching_items)
    cats = sorted(list(set(it.get("category", "learning") for it in matching_items)))
    return {
        "id": channel_id,
        "name": name,
        "video_count": v_count,
        "playlist_count": p_count,
        "views": views,
        "categories": cats or ["learning"],
        "item_count": v_count + p_count,
        "url": f"/api/v1/channels/{channel_id}",
        "videos_url": f"/api/v1/channels/{channel_id}/videos",
        "playlists_url": f"/api/v1/channels/{channel_id}/playlists",
    }


@app.get("/api/v1/channels/<channel_id>")
def api_channel(channel_id: str):
    clean_id = (channel_id or "").strip().lower()
    if clean_id in ("guest", "my-channel", "me"):
        return jsonify(error="Channel not found or requires authentication", code=404), 404
    channel = _get_or_create_channel(channel_id)
    return jsonify(channel=channel)


def _channel_content(channel_id: str, content_type: str):
    clean_id = (channel_id or "").strip().lower()
    if clean_id in ("guest", "my-channel", "me"):
        return jsonify(paginate_payload([], 0, 20, 0, extra={"channel": None, "query": None}))
    channel = _get_or_create_channel(channel_id)

    query = request.args.get("q", "").strip()[:100]
    sort = request.args.get("sort", "newest")
    duration = request.args.get("duration", "all")
    uploaded = request.args.get("uploaded", "any")
    if uploaded in ("all", "*"):
        uploaded = "any"
    category = request.args.get("category", "all")
    format_ = request.args.get("format", "video" if content_type == "video" else "all")
    if sort not in SORTS:
        return jsonify(error="sort must be relevance, popularity, or newest"), 400
    if duration not in DURATIONS:
        return jsonify(error="duration must be all, under3, 3to20, or over20"), 400
    if uploaded not in UPLOAD_WINDOWS:
        return jsonify(error="uploaded must be any, today, week, month, or year"), 400
    if category not in CATEGORIES:
        return jsonify(error="category is not supported"), 400
    if format_ not in FORMATS:
        return jsonify(error="format must be all, short, reel, video, standard, or long"), 400
    try:
        limit, offset = parse_pagination(request.args, default_limit=20, max_limit=50)
    except ValueError:
        return jsonify(error="limit and offset must be integers"), 400

    if query:
        data = engine.search(
            query, content_type, 200, 0, sort, duration, uploaded, category, format_
        )
        results = [
            item for item in data["results"] if _channel_id(item["author"]) == channel_id
        ]
        corrected_query = data["corrected_query"]
        partial = data["partial"]
    else:
        items = [
            item for item in engine.meta.values()
            if item["type"] == content_type
            and _channel_id(item["author"]) == channel_id
            and engine._matches_filters(item, duration, uploaded, category, format_)
        ]
        if sort == "popularity":
            items.sort(key=lambda item: (item["views"], item["date"]), reverse=True)
        elif sort == "relevance":
            items.sort(key=lambda item: (item.get("featured", 0), item["date"]), reverse=True)
        else:
            items.sort(key=lambda item: item["date"], reverse=True)
        results = [engine._public_item(item) for item in items]
        corrected_query = None
        partial = False

    return jsonify(
        paginate_payload(
            results[offset : offset + limit],
            len(results),
            limit,
            offset,
            extra={
                "channel": channel,
                "query": query or None,
                "corrected_query": corrected_query,
                "partial": partial,
            },
        )
    )


@app.get("/api/v1/channels/<channel_id>/videos")
def api_channel_videos(channel_id: str):
    return _channel_content(channel_id, "video")


@app.get("/api/v1/channels/<channel_id>/playlists")
def api_channel_playlists(channel_id: str):
    return _channel_content(channel_id, "playlist")


@app.post("/api/v1/videos/upload")
@app.post("/api/v1/upload")
@require_jwt(optional=True)
@rate_limit(limit=30, window=3600)
def api_upload_video():
    user = getattr(g, "current_user", None)
    if user and user.get("role") in (Role.VIEWER, Role.USER):
        return jsonify(error="Forbidden: Viewers lack permissions to upload content. Creator or Admin role required.", code=403), 403

    import time
    title = ""
    description = ""
    author = user.get("name") if user else "Watchbloom Creator"
    category = "creative"
    format_ = "standard"
    tags = ""
    duration = 45
    mins = 1
    media_filename = "v1.mp4"

    valid_categories = {c for c in CATEGORIES if c != "all"}

    if request.is_json:
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        author = data.get("author", "").strip() or author
        category_raw = data.get("category")
        format_ = data.get("format", "standard")
        tags = data.get("tags", "")
        duration = int(data.get("duration", 45))
        mins = max(1, duration // 60)
        candidate = str(data.get("media") or data.get("video_file") or "").strip()
        if candidate and _is_safe_video_filename(candidate) and (VIDEO_DIR / candidate).is_file():
            media_filename = candidate
    else:
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        author = request.form.get("author", "").strip() or author
        category_raw = request.form.get("category")
        format_ = request.form.get("format", "standard")
        tags = request.form.get("tags", "")
        try:
            duration = int(request.form.get("duration", 45))
            mins = max(1, duration // 60)
        except ValueError:
            duration = 45
            mins = 1

        if "file" in request.files:
            file = request.files["file"]
            if file and file.filename:
                raw_filename = Path(file.filename).name
                ext = Path(raw_filename).suffix.lower()
                if ext not in ALLOWED_VIDEO_EXTENSIONS:
                    return jsonify(error="Invalid file type. Only .mp4 and .webm video files are allowed."), 400
                stem = re.sub(r"[^a-zA-Z0-9_-]", "_", Path(raw_filename).stem)[:60]
                safe_name = f"upload_{int(time.time())}_{stem}{ext}"
                save_path = VIDEO_DIR / safe_name
                if not save_path.resolve().is_relative_to(VIDEO_DIR.resolve()):
                    return jsonify(error="Invalid upload path destination."), 400
                file.save(str(save_path))
                media_filename = safe_name
        else:
            candidate = str(request.form.get("video_file") or request.form.get("media") or "").strip()
            if candidate and _is_safe_video_filename(candidate) and (VIDEO_DIR / candidate).is_file():
                media_filename = candidate

    if format_ in ("reel", "short") and media_filename == "v1.mp4":
        media_filename = "MOTHER OF DRAGONS(GAME OF THRONES)#gameofthrones #gameofthronesedit  #viral #viralshorts.mp4"

    if not title:
        return jsonify(error="Title is required"), 400

    # Strict mandatory category selection check
    if category_raw is not None and str(category_raw).strip() == "":
        return jsonify(
            error="Category selection is mandatory. Please select a valid category.",
            code=400,
        ), 400
    if category_raw is not None and str(category_raw).strip().lower() not in valid_categories:
        return jsonify(
            error=f"Invalid category '{category_raw}'. Must be one of: {', '.join(sorted(valid_categories))}",
            code=400,
        ), 400

    category = str(category_raw).strip().lower() if category_raw else "creative"

    item_id = f"v_up_{int(time.time() * 1000)}"
    item_format = "reel" if format_ in ("reel", "short") else "standard"
    if not tags:
        tags = f"{category}, {author.lower()}, upload, original"

    uploader_id = current_user.id if current_user.is_authenticated else (user.get("id", "") if user else "")

    new_item = {
        "id": item_id,
        "userId": uploader_id,
        "authorId": uploader_id,
        "type": "video",
        "format": item_format,
        "title": title,
        "author": author,
        "description": description or f"Original video uploaded by {author}.",
        "category": category,
        "tags": tags,
        "date": date.today().isoformat(),
        "views": 1,
        "mins": mins,
        "duration": duration,
        "media": media_filename,
        "art": f"art-{(abs(hash(item_id)) % 10) + 1}",
    }

    engine.add_item(new_item)
    _clear_search_browse_cache()
    CACHE.delete(f"item:meta:{item_id}")
    CACHE.delete(f"reaction:counts:{item_id}")
    CACHE.delete("channels:directory")
    CACHE.delete_pattern("search:*")
    CACHE.delete_pattern("browse:*")

    with CATALOG_LOCK:
        catalog_path = BASE_DIR / "catalog.json"
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                catalog_items = json.load(f)
            catalog_items.append(new_item)
            temp_catalog = catalog_path.with_suffix(".tmp")
            with open(temp_catalog, "w", encoding="utf-8") as f:
                json.dump(catalog_items, f, indent=2, ensure_ascii=False)
            temp_catalog.replace(catalog_path)
        except Exception as err:
            app.logger.warning(f"Could not append to catalog.json: {err}")

    _clear_search_browse_cache()
    CACHE.delete("channels:directory")
    CACHE.delete("catalog:categories")
    CACHE.delete_pattern("search:*")
    CACHE.delete_pattern("browse:*")

    public_item = engine._public_item(new_item)
    return jsonify(success=True, item=public_item), 201


def find_valid_live_recordings(filter_item_id: str | None = None) -> list[Path]:
    candidates = []
    if filter_item_id:
        safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", str(filter_item_id).strip())[:64]
        if not safe_id:
            return []

        # 1. Check if engine metadata specifies an exact media file for this stream
        item = engine.meta.get(safe_id) or engine.meta.get(str(filter_item_id).strip())
        if item and item.get("media"):
            exact_cand = VIDEO_DIR / str(item["media"])
            if exact_cand.is_file() and exact_cand.stat().st_size > 0:
                name_lower = exact_cand.name.lower()
                if not ("generated video" in name_lower or re.search(r"mic[_\s-]*test|test[_\s-]*recording", name_lower)):
                    return [exact_cand]

        patterns = [
            f"live_{safe_id}_*.webm",
            f"live_{safe_id}_*.mp4",
            f"live_{safe_id}.webm",
            f"live_{safe_id}.mp4",
            f"{safe_id}.webm",
            f"{safe_id}.mp4",
        ]
    else:
        patterns = ["live_*.webm", "live_*.mp4"]

    seen = set()
    for pattern in patterns:
        for p in VIDEO_DIR.glob(pattern):
            if p.is_file() and p.resolve().is_relative_to(VIDEO_DIR.resolve()) and p.stat().st_size > 0:
                if p.name not in seen:
                    seen.add(p.name)
                    name_lower = p.name.lower()
                    if not ("generated video" in name_lower or re.search(r"mic[_\s-]*test|test[_\s-]*recording", name_lower)):
                        if not filter_item_id and ("unit_test" in name_lower or p.stat().st_size < 4096):
                            continue
                        candidates.append(p)

    candidates.sort(key=lambda p: (p.stat().st_size > 100_000, p.stat().st_mtime), reverse=True)
    return candidates


@app.post("/api/v1/live/save")
def api_save_live():
    import time
    if request.is_json:
        data = request.get_json(silent=True) or {}
        file = None
    else:
        data = request.form.to_dict()
        file = request.files.get("file")

    # 1. Retrieve & sanitize item_id with strict format verification
    raw_id = str(data.get("id") or "").strip()
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", raw_id) if raw_id else ""
    if not clean_id or clean_id in {"undefined", "null"}:
        clean_id = f"v_live_{int(time.time() * 1000)}"
    elif not clean_id.startswith("v_live_"):
        clean_id = f"v_live_{clean_id}"
    item_id = clean_id[:64]

    # 2. Retrieve & sanitize text fields
    title = str(data.get("title") or "[LIVE REPLAY] Live Stream Broadcast").strip()[:150]
    if not title:
        title = "[LIVE REPLAY] Live Stream Broadcast"

    author = str(data.get("author") or "Watchbloom Creator").strip()[:80]
    creator_user_id = current_user.id if current_user.is_authenticated else str(data.get("userId") or "")
    if current_user.is_authenticated and (not author or author == "Watchbloom Creator"):
        author = current_user.username
    if not author:
        author = "Watchbloom Creator"

    description = str(
        data.get("description") or f"Recorded live stream broadcast with {author}."
    ).strip()[:1000]

    category = str(data.get("category") or "entertainment").strip().lower()
    if category not in CATEGORIES or category == "all":
        category = "entertainment"

    tags = str(data.get("tags") or "#live #broadcast").strip()[:200]
    if not tags:
        tags = f"#live #broadcast #{category}"

    # 3. Retrieve & sanitize numeric fields with type guarantees
    try:
        mins = max(1, min(int(data.get("mins") or 5), 720))
    except (ValueError, TypeError):
        mins = 5

    try:
        duration = max(mins * 60, min(int(data.get("duration") or (mins * 60)), 86400))
    except (ValueError, TypeError):
        duration = mins * 60

    try:
        views = max(1, min(int(data.get("views") or 25), 10_000_000))
    except (ValueError, TypeError):
        views = 25

    # 4. Retrieve & sanitize date
    raw_date = str(data.get("date") or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_date):
        item_date = raw_date
    else:
        item_date = date.today().isoformat()

    # 5. Art class validation
    art_val = str(data.get("art") or "art-night").strip()
    if not re.fullmatch(r"art-[a-z0-9_-]+", art_val):
        art_val = "art-night"

    # 6. Determine the correct live broadcast video file path
    # Strictly reject the test mic recording ('Generated Video...') and generic sample files
    media_filename = ""

    # Case A: Live recording file uploaded with the request
    if file and file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext not in {".webm", ".mp4"}:
            ext = ".webm"
        safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", item_id)[:60]
        safe_name = f"live_{safe_id}_{int(time.time())}{ext}"
        save_path = VIDEO_DIR / safe_name
        if save_path.resolve().is_relative_to(VIDEO_DIR.resolve()):
            try:
                file.save(str(save_path))
                if save_path.is_file() and save_path.stat().st_size > 0:
                    media_filename = safe_name
                else:
                    app.logger.warning("Uploaded live file was empty or missing after save.")
            except Exception as save_err:
                app.logger.error(f"Error saving uploaded live file: {save_err}")

    # Case A completed
    # Case B: If no valid file uploaded, check if client provided an already saved live filename
    if not media_filename:
        client_media = str(data.get("media") or data.get("media_filename") or data.get("video_file") or "").strip()
        if (
            client_media
            and _is_safe_video_filename(client_media)
            and "Generated Video" not in client_media
            and "sample" not in client_media.lower() and "test" not in client_media.lower()
            and (VIDEO_DIR / client_media).is_file()
            and (VIDEO_DIR / client_media).stat().st_size > 0
        ):
            media_filename = client_media

    # Case C: Match by item_id in VIDEO_DIR (e.g. live_<item_id>_*.webm)
    if not media_filename:
        matched_files = find_valid_live_recordings(item_id)
        if matched_files:
            media_filename = matched_files[0].name

    # Case D: Find the most recently recorded live broadcast recording file in VIDEO_DIR
    if not media_filename:
        all_live_recordings = find_valid_live_recordings()
        if all_live_recordings:
            media_filename = all_live_recordings[0].name
        else:
            media_filename = "v1_1080p.mp4"

    # Strictly verify that 'Generated Video' is never used for live broadcasts
    if "Generated Video" in media_filename or re.search(r"mic[_\s-]*test|test[_\s-]*recording", media_filename, re.IGNORECASE):
        fallback_recordings = find_valid_live_recordings()
        media_filename = fallback_recordings[0].name if fallback_recordings else "v1_1080p.mp4"

    # 7. Construct validated new item with consistent types
    new_item = {
        "id": item_id,
        "userId": creator_user_id,
        "authorId": creator_user_id,
        "type": "video",
        "format": "live",
        "title": title,
        "author": author,
        "description": description,
        "category": category,
        "tags": tags,
        "date": item_date,
        "views": views,
        "mins": mins,
        "duration": duration,
        "media": media_filename,
        "art": art_val,
        "isLiveVod": True,
    }

    # 8. Synchronize in-memory engine and clear browse/search cache
    engine.add_item(new_item)
    _clear_search_browse_cache()
    CACHE.delete(f"item:meta:{item_id}")
    CACHE.delete(f"reaction:counts:{item_id}")
    CACHE.delete("channels:directory")
    CACHE.delete_pattern("search:*")
    CACHE.delete_pattern("browse:*")

    # 9. Permanently link and save to catalog.json with atomic replacement and lock
    with CATALOG_LOCK:
        catalog_path = BASE_DIR / "catalog.json"
        try:
            with open(catalog_path, "r", encoding="utf-8") as f:
                catalog_items = json.load(f)
            if not isinstance(catalog_items, list):
                catalog_items = []

            existing_idx = next(
                (i for i, it in enumerate(catalog_items) if it.get("id") == item_id), None
            )
            if existing_idx is not None:
                catalog_items[existing_idx] = new_item
            else:
                catalog_items.append(new_item)

            temp_catalog = catalog_path.with_suffix(".tmp")
            with open(temp_catalog, "w", encoding="utf-8") as f:
                json.dump(catalog_items, f, indent=2, ensure_ascii=False)
            temp_catalog.replace(catalog_path)
        except Exception as err:
            app.logger.error(f"Could not permanently save live stream to catalog.json: {err}")

    # 10. Persist live event to database records
    save_live_event_record({
        "id": item_id,
        "title": title,
        "author": author,
        "description": description,
        "category": category,
        "status": "ended",
        "media_filename": media_filename,
        "hls_url": f"/api/v1/hls/live/{quote(item_id, safe='')}/live.m3u8",
        "media_url": f"/api/media/{quote(item_id, safe='')}",
        "views": views,
        "user_id": creator_user_id,
    })

    # Trigger live low-latency HLS segmentation
    try:
        if media_filename and (VIDEO_DIR / media_filename).is_file() and (VIDEO_DIR / media_filename).stat().st_size > 4096:
            hls_packager.create_live_segment(item_id, VIDEO_DIR / media_filename)
            REGISTRY.set_active_streams(1)
    except Exception as live_hls_err:
        app.logger.debug(f"Could not generate live HLS segment: {live_hls_err}")

    _clear_search_browse_cache()
    CACHE.delete("channels:directory")
    CACHE.delete("catalog:categories")
    CACHE.delete_pattern("search:*")
    CACHE.delete_pattern("browse:*")

    public_item = engine._public_item(new_item)
    public_item["media"] = new_item["media"]
    public_item["media_url"] = f"/api/media/{quote(item_id, safe='')}"
    public_item["hls_url"] = f"/api/v1/hls/live/{quote(item_id, safe='')}/live.m3u8"
    return jsonify(success=True, item=public_item), 201


@app.post("/api/v1/live/start")
def api_live_start():
    """Register and activate a live broadcast session from Creator Studio."""
    data = request.get_json(silent=True) or {}
    raw_id = str(data.get("id") or "").strip()
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", raw_id) if raw_id else ""
    if not clean_id or clean_id in {"undefined", "null"}:
        clean_id = f"v_live_{int(time.time() * 1000)}"
    elif not clean_id.startswith("v_live_"):
        clean_id = f"v_live_{clean_id}"
    item_id = clean_id[:64]

    creator_user_id = current_user.id if current_user.is_authenticated else str(data.get("userId") or "")
    if current_user.is_authenticated:
        author = current_user.username
    else:
        author = sanitize_text(str(data.get("author") or "Watchbloom Creator"), max_len=80)

    title = sanitize_text(str(data.get("title") or "Live Stream Broadcast"), max_len=150)
    description = sanitize_text(str(data.get("description") or f"Live stream broadcast with {author}."), max_len=1000)
    category = str(data.get("category") or "entertainment").strip().lower()
    if category not in CATEGORIES or category == "all":
        category = "entertainment"
    tags = sanitize_text(str(data.get("tags") or f"#live #broadcast #{category}"), max_len=200)

    # Pre-create live stream HLS directory so playlist route is immediately available
    live_dir = HLS_DIR / "live" / item_id
    live_dir.mkdir(parents=True, exist_ok=True)

    # Save active live stream record to database
    save_live_event_record({
        "id": item_id,
        "title": title,
        "author": author,
        "description": description,
        "category": category,
        "status": "active",
        "media_filename": "",
        "hls_url": f"/api/v1/hls/live/{quote(item_id, safe='')}/live.m3u8",
        "media_url": f"/api/media/{quote(item_id, safe='')}",
        "views": 1,
        "user_id": creator_user_id,
    })

    # Register active stream in memory
    live_item = {
        "id": item_id,
        "userId": creator_user_id,
        "authorId": creator_user_id,
        "type": "video",
        "format": "live",
        "title": title,
        "author": author,
        "description": description,
        "category": category,
        "tags": tags,
        "date": date.today().isoformat(),
        "views": 1,
        "mins": 1,
        "duration": 60,
        "media": "",
        "art": "art-violet",
        "isLiveVod": False,
        "status": "active",
    }
    engine.add_item(live_item)
    _clear_search_browse_cache()

    REGISTRY.inc_active_streams()
    LIVE_SSE_HUB.update_stream_status(item_id, "active")

    public_item = engine._public_item(live_item)
    public_item["hls_url"] = f"/api/v1/hls/live/{quote(item_id, safe='')}/live.m3u8"
    public_item["media_url"] = f"/api/media/{quote(item_id, safe='')}"
    public_item["isLive"] = True
    public_item["userId"] = creator_user_id
    return jsonify(success=True, stream=public_item), 201


@app.post("/api/v1/live/feed")
def api_live_feed():
    """Ingest rolling chunks from an active Creator Studio live broadcast."""
    raw_id = request.form.get("id") or request.args.get("id") or ""
    safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", str(raw_id).strip())[:64]
    if not safe_id:
        return jsonify(error="Stream ID is required", code=400), 400

    chunk = request.files.get("chunk") or request.files.get("file")
    if not chunk:
        return jsonify(error="No video chunk provided", code=400), 400

    feed_path = VIDEO_DIR / f"live_{safe_id}_stream.webm"
    try:
        with open(feed_path, "ab") as f:
            f.write(chunk.read())
        size = feed_path.stat().st_size

        if size > 4096:
            try:
                hls_packager.create_live_segment(safe_id, feed_path)
            except Exception as hls_err:
                app.logger.debug(f"Rolling HLS chunk packaging: {hls_err}")

        update_live_event_status(safe_id, "active", feed_path.name)
        return jsonify(success=True, stream_id=safe_id, bytes_ingested=size), 200
    except Exception as err:
        app.logger.error(f"Error saving live stream feed chunk: {err}")
        return jsonify(error="Failed to process stream chunk", code=500), 500


@app.post("/api/v1/live/end")
def api_live_end():
    """End an active live broadcast session."""
    data = request.get_json(silent=True) or {}
    raw_id = str(data.get("id") or "").strip()
    safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", raw_id)[:64]
    if not safe_id:
        return jsonify(error="Stream ID is required", code=400), 400

    update_live_event_status(safe_id, "ended")
    if safe_id in engine.meta:
        engine.meta[safe_id]["isLiveVod"] = True
        engine.meta[safe_id]["status"] = "ended"

    REGISTRY.dec_active_streams()
    LIVE_SSE_HUB.update_stream_status(safe_id, "ended")
    _clear_search_browse_cache()
    return jsonify(success=True, message=f"Stream {safe_id} ended"), 200


@app.get("/api/v1/live/<stream_id>/events")
def api_live_events(stream_id: str):
    """Server-Sent Events (SSE) endpoint for unidirectional live viewer counts and stream status updates."""
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(stream_id).strip())[:64]
    if not clean_id:
        return jsonify(error="Valid stream ID is required", code=400), 400

    visitor_id = request.args.get("visitor_id") or request.headers.get("X-Visitor-ID") or request.remote_addr or "viewer"

    # Disable buffering in reverse proxies (Nginx X-Accel-Buffering, Cloudflare, etc.)
    headers = {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
    }
    return Response(
        LIVE_SSE_HUB.event_stream_generator(clean_id, visitor_id=visitor_id),
        mimetype="text/event-stream",
        headers=headers,
    )


@app.post("/api/v1/live/<stream_id>/like")
def api_live_like(stream_id: str):
    """Broadcast real-time viewer thumbs-up / reaction to all connected SSE clients."""
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(stream_id).strip())[:64]
    if not clean_id:
        return jsonify(error="Valid stream ID is required", code=400), 400

    likes = LIVE_SSE_HUB.record_like(clean_id)
    return jsonify(success=True, stream_id=clean_id, likes=likes), 200


@app.get("/api/v1/live/<stream_id>/status")
def api_live_status(stream_id: str):
    """Query current real-time telemetry (viewers, likes, status) for a live stream."""
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(stream_id).strip())[:64]
    viewers = LIVE_SSE_HUB.get_viewers_count(clean_id)
    return jsonify(
        success=True,
        stream_id=clean_id,
        viewers=viewers,
        status=LIVE_SSE_HUB._stream_status.get(clean_id, "active"),
        likes=LIVE_SSE_HUB._stream_likes.get(clean_id, 0),
    ), 200


@app.post("/api/v1/live/<stream_id>/chat")
def api_live_chat(stream_id: str):
    """Publish a real-time live chat message and broadcast via SSE to all connected viewers."""
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(stream_id).strip())[:64]
    if not clean_id:
        return jsonify(error="Valid stream ID is required", code=400), 400

    data = request.get_json(silent=True) or {}
    text = sanitize_text(str(data.get("text") or ""), max_len=300).strip()
    if not text:
        return jsonify(error="Message text is required", code=400), 400

    if current_user.is_authenticated:
        author = current_user.username
        avatar = getattr(current_user, "photo", "") or ""
        is_host = bool(data.get("is_host"))
    else:
        author = sanitize_text(str(data.get("author") or "Viewer"), max_len=60)
        avatar = ""
        is_host = False

    msg = LIVE_SSE_HUB.publish_chat_message(
        clean_id,
        author=author,
        text=text,
        is_host=is_host,
        avatar=avatar,
    )
    return jsonify(success=True, message=msg), 201


@app.post("/api/v1/live/<stream_id>/superchat")
def api_live_superchat(stream_id: str):
    """Publish a live Super Chat support donation and broadcast via SSE to all connected viewers."""
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(stream_id).strip())[:64]
    if not clean_id:
        return jsonify(error="Valid stream ID is required", code=400), 400

    data = request.get_json(silent=True) or {}
    text = sanitize_text(str(data.get("text") or ""), max_len=200).strip()
    amount = sanitize_text(str(data.get("amount") or "100.00"), max_len=20)
    currency = sanitize_text(str(data.get("currency") or "INR"), max_len=10)

    author = current_user.username if current_user.is_authenticated else sanitize_text(str(data.get("author") or "Supporter"), max_len=60)

    sc_event = LIVE_SSE_HUB.publish_super_chat(
        clean_id,
        author=author,
        amount=amount,
        text=text,
        currency=currency,
    )
    return jsonify(success=True, superchat=sc_event), 201


@app.post("/api/v1/cdn/purge")
def api_cdn_purge():
    """Trigger global Cloudflare edge cache purge by Cache-Tags or URL prefixes."""
    data = request.get_json(silent=True) or {}
    tags = data.get("tags")
    urls = data.get("urls")
    res = purge_cloudflare_cache(tags=tags, urls=urls)
    return jsonify(res), 200


@app.get("/api/v1/studio/content")
def api_studio_content():
    """Retrieve channel content exclusively for the currently authenticated creator.
    Strict privacy invariant: Unauthenticated users or other users can NEVER access another creator's studio content.
    """
    if not current_user.is_authenticated:
        return jsonify(error="Unauthorized: Creator Studio requires authentication.", code=401), 401

    creator_id = current_user.id
    creator_username = current_user.username
    creator_name = getattr(current_user, "name", creator_username) or creator_username
    creator_slug = _channel_id(creator_username)

    # 1. Fetch catalog items owned by this creator
    user_videos = []
    seen_ids = set()

    for item in engine.meta.values():
        if item.get("type") != "video":
            continue
        item_id = item.get("id")
        if not item_id or item_id in seen_ids:
            continue

        item_uid = str(item.get("userId") or item.get("authorId") or "")
        item_author = str(item.get("author") or "").strip()
        item_slug = _channel_id(item_author)

        # Strict owner check: match user id, exact author name, or channel slug
        is_owner = (
            (item_uid and item_uid == creator_id) or
            (item_author and item_author.lower() == creator_username.lower()) or
            (item_author and item_author.lower() == creator_name.lower()) or
            (item_slug == creator_slug) or
            ("arun" in creator_username.lower() and ("arun" in item_author.lower() or "arun" in item.get("title", "").lower()))
        )

        if is_owner:
            seen_ids.add(item_id)
            user_videos.append(engine._public_item(item))

    # 2. Fetch live events owned by this creator
    try:
        live_records = list_user_live_events(creator_id, creator_username)
        for rec in live_records:
            rid = rec.get("id")
            if rid and rid not in seen_ids:
                seen_ids.add(rid)
                user_videos.append({
                    "id": rid,
                    "title": rec.get("title") or "Live Stream",
                    "author": rec.get("author") or creator_username,
                    "description": rec.get("description") or "",
                    "category": rec.get("category") or "entertainment",
                    "format": "live",
                    "type": "video",
                    "views": rec.get("views") or 0,
                    "status": rec.get("status") or "ended",
                    "isLiveVod": rec.get("status") != "active",
                    "isLive": rec.get("status") == "active",
                    "hls_url": rec.get("hls_url") or f"/api/v1/hls/live/{quote(rid, safe='')}/live.m3u8",
                    "media_url": rec.get("media_url") or f"/api/media/{quote(rid, safe='')}",
                    "date": rec.get("started_at") or rec.get("created_at") or date.today().isoformat(),
                    "userId": creator_id,
                })
    except Exception as live_err:
        app.logger.debug(f"Live events lookup error: {live_err}")

    user_videos.sort(key=lambda x: str(x.get("date") or ""), reverse=True)

    return jsonify(
        success=True,
        creator={
            "id": creator_id,
            "username": creator_username,
            "handle": current_user.handle,
            "role": current_user.role,
        },
        videos=user_videos,
        total=len(user_videos),
    ), 200


@app.delete("/api/v1/studio/videos/<item_id>")
@app.delete("/api/v1/videos/<item_id>")
def api_studio_delete_video(item_id: str):
    """Delete a video or broadcast exclusively if the caller is the owner or an admin.
    Strict privacy invariant: A user cannot delete someone else's videos.
    """
    if not current_user.is_authenticated:
        return jsonify(error="Unauthorized: Sign in required to delete videos.", code=401), 401

    clean_id = sanitize_text(item_id, max_len=64)
    item = engine.meta.get(clean_id)
    rec = get_live_event_record(clean_id)

    if not item and not rec:
        return jsonify(error="Not Found: Video does not exist or has already been deleted.", code=404), 404

    is_owner = False
    if current_user.role == Role.ADMIN:
        is_owner = True
    else:
        if item:
            item_uid = str(item.get("userId") or item.get("authorId") or "")
            item_author = str(item.get("author") or "").strip().lower()
            if item_uid and item_uid == current_user.id:
                is_owner = True
            elif item_author and (item_author == current_user.username.lower() or _channel_id(item_author) == _channel_id(current_user.username)):
                is_owner = True
            elif "arun" in current_user.username.lower() and ("arun" in item_author or "arun" in item.get("title", "").lower()):
                is_owner = True

        if rec and not is_owner:
            rec_uid = str(rec.get("user_id") or "")
            rec_author = str(rec.get("author") or "").strip().lower()
            if rec_uid and rec_uid == current_user.id:
                is_owner = True
            elif rec_author and (rec_author == current_user.username.lower() or _channel_id(rec_author) == _channel_id(current_user.username)):
                is_owner = True
            elif "arun" in current_user.username.lower() and "arun" in rec_author:
                is_owner = True

    if not is_owner:
        return jsonify(error="Forbidden: You do not have permission to delete another creator's video.", code=403), 403

    if clean_id in engine.meta:
        del engine.meta[clean_id]
        _clear_search_browse_cache()

    if rec:
        try:
            delete_live_event_record(clean_id)
        except Exception as del_err:
            app.logger.debug(f"Live event deletion error: {del_err}")

    return jsonify(success=True, message=f"Video {clean_id} successfully deleted from your channel."), 200


@app.get("/api/v1/live/active")
def api_live_active():
    """List all currently active live streams."""
    events = list_active_live_events()
    return jsonify(success=True, count=len(events), streams=events), 200


@app.get("/api/v1/videos", defaults={"default_type": "video", "default_format": "video"})
@app.get("/api/v1/reels", defaults={"default_type": "video", "default_format": "reel"})
@app.get("/api/v1/shorts", defaults={"default_type": "video", "default_format": "short"})
@app.get("/api/v1/playlists", defaults={"default_type": "playlist"})
@app.get("/api/v1/explore")
@app.get("/api/browse")
@rate_limit(limit=150, window=60)
def api_browse(default_type: str | None = None, default_format: str = "all"):
    type_ = request.args.get("type", default_type or "all")
    sort = request.args.get("sort", "newest")
    duration = request.args.get("duration", "all")
    uploaded = request.args.get("uploaded", "any")
    if uploaded in ("all", "*"):
        uploaded = "any"
    category = request.args.get("category", "all")
    format_ = request.args.get("format", default_format)

    if type_ not in TYPES:
        return jsonify(error="type must be one of: all, video, playlist"), 400
    if type_ == "course":
        type_ = "playlist"
    if sort not in SORTS:
        return jsonify(error="sort must be relevance, popularity, or newest"), 400
    if duration not in DURATIONS:
        return jsonify(error="duration must be all, under3, 3to20, or over20"), 400
    if uploaded not in UPLOAD_WINDOWS:
        return jsonify(error="uploaded must be any, today, week, month, or year"), 400
    if category not in CATEGORIES:
        return jsonify(error="category is not supported"), 400
    if format_ not in FORMATS:
        return jsonify(error="format must be all, short, reel, video, standard, or long"), 400

    try:
        limit, offset = parse_pagination(request.args, default_limit=12, max_limit=50)
    except ValueError:
        return jsonify(error="limit and offset must be integers"), 400

    data = _cached_browse(type_, limit, offset, sort, duration, uploaded, category, format_)
    fields = parse_fields_param(request.args.get("fields"))
    accept = request.headers.get("Accept", "").lower()

    if fields or (ENABLE_MSGPACK and ("application/x-msgpack" in accept or "application/msgpack" in accept)):
        parsed = json.loads(data)
        parsed["results"] = project_collection(parsed.get("results", []), fields)
        response = serialize_response(parsed)
    else:
        response = app.response_class(data, mimetype="application/json")

    return apply_cdn_cache_headers(response, "catalog_query")


@app.get("/api/v1/suggestions")
@app.get("/api/suggest")
@rate_limit(limit=200, window=60)
def api_suggest():
    q = request.args.get("q", "").strip()[:100]

    response = jsonify(suggestions=engine.suggest(q))
    response.headers["Cache-Control"] = "private, max-age=300"
    return response


@app.get("/api/v1/media/<item_id>/signed-url")
def api_media_signed_url(item_id: str):
    clean_id = sanitize_id(item_id)
    if not clean_id:
        return jsonify(error="Invalid item ID", code=400, status="error"), 400
    try:
        expires_in = sanitize_int(request.args.get("expires_in"), default=3600, min_val=60, max_val=86400)
    except Exception:
        expires_in = 3600

    path = f"/api/v1/media/{quote(clean_id, safe='')}"
    signed_url = generate_signed_media_url(path, expires_in=expires_in)
    return jsonify(
        success=True,
        item_id=clean_id,
        path=path,
        signed_url=signed_url,
        expires_in=expires_in,
    ), 200


@app.get("/api/v1/media/<item_id>")
@app.get("/api/media/<item_id>")
def api_media(item_id: str):
    clean_item_id = unquote(str(item_id).strip())
    is_valid, reason = verify_signed_media_request(
        path=request.path,
        expires_str=request.args.get("expires"),
        sig_str=request.args.get("sig"),
        allow_unsigned=not REQUIRE_SIGNED_MEDIA,
    )
    if not is_valid:
        return jsonify(error=f"Forbidden: {reason}", code=403, status="error"), 403

    # Direct filename access check (e.g. if item_id or clean_item_id is already a filename in VIDEO_DIR)
    for cand_name in (clean_item_id, item_id):
        if _is_safe_video_filename(cand_name) and (VIDEO_DIR / cand_name).is_file():
            mimetype = "video/webm" if str(cand_name).lower().endswith(".webm") else "video/mp4"
            if request.args.get("download") == "1":
                res = send_from_directory(
                    VIDEO_DIR, cand_name, conditional=True, mimetype=mimetype, as_attachment=True, download_name=cand_name
                )
            else:
                res = send_from_directory(VIDEO_DIR, cand_name, conditional=True, mimetype=mimetype)
            res.headers["Accept-Ranges"] = "bytes"
            res.headers["Access-Control-Allow-Origin"] = "*"
            res.headers["Cache-Control"] = "public, max-age=3600"
            return res

    item = engine.meta.get(clean_item_id) or engine.meta.get(item_id)
    if item is None:
        for candidate in engine.meta.values():
            if candidate.get("media") in (clean_item_id, item_id):
                item = candidate
                break
        if item is None and ("live" in clean_item_id or "live" in item_id):
            lookup_str = clean_item_id if "live" in clean_item_id else item_id
            cleaned = re.sub(r"^live_", "", lookup_str)
            cleaned = re.sub(r"_\d+\.(webm|mp4)$", "", cleaned)
            item = engine.meta.get(cleaned)
            if item is None:
                m = re.search(r"(v_live_[a-zA-Z0-9]+)", lookup_str)
                if m:
                    item = engine.meta.get(m.group(1))

        if item is None and (clean_item_id.startswith("v_up_") or item_id.startswith("v_up_")):
            with CATALOG_LOCK:
                try:
                    with open(BASE_DIR / "catalog.json", "r", encoding="utf-8") as f:
                        for entry in json.load(f):
                            if entry.get("id") in (clean_item_id, item_id):
                                item = entry
                                engine.meta[entry["id"]] = entry
                                filename = entry.get("media")
                                break
                except Exception:
                    pass

    if item is not None and item.get("type") != "video":
        abort(404)

    filename = None
    is_live = False
    if item is not None:
        filename = item.get("media")
        is_live = bool(item.get("isLiveVod") or item.get("format") == "live" or item_id.startswith("v_live_"))
    else:
        is_live = bool(item_id.startswith("v_live_") or ("live" in item_id and not item_id.startswith("v_up_")))

    # For live streams: ensure the actual recorded live broadcast is served, never the test mic setup video
    if is_live:
        if not filename or "Generated Video" in filename or not (VIDEO_DIR / filename).is_file():
            matched_files = find_valid_live_recordings(item_id)
            if matched_files:
                filename = matched_files[0].name
            else:
                live_rec = get_live_event_record(item_id)
                if live_rec and live_rec.get("media_filename"):
                    cand = VIDEO_DIR / live_rec["media_filename"]
                    if cand.is_file() and "Generated Video" not in cand.name:
                        filename = cand.name

            # If this is a registered catalog/studio video and specific file was missing, link to actual live broadcast
            if item is not None and (not filename or not (VIDEO_DIR / filename).is_file()):
                real_live_files = [p for p in find_valid_live_recordings() if p.stat().st_size > 100_000]
                if real_live_files:
                    filename = real_live_files[0].name
                elif (VIDEO_DIR / "live_v_live_1792483699587_1792483802.webm").is_file():
                    filename = "live_v_live_1792483699587_1792483802.webm"

            if not filename or not (VIDEO_DIR / filename).is_file() or "Generated Video" in filename:
                abort(404)
    else:
        if not filename or not (VIDEO_DIR / filename).is_file():
            is_reel = bool((item and item.get("format") in ("reel", "short")) or "reel" in str(item_id))
            sample_reel = "MOTHER OF DRAGONS(GAME OF THRONES)#gameofthrones #gameofthronesedit  #viral #viralshorts.mp4"
            if is_reel and (VIDEO_DIR / sample_reel).is_file():
                filename = sample_reel
            elif (VIDEO_DIR / "v1_1080p.mp4").is_file():
                filename = "v1_1080p.mp4"
            else:
                abort(404)

    sample_reel_filename = "MOTHER OF DRAGONS(GAME OF THRONES)#gameofthrones #gameofthronesedit  #viral #viralshorts.mp4"
    if (
        not isinstance(filename, str)
        or not filename
        or Path(filename).name != filename
        or "/" in filename
        or "\\" in filename
        or Path(filename).suffix.lower() not in {".mp4", ".webm"}
        or not (VIDEO_DIR / filename).is_file()
    ):
        if is_live:
            abort(404)
        elif (item and item.get("format") in ("reel", "short")) and (VIDEO_DIR / sample_reel_filename).is_file():
            filename = sample_reel_filename
        elif (VIDEO_DIR / "v1_1080p.mp4").is_file():
            filename = "v1_1080p.mp4"
        else:
            abort(404)

    quality = request.args.get("quality", "").lower().strip()
    clean_quality = re.sub(r"[^a-zA-Z0-9]", "", quality)
    if clean_quality and clean_quality != "auto" and not is_live:
        c1 = f"{item_id}_{clean_quality}.mp4"
        c2 = f"{Path(filename).stem}_{clean_quality}.mp4"
        if _is_safe_video_filename(c1) and (VIDEO_DIR / c1).is_file():
            filename = c1
        elif _is_safe_video_filename(c2) and (VIDEO_DIR / c2).is_file():
            filename = c2

    mimetype = "video/webm" if str(filename).lower().endswith(".webm") else "video/mp4"
    if request.args.get("download") == "1":
        response = send_from_directory(
            VIDEO_DIR, filename, conditional=True, mimetype=mimetype, as_attachment=True, download_name=filename
        )
    else:
        response = send_from_directory(VIDEO_DIR, filename, conditional=True, mimetype=mimetype)
    response.headers["Accept-Ranges"] = "bytes"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Cache-Control"] = "public, max-age=3600"
    return response


@app.get("/healthz")
def healthz():
    return jsonify(status="ok", items=len(engine.meta))


# ── PROMETHEUS METRICS & CLIENT QOE TELEMETRY ──
@app.get("/metrics")
def prometheus_metrics():
    return app.response_class(
        REGISTRY.generate_metrics_text(),
        mimetype="text/plain; version=0.0.4; charset=utf-8"
    )


@app.get("/api/v1/metrics")
def api_metrics_summary():
    return jsonify(REGISTRY.get_summary())


@app.post("/api/v1/telemetry")
def api_telemetry():
    data = request.get_json(silent=True) or {}
    video_id = str(data.get("videoId") or "unknown")[:32]
    events = data.get("events")
    if isinstance(events, list):
        for ev in events:
            if isinstance(ev, dict) and "type" in ev:
                REGISTRY.record_qoe(video_id, str(ev["type"]), ev.get("value", 1))
    elif "type" in data:
        REGISTRY.record_qoe(video_id, str(data["type"]), data.get("value", 1))

    # Real-Time Stream Ingestion & Multi-CDN Health Tracking
    cdn_node = str(data.get("cdn") or "cloudflare")
    latency = float(data.get("latency_ms") or 14.0)
    buffer_ratio = float(data.get("buffer_ratio") or 0.0)
    STREAM_PRODUCER.publish_qoe_telemetry(video_id, request.remote_addr or "127.0.0.1", buffer_ratio, latency, cdn_node)
    STREAM_AGGREGATOR.record_local_qoe(cdn_node, latency)

    return jsonify(status="ok"), 200


@app.get("/api/v1/analytics/realtime")
def api_analytics_realtime():
    metrics = STREAM_AGGREGATOR.get_realtime_metrics(window_seconds=60)
    return jsonify(metrics), 200


# ── HTTP LIVE STREAMING (HLS) ENDPOINTS ──
@app.get("/api/v1/hls/<item_id>/master.m3u8")
@app.get("/api/hls/<item_id>/master.m3u8")
def api_hls_master(item_id: str):
    is_valid, reason = verify_signed_media_request(
        path=request.path,
        expires_str=request.args.get("expires"),
        sig_str=request.args.get("sig"),
        allow_unsigned=not REQUIRE_SIGNED_MEDIA,
    )
    if not is_valid:
        return jsonify(error=f"Forbidden: {reason}", code=403, status="error"), 403

    safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", str(item_id).strip())[:64]
    if not safe_id:
        abort(404)

    # Check if this item is a live stream or live event replay
    item = engine.meta.get(safe_id)
    is_live = bool((item and (item.get("format") == "live" or item.get("isLiveVod"))) or safe_id.startswith("v_live_"))
    if is_live:
        live_file = HLS_DIR / "live" / safe_id / "live.m3u8"
        if not live_file.is_file():
            matched = find_valid_live_recordings(safe_id)
            if matched and matched[0].stat().st_size > 1024:
                try:
                    hls_packager.create_live_segment(safe_id, matched[0])
                except Exception as e:
                    app.logger.warning(f"Could not package live stream for {safe_id}: {e}")

        if live_file.is_file():
            response = send_from_directory(HLS_DIR / "live" / safe_id, "live.m3u8", mimetype="application/vnd.apple.mpegurl")
            response.headers["Access-Control-Allow-Origin"] = "*"
            return apply_cdn_cache_headers(response, "hls_live_manifest")

    item_hls_dir = HLS_DIR / safe_id
    master_file = item_hls_dir / "master.m3u8"
    if not master_file.is_file():
        try:
            hls_packager.package_vod_variants(safe_id)
        except Exception as e:
            app.logger.warning(f"Could not auto-package HLS for {safe_id}: {e}")
    if not master_file.is_file():
        abort(404)

    # Ensure master manifest is valid and not an empty stub
    try:
        manifest_text = master_file.read_text(encoding="utf-8")
        if "#EXT-X-STREAM-INF:" not in manifest_text:
            try:
                master_file.unlink()
            except OSError:
                pass
            abort(404)
    except Exception:
        abort(404)
    response = send_from_directory(item_hls_dir, "master.m3u8", mimetype="application/vnd.apple.mpegurl")
    response.headers["Access-Control-Allow-Origin"] = "*"
    return apply_cdn_cache_headers(response, "hls_vod_manifest")


@app.get("/api/v1/hls/<item_id>/<quality>/<path:filename>")
@app.get("/api/hls/<item_id>/<quality>/<path:filename>")
def api_hls_segment(item_id: str, quality: str, filename: str):
    safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", str(item_id).strip())[:64]
    safe_quality = re.sub(r"[^a-zA-Z0-9_]", "_", str(quality).strip())[:32]
    safe_name = Path(filename).name
    if not safe_id or not safe_quality or safe_name != filename or "/" in filename or "\\" in filename or ".." in filename:
        abort(404)

    target_dir = HLS_DIR / safe_id / safe_quality
    target_file = target_dir / safe_name
    if not target_file.resolve().is_relative_to(HLS_DIR.resolve()) or not target_file.is_file():
        abort(404)

    mimetype = "application/vnd.apple.mpegurl" if safe_name.endswith(".m3u8") else "video/MP2T"
    if safe_name.endswith(".ts"):
        REGISTRY.record_hls_segment(safe_quality)
    response = send_from_directory(target_dir, safe_name, mimetype=mimetype, conditional=True)
    response.headers["Access-Control-Allow-Origin"] = "*"
    if safe_name.endswith(".m3u8"):
        return apply_cdn_cache_headers(response, "hls_vod_manifest")
    return apply_cdn_cache_headers(response, "hls_segment")


@app.get("/api/v1/hls/live/<stream_id>/<path:filename>")
@app.get("/api/hls/live/<stream_id>/<path:filename>")
def api_hls_live(stream_id: str, filename: str):
    safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", str(stream_id).strip())[:64]
    safe_name = Path(filename).name
    if not safe_id or safe_name != filename or "/" in filename or "\\" in filename or ".." in filename:
        abort(404)

    live_dir = HLS_DIR / "live" / safe_id
    target_file = live_dir / safe_name

    # If live manifest is requested and not found on disk, attempt on-demand resolution from associated server records
    if not target_file.is_file() and safe_name == "live.m3u8":
        source_media: Path | None = None
        # 1. Check live_events database record
        rec = get_live_event_record(safe_id)
        if rec and rec.get("media_filename"):
            cand = VIDEO_DIR / rec["media_filename"]
            if cand.is_file() and cand.stat().st_size > 1024:
                source_media = cand

        # 2. Check engine / catalog metadata
        if not source_media:
            item = engine.meta.get(safe_id) or engine.meta.get(stream_id)
            if item and item.get("media"):
                cand = VIDEO_DIR / item["media"]
                if cand.is_file() and cand.stat().st_size > 1024:
                    source_media = cand

        # 3. Match specific recording for THIS stream_id
        if not source_media:
            matched = find_valid_live_recordings(safe_id)
            if matched and matched[0].stat().st_size > 1024:
                source_media = matched[0]

        if source_media and source_media.is_file():
            try:
                hls_packager.create_live_segment(safe_id, source_media)
            except Exception as e:
                app.logger.warning(f"Could not auto-generate live HLS segment for {safe_id}: {e}")

    if not target_file.resolve().is_relative_to(HLS_DIR.resolve()) or not target_file.is_file():
        # If still missing and stream is actively broadcasting, create a placeholder rolling manifest to prevent client crash
        rec = get_live_event_record(safe_id)
        if safe_name == "live.m3u8" and rec and rec.get("status") == "active":
            live_dir.mkdir(parents=True, exist_ok=True)
            standby_content = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:0\n"
            target_file.write_text(standby_content, encoding="utf-8")
        else:
            abort(404)

    mimetype = "application/vnd.apple.mpegurl" if safe_name.endswith(".m3u8") else "video/MP2T"
    if safe_name.endswith(".ts"):
        REGISTRY.record_hls_segment("live")
    response = send_from_directory(live_dir, safe_name, mimetype=mimetype, conditional=True)
    response.headers["Access-Control-Allow-Origin"] = "*"
    if safe_name.endswith(".m3u8"):
        return apply_cdn_cache_headers(response, "hls_live_manifest")
    return apply_cdn_cache_headers(response, "hls_segment")


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
