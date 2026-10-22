"""JSON Web Token (JWT) Authentication & Role-Based Access Control (RBAC) Module.
Provides secure token generation, cryptographic validation, role and permission
authorization decorators, token revocation blocklisting, and user credential management.
"""

from functools import wraps
import logging
import re
import threading
import time
from typing import Any, Iterable
import uuid

from flask import g, jsonify, request
import jwt
from werkzeug.security import check_password_hash, generate_password_hash

from config import JWT_ALGORITHM, JWT_EXPIRATION_SECONDS, JWT_SECRET
from core.cache import CACHE

logger = logging.getLogger("watchbloom.auth")


class Role:
    ADMIN = "admin"
    CREATOR = "creator"
    VIEWER = "viewer"
    USER = "user"  # Alias for viewer
    ANONYMOUS = "anonymous"


class Permission:
    VIDEO_READ = "video:read"
    VIDEO_CREATE = "video:create"
    VIDEO_UPDATE = "video:update"
    VIDEO_DELETE = "video:delete"
    VIDEO_DELETE_OWN = "video:delete_own"
    VIDEO_TRANSCODE = "video:transcode"
    REACTION_CREATE = "reaction:create"
    PLAYLIST_CREATE = "playlist:create"
    BUFFER_FLUSH = "buffer:flush"
    USER_MANAGE = "user:manage"
    SYSTEM_MANAGE = "system:manage"


# Mapping roles to fine-grained permission sets
ROLE_PERMISSIONS: dict[str, set[str]] = {
    Role.ADMIN: {
        Permission.VIDEO_READ,
        Permission.VIDEO_CREATE,
        Permission.VIDEO_UPDATE,
        Permission.VIDEO_DELETE,
        Permission.VIDEO_DELETE_OWN,
        Permission.VIDEO_TRANSCODE,
        Permission.REACTION_CREATE,
        Permission.PLAYLIST_CREATE,
        Permission.BUFFER_FLUSH,
        Permission.USER_MANAGE,
        Permission.SYSTEM_MANAGE,
    },
    Role.CREATOR: {
        Permission.VIDEO_READ,
        Permission.VIDEO_CREATE,
        Permission.VIDEO_UPDATE,
        Permission.VIDEO_DELETE_OWN,
        Permission.VIDEO_TRANSCODE,
        Permission.REACTION_CREATE,
        Permission.PLAYLIST_CREATE,
    },
    Role.VIEWER: {
        Permission.VIDEO_READ,
        Permission.REACTION_CREATE,
        Permission.PLAYLIST_CREATE,
    },
    Role.USER: {
        Permission.VIDEO_READ,
        Permission.REACTION_CREATE,
        Permission.PLAYLIST_CREATE,
    },
    Role.ANONYMOUS: {
        Permission.VIDEO_READ,
    },
}

# In-memory thread-safe user database for demo & runtime accounts
USER_LOCK = threading.Lock()
USERS: dict[str, dict[str, Any]] = {
    "admin": {
        "id": "usr_admin_01",
        "username": "admin",
        "password_hash": generate_password_hash("admin123"),
        "role": Role.ADMIN,
    },
    "creator": {
        "id": "usr_creator_01",
        "username": "creator",
        "password_hash": generate_password_hash("creator123"),
        "role": Role.CREATOR,
    },
    "viewer": {
        "id": "usr_viewer_01",
        "username": "viewer",
        "password_hash": generate_password_hash("viewer123"),
        "role": Role.VIEWER,
    },
}

# In-memory token revocation blocklist fallback: jti -> exp_time
REVOCATION_BLOCKLIST: dict[str, float] = {}
REVOCATION_LOCK = threading.Lock()


def get_permissions_for_role(role: str) -> list[str]:
    """Return list of permissions associated with a role."""
    clean_role = str(role).lower().strip()
    perms = ROLE_PERMISSIONS.get(clean_role, ROLE_PERMISSIONS[Role.ANONYMOUS])
    return sorted(list(perms))


