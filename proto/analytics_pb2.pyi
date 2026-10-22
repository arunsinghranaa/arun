from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ViewEventRequest(_message.Message):
    __slots__ = ("item_id", "visitor_id", "playback_time_s")
    ITEM_ID_FIELD_NUMBER: _ClassVar[int]
    VISITOR_ID_FIELD_NUMBER: _ClassVar[int]
    PLAYBACK_TIME_S_FIELD_NUMBER: _ClassVar[int]
    item_id: str
    visitor_id: str
    playback_time_s: float
    def __init__(self, item_id: _Optional[str] = ..., visitor_id: _Optional[str] = ..., playback_time_s: _Optional[float] = ...) -> None: ...

class QoETelemetryRequest(_message.Message):
    __slots__ = ("item_id", "visitor_id", "buffer_ratio", "latency_ms", "cdn_node")
    ITEM_ID_FIELD_NUMBER: _ClassVar[int]
    VISITOR_ID_FIELD_NUMBER: _ClassVar[int]
    BUFFER_RATIO_FIELD_NUMBER: _ClassVar[int]
    LATENCY_MS_FIELD_NUMBER: _ClassVar[int]
    CDN_NODE_FIELD_NUMBER: _ClassVar[int]
    item_id: str
    visitor_id: str
    buffer_ratio: float
    latency_ms: float
    cdn_node: str
    def __init__(self, item_id: _Optional[str] = ..., visitor_id: _Optional[str] = ..., buffer_ratio: _Optional[float] = ..., latency_ms: _Optional[float] = ..., cdn_node: _Optional[str] = ...) -> None: ...

class IngestResponse(_message.Message):
    __slots__ = ("success", "stream_id")
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    STREAM_ID_FIELD_NUMBER: _ClassVar[int]
    success: bool
    stream_id: str
    def __init__(self, success: _Optional[bool] = ..., stream_id: _Optional[str] = ...) -> None: ...

class MetricsRequest(_message.Message):
    __slots__ = ("window_seconds",)
    WINDOW_SECONDS_FIELD_NUMBER: _ClassVar[int]
    window_seconds: int
    def __init__(self, window_seconds: _Optional[int] = ...) -> None: ...

class TrendingVideo(_message.Message):
    __slots__ = ("item_id", "recent_views")
    ITEM_ID_FIELD_NUMBER: _ClassVar[int]
    RECENT_VIEWS_FIELD_NUMBER: _ClassVar[int]
    item_id: str
    recent_views: int
    def __init__(self, item_id: _Optional[str] = ..., recent_views: _Optional[int] = ...) -> None: ...

class RealtimeMetricsResponse(_message.Message):
    __slots__ = ("window_seconds", "total_active_viewers", "trending_videos", "cdn_latency_ms")
    class CdnLatencyMsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: float
        def __init__(self, key: _Optional[str] = ..., value: _Optional[float] = ...) -> None: ...
    WINDOW_SECONDS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_ACTIVE_VIEWERS_FIELD_NUMBER: _ClassVar[int]
    TRENDING_VIDEOS_FIELD_NUMBER: _ClassVar[int]
    CDN_LATENCY_MS_FIELD_NUMBER: _ClassVar[int]
    window_seconds: int
    total_active_viewers: int
    trending_videos: _containers.RepeatedCompositeFieldContainer[TrendingVideo]
    cdn_latency_ms: _containers.ScalarMap[str, float]
    def __init__(self, window_seconds: _Optional[int] = ..., total_active_viewers: _Optional[int] = ..., trending_videos: _Optional[_Iterable[_Union[TrendingVideo, _Mapping]]] = ..., cdn_latency_ms: _Optional[_Mapping[str, float]] = ...) -> None: ...
