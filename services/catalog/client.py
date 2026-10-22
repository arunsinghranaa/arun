"""gRPC Client for Catalog Microservice with channel pooling, load balancing, and resilient policies."""

from typing import List, Optional, Union
import grpc
from core.grpc_interceptors import LoadBalancedChannelPool
from proto import catalog_pb2, catalog_pb2_grpc


class CatalogClient:
    def __init__(
        self,
        target: Union[str, List[str]] = "localhost:50052",
        strategy: str = "round_robin",
        timeout: float = 5.0,
    ):
        self.target = target
        self.pool = LoadBalancedChannelPool(target, strategy=strategy, default_timeout=timeout)

    def _get_stub(self):
        channel = self.pool.get_channel()
        return catalog_pb2_grpc.CatalogServiceStub(channel)

    def search_videos(self, query: str, limit: int = 20, offset: int = 0, sort: str = "relevance", **kwargs):
        stub = self._get_stub()
        req = catalog_pb2.SearchRequest(
            query=query,
            limit=limit,
            offset=offset,
            sort=sort,
            type=kwargs.get("type", "all"),
            duration=kwargs.get("duration", "all"),
            uploaded=kwargs.get("uploaded", "any"),
            category=kwargs.get("category", "all"),
            format=kwargs.get("format", "all"),
        )
        return stub.SearchVideos(req)

    def get_video(self, item_id: str):
        stub = self._get_stub()
        req = catalog_pb2.GetVideoRequest(item_id=item_id)
        return stub.GetVideo(req)

    def browse_catalog(self, category: str = "all", sort: str = "popularity", limit: int = 20, offset: int = 0, **kwargs):
        stub = self._get_stub()
        req = catalog_pb2.BrowseRequest(
            category=category,
            sort=sort,
            limit=limit,
            offset=offset,
            type=kwargs.get("type", "all"),
            duration=kwargs.get("duration", "all"),
            uploaded=kwargs.get("uploaded", "any"),
            format=kwargs.get("format", "all"),
        )
        return stub.BrowseCatalog(req)

    def get_categories(self):
        stub = self._get_stub()
        req = catalog_pb2.EmptyRequest()
        return stub.GetCategories(req)

    def get_channels(self):
        stub = self._get_stub()
        req = catalog_pb2.ChannelsRequest()
        return stub.GetChannels(req)

    def close(self):
        self.pool.close()
