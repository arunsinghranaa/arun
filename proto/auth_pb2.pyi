from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class LoginRequest(_message.Message):
    __slots__ = ("username", "password", "role")
    USERNAME_FIELD_NUMBER: _ClassVar[int]
    PASSWORD_FIELD_NUMBER: _ClassVar[int]
    ROLE_FIELD_NUMBER: _ClassVar[int]
    username: str
    password: str
    role: str
    def __init__(self, username: _Optional[str] = ..., password: _Optional[str] = ..., role: _Optional[str] = ...) -> None: ...

class RegisterRequest(_message.Message):
    __slots__ = ("username", "password", "role")
    USERNAME_FIELD_NUMBER: _ClassVar[int]
    PASSWORD_FIELD_NUMBER: _ClassVar[int]
    ROLE_FIELD_NUMBER: _ClassVar[int]
    username: str
    password: str
    role: str
    def __init__(self, username: _Optional[str] = ..., password: _Optional[str] = ..., role: _Optional[str] = ...) -> None: ...

class VerifyRequest(_message.Message):
    __slots__ = ("token",)
    TOKEN_FIELD_NUMBER: _ClassVar[int]
    token: str
    def __init__(self, token: _Optional[str] = ...) -> None: ...

class RevokeRequest(_message.Message):
    __slots__ = ("token",)
    TOKEN_FIELD_NUMBER: _ClassVar[int]
    token: str
    def __init__(self, token: _Optional[str] = ...) -> None: ...

class ProfileRequest(_message.Message):
    __slots__ = ("token",)
    TOKEN_FIELD_NUMBER: _ClassVar[int]
    token: str
    def __init__(self, token: _Optional[str] = ...) -> None: ...

class AuthResponse(_message.Message):
    __slots__ = ("success", "token", "token_type", "expires_in", "user", "error")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    TOKEN_FIELD_NUMBER: _ClassVar[int]
    TOKEN_TYPE_FIELD_NUMBER: _ClassVar[int]
    EXPIRES_IN_FIELD_NUMBER: _ClassVar[int]
    USER_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    success: bool
    token: str
    token_type: str
    expires_in: int
    user: User
    error: str
    def __init__(self, success: _Optional[bool] = ..., token: _Optional[str] = ..., token_type: _Optional[str] = ..., expires_in: _Optional[int] = ..., user: _Optional[_Union[User, _Mapping]] = ..., error: _Optional[str] = ...) -> None: ...

class VerifyResponse(_message.Message):
    __slots__ = ("valid", "user", "error")
    VALID_FIELD_NUMBER: _ClassVar[int]
    USER_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    valid: bool
    user: User
    error: str
    def __init__(self, valid: _Optional[bool] = ..., user: _Optional[_Union[User, _Mapping]] = ..., error: _Optional[str] = ...) -> None: ...

class RevokeResponse(_message.Message):
    __slots__ = ("success", "message")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    success: bool
    message: str
    def __init__(self, success: _Optional[bool] = ..., message: _Optional[str] = ...) -> None: ...

class ProfileResponse(_message.Message):
    __slots__ = ("authenticated", "user", "error")
    AUTHENTICATED_FIELD_NUMBER: _ClassVar[int]
    USER_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    authenticated: bool
    user: User
    error: str
    def __init__(self, authenticated: _Optional[bool] = ..., user: _Optional[_Union[User, _Mapping]] = ..., error: _Optional[str] = ...) -> None: ...

class User(_message.Message):
    __slots__ = ("id", "username", "role", "permissions")
    ID_FIELD_NUMBER: _ClassVar[int]
    USERNAME_FIELD_NUMBER: _ClassVar[int]
    ROLE_FIELD_NUMBER: _ClassVar[int]
    PERMISSIONS_FIELD_NUMBER: _ClassVar[int]
    id: str
    username: str
    role: str
    permissions: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, id: _Optional[str] = ..., username: _Optional[str] = ..., role: _Optional[str] = ..., permissions: _Optional[_Iterable[str]] = ...) -> None: ...

