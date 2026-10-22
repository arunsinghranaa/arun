"""gRPC Client for Analytics Microservice with channel pooling, load balancing, and resilient policies."""

from typing import List, Optional, Union
import grpc
from core.grpc_interceptors import LoadBalancedChannelPool
from proto import analytics_pb2, analytics_pb2_grpc


class AnalyticsClient:
    def __init__(
        self,
        target: Union[str, List[str]] = "localhost:50055",
        strategy: str = "round_robin",
        timeout: float = 5.0,
    ):
        self.target = target
        self.pool = LoadBalancedChannelPool(target, strategy=strategy, default_timeout=timeout)

    def _get_stub(self):
        channel = self.pool.get_channel()
        return analytics_pb2_grpc.AnalyticsServiceStub(channel)

    def ingest_view(self, item_id: str, visitor_id: str, playback_time_s: float = 0.0):
        stub = self._get_stub()
        req = analytics_pb2.ViewEventRequest(
            item_id=item_id,
            visitor_id=visitor_id,
            playback_time_s=playback_time_s,
        )
        return stub.IngestViewEvent(req)

    def ingest_qoe(self, item_id: str, visitor_id: str, buffer_ratio: float, latency_ms: float, cdn_node: str = "cloudflare"):
        stub = self._get_stub()
        req = analytics_pb2.QoETelemetryRequest(
            item_id=item_id,
            visitor_id=visitor_id,
            buffer_ratio=buffer_ratio,
            latency_ms=latency_ms,
            cdn_node=cdn_node,
        )
        return stub.IngestQoETelemetry(req)

    def get_realtime_metrics(self, window_seconds: int = 60):
        stub = self._get_stub()
        req = analytics_pb2.MetricsRequest(window_seconds=window_seconds)
        return stub.GetRealtimeMetrics(req)

    def close(self):
        self.pool.close()
