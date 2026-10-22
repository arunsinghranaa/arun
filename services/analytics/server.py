"""Watchbloom Analytics Microservice (gRPC Server)
Provides high-performance, strongly-typed internal RPCs for Real-Time Event Ingestion,
QoE Telemetry, and Sliding-Window Stream Metrics.
"""

from concurrent import futures
import logging
import grpc

from core.stream_processing import STREAM_AGGREGATOR, STREAM_PRODUCER
from proto import analytics_pb2, analytics_pb2_grpc
from core.grpc_interceptors import UnifiedServerInterceptor, setup_health_checking

logger = logging.getLogger("watchbloom.services.analytics")


class AnalyticsServiceServicer(analytics_pb2_grpc.AnalyticsServiceServicer):
    """gRPC Servicer for Watchbloom Real-Time Analytics."""

    def IngestViewEvent(self, request, context):
        STREAM_PRODUCER.publish_view_event(
            item_id=request.item_id,
            visitor_id=request.visitor_id,
            playback_time_s=request.playback_time_s,
        )
        STREAM_AGGREGATOR.record_local_view(request.item_id)
        return analytics_pb2.IngestResponse(success=True, stream_id="views")

    def IngestQoETelemetry(self, request, context):
        STREAM_PRODUCER.publish_qoe_telemetry(
            item_id=request.item_id,
            visitor_id=request.visitor_id,
            buffer_ratio=request.buffer_ratio,
            latency_ms=request.latency_ms,
            cdn_node=request.cdn_node,
        )
        STREAM_AGGREGATOR.record_local_qoe(request.cdn_node, request.latency_ms)
        return analytics_pb2.IngestResponse(success=True, stream_id="qoe")

    def GetRealtimeMetrics(self, request, context):
        w = request.window_seconds or 60
        data = STREAM_AGGREGATOR.get_realtime_metrics(window_seconds=w)

        pb_trending = [
            analytics_pb2.TrendingVideo(item_id=t["item_id"], recent_views=t["recent_views"])
            for t in data.get("trending_videos", [])
        ]

        return analytics_pb2.RealtimeMetricsResponse(
            window_seconds=w,
            total_active_viewers=data.get("total_active_viewers", 0),
            trending_videos=pb_trending,
            cdn_latency_ms=data.get("cdn_latency_ms", {}),
        )


from typing import Any
def serve(port: int = 50055, host: str = "0.0.0.0") -> Any:
    interceptors: list[grpc.ServerInterceptor] = [UnifiedServerInterceptor(service_name="analytics-service")]
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=interceptors,
    )
    analytics_pb2_grpc.add_AnalyticsServiceServicer_to_server(AnalyticsServiceServicer(), server)
    setup_health_checking(server, ["watchbloom.analytics.AnalyticsService"])
    try:
        bound_port = server.add_insecure_port(f"{host}:{port}")
        if bound_port == 0 and port != 0:
            bound_port = server.add_insecure_port("127.0.0.1:0")
    except Exception:
        bound_port = server.add_insecure_port("127.0.0.1:0")
    server.start()
    actual_port = bound_port if bound_port > 0 else port
    setattr(server, "bound_port", actual_port)
    logger.info(f"Analytics gRPC Service started on port {actual_port} with health checking & tracing interceptors")
    return server


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    srv = serve(50055)
    srv.wait_for_termination()