class UserSettings(_message.Message):
    __slots__ = ("user_id", "profile_visibility", "show_subscriptions", "show_liked_videos", "search_indexing", "default_quality", "autoplay", "ambient_mode", "default_playback_rate", "captions_enabled", "captions_language", "email_notifications", "subscriber_alerts", "recommendation_alerts", "security_alerts", "updated_at")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    PROFILE_VISIBILITY_FIELD_NUMBER: _ClassVar[int]
    SHOW_SUBSCRIPTIONS_FIELD_NUMBER: _ClassVar[int]
    SHOW_LIKED_VIDEOS_FIELD_NUMBER: _ClassVar[int]
    SEARCH_INDEXING_FIELD_NUMBER: _ClassVar[int]
    DEFAULT_QUALITY_FIELD_NUMBER: _ClassVar[int]
    AUTOPLAY_FIELD_NUMBER: _ClassVar[int]
    AMBIENT_MODE_FIELD_NUMBER: _ClassVar[int]
    DEFAULT_PLAYBACK_RATE_FIELD_NUMBER: _ClassVar[int]
    CAPTIONS_ENABLED_FIELD_NUMBER: _ClassVar[int]
    CAPTIONS_LANGUAGE_FIELD_NUMBER: _ClassVar[int]
    EMAIL_NOTIFICATIONS_FIELD_NUMBER: _ClassVar[int]
    SUBSCRIBER_ALERTS_FIELD_NUMBER: _ClassVar[int]
    RECOMMENDATION_ALERTS_FIELD_NUMBER: _ClassVar[int]
    SECURITY_ALERTS_FIELD_NUMBER: _ClassVar[int]
    UPDATED_AT_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    profile_visibility: str
    show_subscriptions: bool
    show_liked_videos: bool
    search_indexing: bool
    default_quality: str
    autoplay: bool
    ambient_mode: bool
    default_playback_rate: float
    captions_enabled: bool
    captions_language: str
    email_notifications: bool
    subscriber_alerts: bool
    recommendation_alerts: bool
    security_alerts: bool
    updated_at: str
    def __init__(self, user_id: _Optional[str] = ..., profile_visibility: _Optional[str] = ..., show_subscriptions: _Optional[bool] = ..., show_liked_videos: _Optional[bool] = ..., search_indexing: _Optional[bool] = ..., default_quality: _Optional[str] = ..., autoplay: _Optional[bool] = ..., ambient_mode: _Optional[bool] = ..., default_playback_rate: _Optional[float] = ..., captions_enabled: _Optional[bool] = ..., captions_language: _Optional[str] = ..., email_notifications: _Optional[bool] = ..., subscriber_alerts: _Optional[bool] = ..., recommendation_alerts: _Optional[bool] = ..., security_alerts: _Optional[bool] = ..., updated_at: _Optional[str] = ...) -> None: ...

class UserSettingsRequest(_message.Message):
    __slots__ = ("user_id",)
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    def __init__(self, user_id: _Optional[str] = ...) -> None: ...

class UpdateSettingsRequest(_message.Message):
    __slots__ = ("user_id", "settings")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    SETTINGS_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    settings: UserSettings
    def __init__(self, user_id: _Optional[str] = ..., settings: _Optional[_Union[UserSettings, _Mapping]] = ...) -> None: ...

class UserSettingsResponse(_message.Message):
    __slots__ = ("success", "settings", "error")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    SETTINGS_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    success: bool
    settings: UserSettings
    error: str
    def __init__(self, success: _Optional[bool] = ..., settings: _Optional[_Union[UserSettings, _Mapping]] = ..., error: _Optional[str] = ...) -> None: ...

class AbuseReportRequest(_message.Message):
    __slots__ = ("reporter_id", "target_type", "target_id", "reason_code", "description", "target_metadata")
    REPORTER_ID_FIELD_NUMBER: _ClassVar[int]
    TARGET_TYPE_FIELD_NUMBER: _ClassVar[int]
    TARGET_ID_FIELD_NUMBER: _ClassVar[int]
    REASON_CODE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    TARGET_METADATA_FIELD_NUMBER: _ClassVar[int]
    reporter_id: str
    target_type: str
    target_id: str
    reason_code: str
    description: str
    target_metadata: str
    def __init__(self, reporter_id: _Optional[str] = ..., target_type: _Optional[str] = ..., target_id: _Optional[str] = ..., reason_code: _Optional[str] = ..., description: _Optional[str] = ..., target_metadata: _Optional[str] = ...) -> None: ...

