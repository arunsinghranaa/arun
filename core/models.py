"""SQLAlchemy Models and Database Schema for Watchbloom Authentication & User Personalization.
Defines User model with Gmail and Mobile contact fields, password hashing,
Flask-Login UserMixin compatibility, and private personalized collections
(saved videos, watch history, liked videos) for strict user data isolation.
"""

from datetime import datetime, timezone
import re
from typing import Any
import uuid

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

from core.auth import Role, get_permissions_for_role

db = SQLAlchemy()


def ensure_database_schema(db_instance: SQLAlchemy) -> None:
    """Ensure newly added columns and tables exist in the SQLite database without requiring full migration tools."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(db_instance.engine)
        if inspector.has_table("users"):
            columns = [col["name"] for col in inspector.get_columns("users")]
            with db_instance.engine.connect() as conn:
                if "is_email_verified" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT 0"))
                if "is_mobile_verified" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_mobile_verified BOOLEAN DEFAULT 0"))
                if "version_id" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN version_id INTEGER DEFAULT 1"))
                conn.commit()
    except Exception:
        pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(db.Model, UserMixin):  # type: ignore[name-defined]
    """User account model for authentication, creator channels, and viewer profiles."""

    __tablename__ = "users"

    id: Any = db.Column(db.String(64), primary_key=True, default=lambda: f"usr_{uuid.uuid4().hex[:12]}")
    username: Any = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email: Any = db.Column(db.String(120), unique=True, nullable=False, index=True)  # Primary Gmail / email
    mobile: Any = db.Column(db.String(30), nullable=True, index=True)  # Mobile contact
    password_hash: Any = db.Column(db.String(255), nullable=False)
    role: Any = db.Column(db.String(32), default=Role.VIEWER, nullable=False)
    handle: Any = db.Column(db.String(60), nullable=True)
    bio: Any = db.Column(db.String(255), nullable=True, default="")
    photo: Any = db.Column(db.Text, nullable=True, default="")
    banner: Any = db.Column(db.Text, nullable=True, default="")
    is_email_verified: Any = db.Column(db.Boolean, default=False, nullable=False)
    is_mobile_verified: Any = db.Column(db.Boolean, default=False, nullable=False)
    version_id: Any = db.Column(db.Integer, default=1, nullable=False)
    created_at: Any = db.Column(db.DateTime, default=utc_now)
    updated_at: Any = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    __mapper_args__ = {"version_id_col": version_id}

    # Relationships to user-private data
    saved_videos = db.relationship("UserSavedVideo", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    watch_history = db.relationship("UserWatchHistory", backref="user", lazy="dynamic", cascade="all, delete-orphan")
    liked_videos = db.relationship("UserLikedVideo", backref="user", lazy="dynamic", cascade="all, delete-orphan")

    def __init__(
        self,
        id: str | None = None,
        username: str | None = None,
        email: str | None = None,
        mobile: str | None = None,
        password_hash: str | None = None,
        role: str = Role.VIEWER,
        handle: str | None = None,
        bio: str | None = None,
        photo: str | None = None,
        banner: str | None = None,
        is_email_verified: bool = False,
        is_mobile_verified: bool = False,
        version_id: int = 1,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if username is not None:
            self.username = username
        if email is not None:
            self.email = email
        if mobile is not None:
            self.mobile = mobile
        if password_hash is not None:
            self.password_hash = password_hash
        self.role = role
        if handle is not None:
            self.handle = handle
        if bio is not None:
            self.bio = bio
        if photo is not None:
            self.photo = photo
        if banner is not None:
            self.banner = banner
        self.is_email_verified = is_email_verified
        self.is_mobile_verified = is_mobile_verified
        self.version_id = version_id
        if created_at is not None:
            self.created_at = created_at
        if updated_at is not None:
            self.updated_at = updated_at

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role})>"

    def set_password(self, password: str) -> None:
        """Securely hash and store password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify plain password against stored cryptographic hash."""
        if not self.password_hash or not password:
            return False
        return check_password_hash(self.password_hash, password)

    def get_id(self) -> str:
        """Return unique user ID string required by Flask-Login."""
        return str(self.id)

    def to_dict(self, include_private: bool = False) -> dict[str, Any]:
        """Convert user model to serialized dictionary for APIs."""
        payload: dict[str, Any] = {
            "id": self.id,
            "username": self.username,
            "name": self.username,
            "role": self.role,
            "handle": self.handle or f"@{self.username.lower().replace(' ', '_')}",
            "bio": self.bio or "",
            "photo": self.photo or "",
            "banner": self.banner or "",
            "permissions": get_permissions_for_role(self.role),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_private:
            payload["email"] = self.email
            payload["mobile"] = self.mobile or ""
            payload["is_email_verified"] = bool(self.is_email_verified)
            payload["is_mobile_verified"] = bool(self.is_mobile_verified)
        return payload

    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate Gmail or standard email address format."""
        if not email or not isinstance(email, str):
            return False
        clean = email.strip().lower()
        return bool(re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", clean))

    @staticmethod
    def validate_mobile(mobile: str) -> bool:
        """Validate mobile contact phone number format."""
        if not mobile or not isinstance(mobile, str):
            return False
        digits = re.sub(r"[^\d]", "", mobile)
        return 7 <= len(digits) <= 15


class UserSavedVideo(db.Model):  # type: ignore[name-defined]
    """Personalized saved videos (Watch Later / Playlists) per user account."""

    __tablename__ = "user_saved_videos"

    id: Any = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id: Any = db.Column(db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id: Any = db.Column(db.String(64), nullable=False, index=True)
    created_at: Any = db.Column(db.DateTime, default=utc_now)

    __table_args__ = (db.UniqueConstraint("user_id", "item_id", name="uq_user_saved_item"),)

    def __init__(
        self,
        id: int | None = None,
        user_id: str | None = None,
        item_id: str | None = None,
        created_at: datetime | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if user_id is not None:
            self.user_id = user_id
        if item_id is not None:
            self.item_id = item_id
        if created_at is not None:
            self.created_at = created_at


class UserWatchHistory(db.Model):  # type: ignore[name-defined]
    """Personalized watch history per user account."""

    __tablename__ = "user_watch_history"

    id: Any = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id: Any = db.Column(db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id: Any = db.Column(db.String(64), nullable=False, index=True)
    viewed_at: Any = db.Column(db.DateTime, default=utc_now)

    __table_args__ = (db.UniqueConstraint("user_id", "item_id", name="uq_user_history_item"),)

    def __init__(
        self,
        id: int | None = None,
        user_id: str | None = None,
        item_id: str | None = None,
        viewed_at: datetime | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if user_id is not None:
            self.user_id = user_id
        if item_id is not None:
            self.item_id = item_id
        if viewed_at is not None:
            self.viewed_at = viewed_at


class UserLikedVideo(db.Model):  # type: ignore[name-defined]
    """Personalized liked videos per user account."""

    __tablename__ = "user_liked_videos"

    id: Any = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id: Any = db.Column(db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id: Any = db.Column(db.String(64), nullable=False, index=True)
    created_at: Any = db.Column(db.DateTime, default=utc_now)

    __table_args__ = (db.UniqueConstraint("user_id", "item_id", name="uq_user_liked_item"),)

    def __init__(
        self,
        id: int | None = None,
        user_id: str | None = None,
        item_id: str | None = None,
        created_at: datetime | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if user_id is not None:
            self.user_id = user_id
        if item_id is not None:
            self.item_id = item_id
        if created_at is not None:
            self.created_at = created_at


class OTPVerification(db.Model):  # type: ignore[name-defined]
    """Stores real-time 6-digit OTP verification challenges for Sign Up and Sign In.
    Guarantees user accounts are only committed to the database after OTP is validated.
    """

    __tablename__ = "otp_verifications"

    id: Any = db.Column(db.String(64), primary_key=True, default=lambda: f"otp_{uuid.uuid4().hex[:16]}")
    target: Any = db.Column(db.String(120), nullable=False, index=True)        # Gmail address or Mobile number
    target_type: Any = db.Column(db.String(20), nullable=False)                # "email" or "mobile"
    purpose: Any = db.Column(db.String(30), nullable=False)                    # "signup", "signin"
    otp_hash: Any = db.Column(db.String(255), nullable=False)                  # Cryptographic hash of the 6-digit OTP
    attempts: Any = db.Column(db.Integer, default=0, nullable=False)
    max_attempts: Any = db.Column(db.Integer, default=5, nullable=False)
    is_verified: Any = db.Column(db.Boolean, default=False, nullable=False)
    payload_json: Any = db.Column(db.Text, nullable=True)                      # Pending registration data awaiting OTP
    created_at: Any = db.Column(db.DateTime, default=utc_now, nullable=False)
    expires_at: Any = db.Column(db.DateTime, nullable=False)

    def __init__(
        self,
        id: str | None = None,
        target: str | None = None,
        target_type: str | None = None,
        purpose: str | None = None,
        otp_hash: str | None = None,
        attempts: int = 0,
        max_attempts: int = 5,
        is_verified: bool = False,
        payload_json: str | None = None,
        created_at: datetime | None = None,
        expires_at: datetime | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if target is not None:
            self.target = target
        if target_type is not None:
            self.target_type = target_type
        if purpose is not None:
            self.purpose = purpose
        if otp_hash is not None:
            self.otp_hash = otp_hash
        self.attempts = attempts
        self.max_attempts = max_attempts
        self.is_verified = is_verified
        if payload_json is not None:
            self.payload_json = payload_json
        if created_at is not None:
            self.created_at = created_at
        if expires_at is not None:
            self.expires_at = expires_at

    def is_expired(self) -> bool:
        """Check whether the verification token has expired."""
        now = datetime.now(timezone.utc)
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return now > exp

    def verify_code(self, plain_code: str) -> tuple[bool, str]:
        """Validate candidate 6-digit OTP code against secure cryptographic hash."""
        if self.is_verified:
            return False, "This verification code has already been used."
        if self.is_expired():
            return False, "Verification code has expired. Please request a new code."
        if self.attempts >= self.max_attempts:
            return False, "Maximum verification attempts exceeded. Code invalidated. Request a new code."

        self.attempts += 1
        clean_code = str(plain_code).strip()
        if not check_password_hash(self.otp_hash, clean_code):
            remaining = max(0, self.max_attempts - self.attempts)
            return False, f"Incorrect verification code. {remaining} attempt(s) remaining."

        self.is_verified = True
        return True, "Verification successful."

    def to_dict(self) -> dict[str, Any]:
        """Return safe client representation of the challenge."""
        return {
            "session_id": self.id,
            "target": self.target,
            "target_type": self.target_type,
            "purpose": self.purpose,
            "is_verified": self.is_verified,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }


class VideoMetadata(db.Model):  # type: ignore[name-defined]
    """Video metadata model protected by SQLAlchemy Optimistic Locking (version_id)."""

    __tablename__ = "videos_metadata"

    id: Any = db.Column(db.String(64), primary_key=True)
    title: Any = db.Column(db.String(255), nullable=False)
    author: Any = db.Column(db.String(100), nullable=False)
    description: Any = db.Column(db.Text, default="")
    category: Any = db.Column(db.String(50), default="entertainment")
    views: Any = db.Column(db.BigInteger, default=0)
    version_id: Any = db.Column(db.Integer, default=1, nullable=False)
    created_at: Any = db.Column(db.DateTime, default=utc_now)
    updated_at: Any = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    __mapper_args__ = {"version_id_col": version_id}

    def __init__(
        self,
        id: str | None = None,
        title: str = "",
        author: str = "Watchbloom",
        description: str = "",
        category: str = "entertainment",
        views: int = 0,
        version_id: int = 1,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        self.title = title
        self.author = author
        self.description = description
        self.category = category
        self.views = views
        self.version_id = version_id
        if created_at is not None:
            self.created_at = created_at
        if updated_at is not None:
            self.updated_at = updated_at