def authenticate_user(username: str, password: str | None = None) -> dict[str, Any] | None:
    """Validate user credentials against SQLAlchemy database or runtime demo cache.
    Supports login via username, Gmail/email, or mobile contact.
    If password is None (dev/demo mode), returns user if exists.
    """
    clean_name = str(username).strip()
    if not clean_name:
        return None

    # 1. Query SQLAlchemy User model
    try:
        from core.models import User
        filter_expr = (User.username.ilike(clean_name)) | (User.email.ilike(clean_name))
        digits = re.sub(r"[^\d]", "", clean_name)
        if len(digits) >= 7:
            filter_expr = filter_expr | (User.mobile.like(f"%{digits[-10:]}%")) | (User.mobile == clean_name)
        else:
            filter_expr = filter_expr | (User.mobile == clean_name)

        db_user = User.query.filter(filter_expr).first()
        if db_user:
            if password is not None and not db_user.check_password(password):
                return None
            return db_user.to_dict(include_private=True)
    except Exception:
        pass

    # 2. Fallback to in-memory USERS table for demo and runtime accounts
    with USER_LOCK:
        user = USERS.get(clean_name.lower())
        if not user:
            # Check by id
            for u in USERS.values():
                if u.get("id") == clean_name:
                    user = u
                    break

        if not user:
            return None

        if password is not None:
            if not check_password_hash(user["password_hash"], password):
                return None

        return {
            "id": user["id"],
            "username": user["username"],
            "name": user["username"],
            "email": user.get("email", f"{user['username']}@gmail.com"),
            "mobile": user.get("mobile", ""),
            "role": user["role"],
            "permissions": get_permissions_for_role(user["role"]),
        }


def register_user(
    username: str,
    password: str,
    role: str = Role.VIEWER,
    email: str | None = None,
    mobile: str | None = None,
) -> dict[str, Any] | None:
    """Register a new user account with hashed password, Gmail, and mobile contact in SQLAlchemy."""
    clean_name = str(username).strip()
    clean_role = str(role).lower().strip()
    if clean_role not in (Role.ADMIN, Role.CREATOR, Role.VIEWER, Role.USER):
        clean_role = Role.VIEWER

    clean_email = str(email).strip().lower() if email else f"{clean_name.lower().replace(' ', '_')}@gmail.com"
    clean_mobile = str(mobile).strip() if mobile else None

    # 1. Persist to SQLAlchemy Database
    try:
        from core.models import User, db
        existing = User.query.filter(
            (User.username.ilike(clean_name)) | (User.email.ilike(clean_email))
        ).first()
        if existing:
            return None  # Conflict: Username or email already registered

        user_id = f"usr_{clean_role[:4]}_{uuid.uuid4().hex[:8]}"
        user = User(
            id=user_id,
            username=clean_name,
            email=clean_email,
            mobile=clean_mobile,
            role=clean_role,
            handle=f"@{clean_name.lower().replace(' ', '_')}",
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        # Synchronize into USERS dictionary for immediate in-process lookup
        with USER_LOCK:
            USERS[clean_name.lower()] = {
                "id": user_id,
                "username": clean_name,
                "email": clean_email,
                "mobile": clean_mobile or "",
                "password_hash": user.password_hash,
                "role": clean_role,
            }

        return user.to_dict(include_private=True)
    except Exception as err:
        logger.debug(f"Database registration fallback: {err}")

    # 2. Fallback to thread-safe in-memory USERS dict
    with USER_LOCK:
        if clean_name.lower() in USERS:
            return None  # Already exists

        user_id = f"usr_{clean_role[:4]}_{uuid.uuid4().hex[:8]}"
        new_user = {
            "id": user_id,
            "username": clean_name,
            "email": clean_email,
            "mobile": clean_mobile or "",
            "password_hash": generate_password_hash(password),
            "role": clean_role,
        }
        USERS[clean_name.lower()] = new_user
        return {
            "id": user_id,
            "username": clean_name,
            "name": clean_name,
            "email": clean_email,
            "mobile": clean_mobile or "",
            "role": clean_role,
            "permissions": get_permissions_for_role(clean_role),
        }


def is_token_revoked(jti: str) -> bool:
    """Check if token's unique jti identifier is in revocation blocklist."""
    if not jti:
        return False

    # 1. Check Redis blocklist if active
    if CACHE.is_redis_active and CACHE.redis:
        try:
            if CACHE.redis.exists(f"jwt_blocklist:{jti}"):
                return True
        except Exception:
            pass

    # 2. Check in-memory blocklist
    now = time.time()
    with REVOCATION_LOCK:
        exp = REVOCATION_BLOCKLIST.get(jti)
        if exp is not None:
            if now > exp:
                del REVOCATION_BLOCKLIST[jti]
                return False
            return True

    return False


def revoke_token(token: str) -> bool:
    """Revoke a JWT token by adding its jti to the blocklist until expiration."""
    payload = decode_token(token, verify_revocation=False)
    if not payload:
        return False

    jti = payload.get("jti")
    exp = payload.get("exp", int(time.time()) + 3600)
    now = time.time()
    ttl = max(1, int(exp - now))

    if jti:
        # Save to Redis
        if CACHE.is_redis_active and CACHE.redis:
            try:
                CACHE.redis.set(f"jwt_blocklist:{jti}", "revoked", ex=ttl)
            except Exception:
                pass

        # Save to in-memory blocklist
        with REVOCATION_LOCK:
            REVOCATION_BLOCKLIST[jti] = exp

        return True
    return False


def generate_token(
    user_id: str,
    username: str,
    role: str = Role.CREATOR,
    extra_claims: dict | None = None,
    expires_in: int = JWT_EXPIRATION_SECONDS,
) -> str:
    """Generate a signed HS256 JWT token with RBAC claims and unique jti."""
    now = int(time.time())
    clean_role = str(role).lower().strip()
    permissions = get_permissions_for_role(clean_role)

    payload = {
        "iss": "watchbloom-api",
        "sub": str(user_id),
        "id": str(user_id),
        "name": str(username),
        "username": str(username),
        "role": clean_role,
        "permissions": permissions,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + expires_in,
    }
    if extra_claims:
        payload.update(extra_claims)

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token if isinstance(token, str) else token.decode("utf-8")


def decode_token(token: str, verify_revocation: bool = True) -> dict | None:
    """Validate and decode a JWT token. Returns payload dict or None if invalid/expired/revoked."""
    if not token or not isinstance(token, str):
        return None
    try:
        payload = jwt.decode(
            token.strip(),
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "iat", "sub"]},
        )
        if verify_revocation:
            jti = payload.get("jti")
            if jti and is_token_revoked(jti):
                logger.info(f"Rejected revoked token jti={jti}")
                return None
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_token_from_request() -> str | None:
    """Extract token from Authorization header (Bearer), X-Auth-Token, or query param."""
    auth_header = request.headers.get("Authorization", "").strip()
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    x_token = request.headers.get("X-Auth-Token")
    if x_token:
        return x_token.strip()
    return request.args.get("token")