class AbuseReportResponse(_message.Message):
    __slots__ = ("success", "report_id", "status", "is_async", "message", "error")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    REPORT_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    IS_ASYNC_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    success: bool
    report_id: str
    status: str
    is_async: bool
    message: str
    error: str
    def __init__(self, success: _Optional[bool] = ..., report_id: _Optional[str] = ..., status: _Optional[str] = ..., is_async: _Optional[bool] = ..., message: _Optional[str] = ..., error: _Optional[str] = ...) -> None: ...

class SupportMailRequest(_message.Message):
    __slots__ = ("user_id", "sender_email", "subject", "category", "message")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    SENDER_EMAIL_FIELD_NUMBER: _ClassVar[int]
    SUBJECT_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    sender_email: str
    subject: str
    category: str
    message: str
    def __init__(self, user_id: _Optional[str] = ..., sender_email: _Optional[str] = ..., subject: _Optional[str] = ..., category: _Optional[str] = ..., message: _Optional[str] = ...) -> None: ...

class SupportMailResponse(_message.Message):
    __slots__ = ("success", "mail_id", "status", "is_async", "message", "error")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    MAIL_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    IS_ASYNC_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    success: bool
    mail_id: str
    status: str
    is_async: bool
    message: str
    error: str
    def __init__(self, success: _Optional[bool] = ..., mail_id: _Optional[str] = ..., status: _Optional[str] = ..., is_async: _Optional[bool] = ..., message: _Optional[str] = ..., error: _Optional[str] = ...) -> None: ...

class NotificationItem(_message.Message):
    __slots__ = ("id", "user_id", "title", "message", "type", "is_read", "metadata_json", "created_at")
    ID_FIELD_NUMBER: _ClassVar[int]
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    TYPE_FIELD_NUMBER: _ClassVar[int]
    IS_READ_FIELD_NUMBER: _ClassVar[int]
    METADATA_JSON_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    id: str
    user_id: str
    title: str
    message: str
    type: str
    is_read: bool
    metadata_json: str
    created_at: str
    def __init__(self, id: _Optional[str] = ..., user_id: _Optional[str] = ..., title: _Optional[str] = ..., message: _Optional[str] = ..., type: _Optional[str] = ..., is_read: _Optional[bool] = ..., metadata_json: _Optional[str] = ..., created_at: _Optional[str] = ...) -> None: ...

class NotificationLogsRequest(_message.Message):
    __slots__ = ("user_id", "limit", "offset", "unread_only")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    OFFSET_FIELD_NUMBER: _ClassVar[int]
    UNREAD_ONLY_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    limit: int
    offset: int
    unread_only: bool
    def __init__(self, user_id: _Optional[str] = ..., limit: _Optional[int] = ..., offset: _Optional[int] = ..., unread_only: _Optional[bool] = ...) -> None: ...

class NotificationLogsResponse(_message.Message):
    __slots__ = ("success", "notifications", "total", "unread_count")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    NOTIFICATIONS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    UNREAD_COUNT_FIELD_NUMBER: _ClassVar[int]
    success: bool
    notifications: _containers.RepeatedCompositeFieldContainer[NotificationItem]
    total: int
    unread_count: int
    def __init__(self, success: _Optional[bool] = ..., notifications: _Optional[_Iterable[_Union[NotificationItem, _Mapping]]] = ..., total: _Optional[int] = ..., unread_count: _Optional[int] = ...) -> None: ...

class MarkNotificationRequest(_message.Message):
    __slots__ = ("user_id", "notification_id")
    USER_ID_FIELD_NUMBER: _ClassVar[int]
    NOTIFICATION_ID_FIELD_NUMBER: _ClassVar[int]
    user_id: str
    notification_id: str
    def __init__(self, user_id: _Optional[str] = ..., notification_id: _Optional[str] = ...) -> None: ...

class MarkNotificationResponse(_message.Message):
    __slots__ = ("success", "message")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    success: bool
    message: str
    def __init__(self, success: _Optional[bool] = ..., message: _Optional[str] = ...) -> None: ...
