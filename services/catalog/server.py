"""Watchbloom Catalog Microservice (gRPC Server)
Provides high-performance, strongly-typed internal RPCs for Full-Text Search,
Browse filters, Video Detail, Categories, and Creator Channels.
"""

from concurrent import futures
import logging
from pathlib import Path
import grpc

from config import BASE_DIR, CATEGORIES
from proto import catalog_pb2, catalog_pb2_grpc
from search_engine import CATEGORY_LABELS, SearchEngine
from core.grpc_interceptors import UnifiedServerInterceptor, setup_health_checking

logger = logging.getLogger("watchbloom.services.catalog")

# Initialize isolated search engine
ENGINE = SearchEngine.from_json(str(BASE_DIR / "catalog.json"))


def _to_proto_video(item: dict) -> catalog_pb2.VideoItem:
    return catalog_pb2.VideoItem(
        id=str(item.get("id", "")),
        title=str(item.get("title", "")),
        author=str(item.get("author", "")),
        description=str(item.get("description", "")),
        category=str(item.get("category", "")),
        category_label=str(item.get("category_label", "")),
        type=str(item.get("type", "video")),
        format=str(item.get("format", "standard")),
        views=int(item.get("views", 0)),
        mins=int(item.get("mins", 1)),
        duration=int(item.get("duration", 0)),
        date=str(item.get("date", "")),
        art=str(item.get("art", "")),
        media_url=str(item.get("media_url", "")),
        hls_url=str(item.get("hls_url", "")),
        cdn_stream_url=str(item.get("cdn_stream_url", "")),
    )


class CatalogServiceServicer(catalog_pb2_grpc.CatalogServiceServicer):
    """gRPC Servicer for Watchbloom Catalog & Search."""

    def SearchVideos(self, request, context):
        res = ENGINE.search(
            query=request.query,
            type_=request.type or "all",
            limit=request.limit or 20,
            offset=request.offset or 0,
            sort=request.sort or "relevance",
            duration=request.duration or "all",
            uploaded=request.uploaded or "any",
            category=request.category or "all",
            format_=request.format or "all",
        )

        pb_results = [_to_proto_video(it) for it in res.get("results", [])]
        return catalog_pb2.SearchResponse(
            query=res.get("query", ""),
            corrected_query=res.get("corrected_query") or "",
            partial=res.get("partial", False),
            total=res.get("total", 0),
            results=pb_results,
            limit=res.get("limit", 20),
            offset=res.get("offset", 0),
            page=res.get("page", 1),
            total_pages=res.get("total_pages", 1),
            has_next=res.get("has_next", False),
            has_prev=res.get("has_prev", False),
        )

    def GetVideo(self, request, context):
        item = ENGINE.meta.get(request.item_id)
        if not item:
            return catalog_pb2.VideoResponse(found=False, error="Video not found")

        public_item = ENGINE._public_item(item)
        return catalog_pb2.VideoResponse(
            found=True,
            item=_to_proto_video(public_item),
        )

    def BrowseCatalog(self, request, context):
        res = ENGINE.browse(
            type_=request.type or "all",
            limit=request.limit or 20,
            offset=request.offset or 0,
            sort=request.sort or "newest",
            duration=request.duration or "all",
            uploaded=request.uploaded or "any",
            category=request.category or "all",
            format_=request.format or "all",
        )

        pb_results = [_to_proto_video(it) for it in res.get("results", [])]
        return catalog_pb2.BrowseResponse(
            total=res.get("total", 0),
            results=pb_results,
            limit=res.get("limit", 20),
            offset=res.get("offset", 0),
            page=res.get("page", 1),
            total_pages=res.get("total_pages", 1),
            has_next=res.get("has_next", False),
            has_prev=res.get("has_prev", False),
        )

    def GetCategories(self, request, context):
        sorted_cats = [c for c in sorted(CATEGORIES) if c != "all"]
        items = [
            catalog_pb2.CategoryItem(id=c, name=CATEGORY_LABELS.get(c, c.title()))
            for c in sorted_cats
        ]
        return catalog_pb2.CategoriesResponse(results=items)

    def GetChannels(self, request, context):
        channels: dict[str, dict] = {}
        for it in ENGINE.meta.values():
            author = it.get("author", "Creator").strip()
            ch_id = author.lower().replace(" ", "-")
            ch = channels.setdefault(ch_id, {
                "id": ch_id,
                "name": author,
                "video_count": 0,
                "playlist_count": 0,
                "views": 0,
                "categories": set(),
            })
            if it.get("type") == "video":
                ch["video_count"] += 1
                ch["views"] += it.get("views", 0)
            elif it.get("type") == "playlist":
                ch["playlist_count"] += 1
            ch["categories"].add(it.get("category", "learning"))

        pb_channels = [
            catalog_pb2.ChannelItem(
                id=c["id"],
                name=c["name"],
                video_count=c["video_count"],
                playlist_count=c["playlist_count"],
                item_count=c["video_count"] + c["playlist_count"],
                views=c["views"],
                categories=sorted(list(c["categories"])),
                url=f"/api/v1/channels/{c['id']}",
            )
            for c in channels.values()
        ]
        return catalog_pb2.ChannelsResponse(results=pb_channels, total=len(pb_channels), limit=20, offset=0)


from typing import Any
def serve(port: int = 50052, host: str = "0.0.0.0") -> Any:
    interceptors: list[grpc.ServerInterceptor] = [UnifiedServerInterceptor(service_name="catalog-service")]
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=interceptors,
    )
    catalog_pb2_grpc.add_CatalogServiceServicer_to_server(CatalogServiceServicer(), server)
    setup_health_checking(server, ["watchbloom.catalog.CatalogService"])
    try:
        bound_port = server.add_insecure_port(f"{host}:{port}")
        if bound_port == 0 and port != 0:
            bound_port = server.add_insecure_port("127.0.0.1:0")
    except Exception:
        bound_port = server.add_insecure_port("127.0.0.1:0")
    server.start()
    actual_port = bound_port if bound_port > 0 else port
    setattr(server, "bound_port", actual_port)
    logger.info(f"Catalog gRPC Service started on port {actual_port} with health checking & tracing interceptors")
    return server


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    srv = serve(50052)
    srv.wait_for_termination()
