from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class EmptyRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class SearchRequest(_message.Message):
    __slots__ = ("query", "type", "limit", "offset", "sort", "duration", "uploaded", "category", "format")
    QUERY_FIELD_NUMBER: _ClassVar[int]
    TYPE_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    OFFSET_FIELD_NUMBER: _ClassVar[int]
    SORT_FIELD_NUMBER: _ClassVar[int]
    DURATION_FIELD_NUMBER: _ClassVar[int]
    UPLOADED_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_FIELD_NUMBER: _ClassVar[int]
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    query: str
    type: str
    limit: int
    offset: int
    sort: str
    duration: str
    uploaded: str
    category: str
    format: str
    def __init__(self, query: _Optional[str] = ..., type: _Optional[str] = ..., limit: _Optional[int] = ..., offset: _Optional[int] = ..., sort: _Optional[str] = ..., duration: _Optional[str] = ..., uploaded: _Optional[str] = ..., category: _Optional[str] = ..., format: _Optional[str] = ...) -> None: ...

class BrowseRequest(_message.Message):
    __slots__ = ("type", "limit", "offset", "sort", "duration", "uploaded", "category", "format")
    TYPE_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    OFFSET_FIELD_NUMBER: _ClassVar[int]
    SORT_FIELD_NUMBER: _ClassVar[int]
    DURATION_FIELD_NUMBER: _ClassVar[int]
    UPLOADED_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_FIELD_NUMBER: _ClassVar[int]
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    type: str
    limit: int
    offset: int
    sort: str
    duration: str
    uploaded: str
    category: str
    format: str
    def __init__(self, type: _Optional[str] = ..., limit: _Optional[int] = ..., offset: _Optional[int] = ..., sort: _Optional[str] = ..., duration: _Optional[str] = ..., uploaded: _Optional[str] = ..., category: _Optional[str] = ..., format: _Optional[str] = ...) -> None: ...

class GetVideoRequest(_message.Message):
    __slots__ = ("item_id",)
    ITEM_ID_FIELD_NUMBER: _ClassVar[int]
    item_id: str
    def __init__(self, item_id: _Optional[str] = ...) -> None: ...

class ChannelsRequest(_message.Message):
    __slots__ = ("query", "sort", "limit", "offset")
    QUERY_FIELD_NUMBER: _ClassVar[int]
    SORT_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    OFFSET_FIELD_NUMBER: _ClassVar[int]
    query: str
    sort: str
    limit: int
    offset: int
    def __init__(self, query: _Optional[str] = ..., sort: _Optional[str] = ..., limit: _Optional[int] = ..., offset: _Optional[int] = ...) -> None: ...

class VideoItem(_message.Message):
    __slots__ = ("id", "title", "author", "description", "category", "category_label", "type", "format", "views", "mins", "duration", "date", "art", "media_url", "hls_url", "cdn_stream_url")
    ID_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    AUTHOR_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_LABEL_FIELD_NUMBER: _ClassVar[int]
    TYPE_FIELD_NUMBER: _ClassVar[int]
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    VIEWS_FIELD_NUMBER: _ClassVar[int]
    MINS_FIELD_NUMBER: _ClassVar[int]
    DURATION_FIELD_NUMBER: _ClassVar[int]
    DATE_FIELD_NUMBER: _ClassVar[int]
    ART_FIELD_NUMBER: _ClassVar[int]
    MEDIA_URL_FIELD_NUMBER: _ClassVar[int]
    HLS_URL_FIELD_NUMBER: _ClassVar[int]
    CDN_STREAM_URL_FIELD_NUMBER: _ClassVar[int]
    id: str
    title: str
    author: str
    description: str
    category: str
    category_label: str
    type: str
    format: str
    views: int
    mins: int
    duration: int
    date: str
    art: str
    media_url: str
    hls_url: str
    cdn_stream_url: str
    def __init__(self, id: _Optional[str] = ..., title: _Optional[str] = ..., author: _Optional[str] = ..., description: _Optional[str] = ..., category: _Optional[str] = ..., category_label: _Optional[str] = ..., type: _Optional[str] = ..., format: _Optional[str] = ..., views: _Optional[int] = ..., mins: _Optional[int] = ..., duration: _Optional[int] = ..., date: _Optional[str] = ..., art: _Optional[str] = ..., media_url: _Optional[str] = ..., hls_url: _Optional[str] = ..., cdn_stream_url: _Optional[str] = ...) -> None: ...

