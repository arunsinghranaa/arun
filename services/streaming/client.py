"""gRPC Client for Streaming Microservice with channel pooling, load balancing, and resilient policies."""

from typing import List, Optional, Union
import grpc
from core.grpc_interceptors import LoadBalancedChannelPool
from proto import streaming_pb2, streaming_pb2_grpc


class StreamingClient:
    def __init__(
        self,
        target: Union[str, List[str]] = "localhost:50054",
        strategy: str = "round_robin",
        timeout: float = 5.0,
    ):
        self.target = target
        self.pool = LoadBalancedChannelPool(target, strategy=strategy, default_timeout=timeout)

    def _get_stub(self):
        channel = self.pool.get_channel()
        return streaming_pb2_grpc.StreamingServiceStub(channel)

    def get_signed_media_url(self, path: str, expires_in: int = 3600, visitor_id: str = ""):
        stub = self._get_stub()
        req = streaming_pb2.SignedUrlRequest(path=path, expires_in=expires_in, visitor_id=visitor_id)
        return stub.GetSignedMediaUrl(req)

    def resolve_optimal_cdn(self, media_key: str, preferred_provider: str = "cloudflare", client_country: str = ""):
        stub = self._get_stub()
        req = streaming_pb2.CdnRouteRequest(
            media_key=media_key,
            client_country=client_country,
            preferred_provider=preferred_provider,
        )
        return stub.ResolveOptimalCdn(req)

    def get_master_playlist(self, item_id: str, enable_av1: bool = True):
        stub = self._get_stub()
        req = streaming_pb2.PlaylistRequest(item_id=item_id, enable_av1=enable_av1)
        return stub.GetMasterPlaylist(req)

    def close(self):
        self.pool.close()
