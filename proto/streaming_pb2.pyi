from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable
from typing import ClassVar as _ClassVar, Optional as _Optional

DESCRIPTOR: _descriptor.FileDescriptor

class SignedUrlRequest(_message.Message):
    __slots__ = ("path", "expires_in", "visitor_id")
    PATH_FIELD_NUMBER: _ClassVar[int]
    EXPIRES_IN_FIELD_NUMBER: _ClassVar[int]
    VISITOR_ID_FIELD_NUMBER: _ClassVar[int]
    path: str
    expires_in: int
    visitor_id: str
    def __init__(self, path: _Optional[str] = ..., expires_in: _Optional[int] = ..., visitor_id: _Optional[str] = ...) -> None: ...

class SignedUrlResponse(_message.Message):
    __slots__ = ("signed_url", "expires_at", "signature")
    SIGNED_URL_FIELD_NUMBER: _ClassVar[int]
    EXPIRES_AT_FIELD_NUMBER: _ClassVar[int]
    SIGNATURE_FIELD_NUMBER: _ClassVar[int]
    signed_url: str
    expires_at: int
    signature: str
    def __init__(self, signed_url: _Optional[str] = ..., expires_at: _Optional[int] = ..., signature: _Optional[str] = ...) -> None: ...

class CdnRouteRequest(_message.Message):
    __slots__ = ("media_key", "client_country", "preferred_provider")
    MEDIA_KEY_FIELD_NUMBER: _ClassVar[int]
    CLIENT_COUNTRY_FIELD_NUMBER: _ClassVar[int]
    PREFERRED_PROVIDER_FIELD_NUMBER: _ClassVar[int]
    media_key: str
    client_country: str
    preferred_provider: str
    def __init__(self, media_key: _Optional[str] = ..., client_country: _Optional[str] = ..., preferred_provider: _Optional[str] = ...) -> None: ...

class CdnRouteResponse(_message.Message):
    __slots__ = ("optimal_url", "selected_cdn", "fallback_cdns")
    OPTIMAL_URL_FIELD_NUMBER: _ClassVar[int]
    SELECTED_CDN_FIELD_NUMBER: _ClassVar[int]
    FALLBACK_CDNS_FIELD_NUMBER: _ClassVar[int]
    optimal_url: str
    selected_cdn: str
    fallback_cdns: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, optimal_url: _Optional[str] = ..., selected_cdn: _Optional[str] = ..., fallback_cdns: _Optional[_Iterable[str]] = ...) -> None: ...

class PlaylistRequest(_message.Message):
    __slots__ = ("item_id", "enable_av1")
    ITEM_ID_FIELD_NUMBER: _ClassVar[int]
    ENABLE_AV1_FIELD_NUMBER: _ClassVar[int]
    item_id: str
    enable_av1: bool
    def __init__(self, item_id: _Optional[str] = ..., enable_av1: _Optional[bool] = ...) -> None: ...

class PlaylistResponse(_message.Message):
    __slots__ = ("item_id", "playlist_content", "has_av1", "has_h264")
    ITEM_ID_FIELD_NUMBER: _ClassVar[int]
    PLAYLIST_CONTENT_FIELD_NUMBER: _ClassVar[int]
    HAS_AV1_FIELD_NUMBER: _ClassVar[int]
    HAS_H264_FIELD_NUMBER: _ClassVar[int]
    item_id: str
    playlist_content: str
    has_av1: bool
    has_h264: bool
    def __init__(self, item_id: _Optional[str] = ..., playlist_content: _Optional[str] = ..., has_av1: _Optional[bool] = ..., has_h264: _Optional[bool] = ...) -> None: ...