class SearchResponse(_message.Message):
    __slots__ = ("query", "corrected_query", "partial", "total", "results", "limit", "offset", "page", "total_pages", "has_next", "has_prev")
    QUERY_FIELD_NUMBER: _ClassVar[int]
    CORRECTED_QUERY_FIELD_NUMBER: _ClassVar[int]
    PARTIAL_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    RESULTS_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    OFFSET_FIELD_NUMBER: _ClassVar[int]
    PAGE_FIELD_NUMBER: _ClassVar[int]
    TOTAL_PAGES_FIELD_NUMBER: _ClassVar[int]
    HAS_NEXT_FIELD_NUMBER: _ClassVar[int]
    HAS_PREV_FIELD_NUMBER: _ClassVar[int]
    query: str
    corrected_query: str
    partial: bool
    total: int
    results: _containers.RepeatedCompositeFieldContainer[VideoItem]
    limit: int
    offset: int
    page: int
    total_pages: int
    has_next: bool
    has_prev: bool
    def __init__(self, query: _Optional[str] = ..., corrected_query: _Optional[str] = ..., partial: _Optional[bool] = ..., total: _Optional[int] = ..., results: _Optional[_Iterable[_Union[VideoItem, _Mapping]]] = ..., limit: _Optional[int] = ..., offset: _Optional[int] = ..., page: _Optional[int] = ..., total_pages: _Optional[int] = ..., has_next: _Optional[bool] = ..., has_prev: _Optional[bool] = ...) -> None: ...

class BrowseResponse(_message.Message):
    __slots__ = ("total", "results", "limit", "offset", "page", "total_pages", "has_next", "has_prev")
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    RESULTS_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    OFFSET_FIELD_NUMBER: _ClassVar[int]
    PAGE_FIELD_NUMBER: _ClassVar[int]
    TOTAL_PAGES_FIELD_NUMBER: _ClassVar[int]
    HAS_NEXT_FIELD_NUMBER: _ClassVar[int]
    HAS_PREV_FIELD_NUMBER: _ClassVar[int]
    total: int
    results: _containers.RepeatedCompositeFieldContainer[VideoItem]
    limit: int
    offset: int
    page: int
    total_pages: int
    has_next: bool
    has_prev: bool
    def __init__(self, total: _Optional[int] = ..., results: _Optional[_Iterable[_Union[VideoItem, _Mapping]]] = ..., limit: _Optional[int] = ..., offset: _Optional[int] = ..., page: _Optional[int] = ..., total_pages: _Optional[int] = ..., has_next: _Optional[bool] = ..., has_prev: _Optional[bool] = ...) -> None: ...

class VideoResponse(_message.Message):
    __slots__ = ("found", "item", "error")
    FOUND_FIELD_NUMBER: _ClassVar[int]
    ITEM_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    found: bool
    item: VideoItem
    error: str
    def __init__(self, found: _Optional[bool] = ..., item: _Optional[_Union[VideoItem, _Mapping]] = ..., error: _Optional[str] = ...) -> None: ...

class CategoryItem(_message.Message):
    __slots__ = ("id", "name")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    id: str
    name: str
    def __init__(self, id: _Optional[str] = ..., name: _Optional[str] = ...) -> None: ...

class CategoriesResponse(_message.Message):
    __slots__ = ("results",)
    RESULTS_FIELD_NUMBER: _ClassVar[int]
    results: _containers.RepeatedCompositeFieldContainer[CategoryItem]
    def __init__(self, results: _Optional[_Iterable[_Union[CategoryItem, _Mapping]]] = ...) -> None: ...

class ChannelItem(_message.Message):
    __slots__ = ("id", "name", "video_count", "playlist_count", "item_count", "views", "categories", "url")
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    VIDEO_COUNT_FIELD_NUMBER: _ClassVar[int]
    PLAYLIST_COUNT_FIELD_NUMBER: _ClassVar[int]
    ITEM_COUNT_FIELD_NUMBER: _ClassVar[int]
    VIEWS_FIELD_NUMBER: _ClassVar[int]
    CATEGORIES_FIELD_NUMBER: _ClassVar[int]
    URL_FIELD_NUMBER: _ClassVar[int]
    id: str
    name: str
    video_count: int
    playlist_count: int
    item_count: int
    views: int
    categories: _containers.RepeatedScalarFieldContainer[str]
    url: str
    def __init__(self, id: _Optional[str] = ..., name: _Optional[str] = ..., video_count: _Optional[int] = ..., playlist_count: _Optional[int] = ..., item_count: _Optional[int] = ..., views: _Optional[int] = ..., categories: _Optional[_Iterable[str]] = ..., url: _Optional[str] = ...) -> None: ...

class ChannelsResponse(_message.Message):
    __slots__ = ("results", "total", "limit", "offset")
    RESULTS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_FIELD_NUMBER: _ClassVar[int]
    LIMIT_FIELD_NUMBER: _ClassVar[int]
    OFFSET_FIELD_NUMBER: _ClassVar[int]
    results: _containers.RepeatedCompositeFieldContainer[ChannelItem]
    total: int
    limit: int
    offset: int
    def __init__(self, results: _Optional[_Iterable[_Union[ChannelItem, _Mapping]]] = ..., total: _Optional[int] = ..., limit: _Optional[int] = ..., offset: _Optional[int] = ...) -> None: ...
