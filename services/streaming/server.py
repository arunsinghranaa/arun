"""Watchbloom Streaming & Delivery Microservice (gRPC Server)
Provides high-performance, strongly-typed internal RPCs for Signed Media URLs,
Multi-CDN routing, and HLS Adaptive Bitrate Playlist Delivery.
"""

from concurrent import futures
import logging
from pathlib import Path
import grpc

from config import HLS_DIR
from core.cdn import MULTI_CDN
from core.signed_urls import generate_signed_media_url
import hls_packager
from proto import streaming_pb2, streaming_pb2_grpc
from core.grpc_interceptors import UnifiedServerInterceptor, setup_health_checking

logger = logging.getLogger("watchbloom.services.streaming")


class StreamingServiceServicer(streaming_pb2_grpc.StreamingServiceServicer):
    """gRPC Servicer for Watchbloom Streaming & Multi-CDN Delivery."""

    def GetSignedMediaUrl(self, request, context):
        signed_url = generate_signed_media_url(
            path=request.path,
            expires_in=request.expires_in or 3600,
        )
        # Parse signature query
        sig = signed_url.split("sig=")[-1].split("&")[0] if "sig=" in signed_url else ""
        return streaming_pb2.SignedUrlResponse(
            signed_url=signed_url,
            expires_at=request.expires_in or 3600,
            signature=sig,
        )

    def ResolveOptimalCdn(self, request, context):
        optimal = MULTI_CDN.get_optimal_cdn_url(
            key=request.media_key,
            provider=request.preferred_provider or "cloudflare",
        )
        return streaming_pb2.CdnRouteResponse(
            optimal_url=optimal,
            selected_cdn=request.preferred_provider or "cloudflare",
            fallback_cdns=["cloudfront", "fastly"],
        )

    def GetMasterPlaylist(self, request, context):
        item_id = request.item_id
        live_file = HLS_DIR / "live" / item_id / "live.m3u8"
        if live_file.is_file():
            content = live_file.read_text(encoding="utf-8")
            return streaming_pb2.PlaylistResponse(
                item_id=item_id,
                playlist_content=content,
                has_av1=False,
                has_h264=True,
            )

        master_file = HLS_DIR / item_id / "master.m3u8"
        if not master_file.is_file():
            # Check if this is a live stream that needs on-demand live segmentation
            if item_id.startswith("v_live_") or "live" in item_id:
                try:
                    from config import VIDEO_DIR
                    matched = list(VIDEO_DIR.glob(f"live_{item_id}_*.webm")) + list(VIDEO_DIR.glob(f"live_{item_id}_*.mp4"))
                    valid_cands = [p for p in matched if p.is_file() and p.stat().st_size > 1024]
                    if valid_cands:
                        packaged = hls_packager.create_live_segment(item_id, valid_cands[0])
                        if packaged.is_file():
                            content = packaged.read_text(encoding="utf-8")
                            return streaming_pb2.PlaylistResponse(
                                item_id=item_id,
                                playlist_content=content,
                                has_av1=False,
                                has_h264=True,
                            )
                except Exception as live_e:
                    logger.debug(f"Live segment packaging check: {live_e}")

            # Generate package on-demand
            try:
                master_file = hls_packager.package_vod_variants(item_id, enable_av1=request.enable_av1)
            except Exception as e:
                logger.error(f"Error packaging HLS: {e}")

        content = master_file.read_text(encoding="utf-8") if master_file.is_file() else ""
        return streaming_pb2.PlaylistResponse(
            item_id=item_id,
            playlist_content=content,
            has_av1="av01" in content,
            has_h264="avc1" in content,
        )


from typing import Any
def serve(port: int = 50054, host: str = "0.0.0.0") -> Any:
    interceptors: list[grpc.ServerInterceptor] = [UnifiedServerInterceptor(service_name="streaming-service")]
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=interceptors,
    )
    streaming_pb2_grpc.add_StreamingServiceServicer_to_server(StreamingServiceServicer(), server)
    setup_health_checking(server, ["watchbloom.streaming.StreamingService"])
    try:
        bound_port = server.add_insecure_port(f"{host}:{port}")
        if bound_port == 0 and port != 0:
            bound_port = server.add_insecure_port("127.0.0.1:0")
    except Exception:
        bound_port = server.add_insecure_port("127.0.0.1:0")
    server.start()
    actual_port = bound_port if bound_port > 0 else port
    setattr(server, "bound_port", actual_port)
    logger.info(f"Streaming gRPC Service started on port {actual_port} with health checking & tracing interceptors")
    return server


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    srv = serve(50054)
    srv.wait_for_termination()