def has_permission(user: dict | None, permission: str) -> bool:
    """Check if user dictionary holds the specified permission."""
    if not user:
        return False
    role = user.get("role", Role.ANONYMOUS)
    if role == Role.ADMIN:
        return True
    user_perms = user.get("permissions")
    if user_perms and permission in user_perms:
        return True
    return permission in ROLE_PERMISSIONS.get(role, set())


def has_role(user: dict | None, allowed_roles: Iterable[str]) -> bool:
    """Check if user holds one of the allowed roles."""
    if not user:
        return False
    user_role = str(user.get("role", "")).lower().strip()
    clean_allowed = [str(r).lower().strip() for r in allowed_roles]
    return user_role in clean_allowed or user_role == Role.ADMIN


def is_owner_or_admin(user: dict | None, author_name_or_id: str | None) -> bool:
    """Check if current user is admin or matches the resource owner."""
    if not user:
        return False
    if user.get("role") == Role.ADMIN:
        return True
    if not author_name_or_id:
        return True
    uid = str(user.get("sub") or user.get("id") or "")
    uname = str(user.get("name") or user.get("username") or "")
    author = str(author_name_or_id).strip()
    return uid == author or uname.lower() == author.lower()


def require_jwt(
    roles: list[str] | tuple[str, ...] | None = None,
    permissions: list[str] | tuple[str, ...] | None = None,
    optional: bool = False,
):
    """Enforce JWT authentication with Role-Based Access Control and fine-grained permissions."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            token = get_token_from_request()
            payload = decode_token(token) if token else None

            # Fallback to active Flask-Login session if no Bearer token was supplied
            if token is None and not payload:
                try:
                    from flask_login import current_user
                    if current_user and current_user.is_authenticated:
                        role = getattr(current_user, "role", Role.VIEWER)
                        payload = {
                            "sub": str(current_user.id),
                            "id": str(current_user.id),
                            "name": str(getattr(current_user, "username", "")),
                            "username": str(getattr(current_user, "username", "")),
                            "email": getattr(current_user, "email", ""),
                            "mobile": getattr(current_user, "mobile", ""),
                            "role": role,
                            "permissions": get_permissions_for_role(role),
                        }
                except Exception:
                    pass

            if not payload:
                if optional:
                    g.current_user = None
                    return fn(*args, **kwargs)
                return jsonify(
                    error="Unauthorized: Valid authentication session or JWT Bearer token required.",
                    code=401,
                ), 401

            # Validate Role if specified
            if roles and not has_role(payload, roles):
                return jsonify(
                    error="Forbidden: Insufficient role privileges for this resource.",
                    code=403,
                    required_roles=list(roles),
                    current_role=payload.get("role"),
                ), 403

            # Validate Permissions if specified
            if permissions:
                missing = [p for p in permissions if not has_permission(payload, p)]
                if missing:
                    return jsonify(
                        error="Forbidden: Missing required permissions for this action.",
                        code=403,
                        missing_permissions=missing,
                    ), 403

            g.current_user = payload
            return fn(*args, **kwargs)

        return wrapper
    return decorator


def require_role(*roles: str):
    """Shorthand decorator to require specific roles."""
    return require_jwt(roles=roles)


def require_permission(*permissions: str):
    """Shorthand decorator to require specific fine-grained permissions."""
    return require_jwt(permissions=permissions)
