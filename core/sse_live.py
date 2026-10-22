"""Server-Sent Events (SSE) Real-Time Hub for Watchbloom Live Streaming.
Streams live viewer counts, stream status transitions, and viewer telemetry
unidirectionally with low latency and automatic reconnection support.
"""

from collections import defaultdict
import json
import logging
import queue
import threading
import time
from typing import Any, Generator
import uuid

from core.cache import CACHE

logger = logging.getLogger("watchbloom.sse_live")


class LiveStreamSSEHub:
    """Thread-safe and Redis-backed Server-Sent Events broker for live stream broadcasts."""

    def __init__(self):
        self._lock = threading.Lock()
        # stream_id -> dict of client_id -> queue.Queue[str]
        self._listeners: dict[str, dict[str, queue.Queue[str]]] = defaultdict(dict)
        # stream_id -> set of active visitor_ids
        self._active_viewers: dict[str, set[str]] = defaultdict(set)
        # stream_id -> current status ("active", "ended", etc.)
        self._stream_status: dict[str, str] = {}
        # stream_id -> likes count
        self._stream_likes: dict[str, int] = defaultdict(int)

    def register_viewer(self, stream_id: str, visitor_id: str | None = None) -> tuple[str, queue.Queue[str]]:
        """Register a new SSE client listener and track active viewer."""
        client_id = f"sse_{uuid.uuid4().hex[:10]}"
        q: queue.Queue[str] = queue.Queue(maxsize=100)
        v_id = visitor_id or client_id

        with self._lock:
            self._listeners[stream_id][client_id] = q
            self._active_viewers[stream_id].add(v_id)
            count = len(self._active_viewers[stream_id])

        # If Redis is active, sync viewer count in Redis key
        if CACHE.is_redis_active and CACHE.redis:
            try:
                CACHE.redis.sadd(f"live:viewers:{stream_id}", v_id)
                CACHE.redis.expire(f"live:viewers:{stream_id}", 3600)
            except Exception as e:
                logger.debug(f"Redis viewer sync error: {e}")

        # Broadcast updated viewer count to all listeners of this stream
        self.broadcast_stream_update(stream_id, event="viewer_count", data={
            "stream_id": stream_id,
            "viewers": count,
            "likes": self._stream_likes.get(stream_id, 0),
            "status": self._stream_status.get(stream_id, "active"),
            "timestamp": int(time.time() * 1000),
        })

        return client_id, q

    def unregister_viewer(self, stream_id: str, client_id: str, visitor_id: str | None = None) -> None:
        """Unregister an SSE listener and update viewer count."""
        v_id = visitor_id or client_id
        with self._lock:
            self._listeners[stream_id].pop(client_id, None)
            self._active_viewers[stream_id].discard(v_id)
            count = len(self._active_viewers[stream_id])

        if CACHE.is_redis_active and CACHE.redis:
            try:
                CACHE.redis.srem(f"live:viewers:{stream_id}", v_id)
            except Exception as e:
                logger.debug(f"Redis viewer remove error: {e}")

        self.broadcast_stream_update(stream_id, event="viewer_count", data={
            "stream_id": stream_id,
            "viewers": max(0, count),
            "likes": self._stream_likes.get(stream_id, 0),
            "status": self._stream_status.get(stream_id, "active"),
            "timestamp": int(time.time() * 1000),
        })

    def get_viewers_count(self, stream_id: str) -> int:
        """Return the number of active viewers currently connected to the stream."""
        if CACHE.is_redis_active and CACHE.redis:
            try:
                count = CACHE.redis.scard(f"live:viewers:{stream_id}")
                if count is not None:
                    return int(count)
            except Exception:
                pass

        with self._lock:
            return len(self._active_viewers.get(stream_id, set()))

    def update_stream_status(self, stream_id: str, status: str) -> None:
        """Update stream status (e.g. 'active', 'ended') and broadcast to all viewers."""
        with self._lock:
            self._stream_status[stream_id] = status

        self.broadcast_stream_update(stream_id, event="stream_status", data={
            "stream_id": stream_id,
            "status": status,
            "viewers": self.get_viewers_count(stream_id),
            "timestamp": int(time.time() * 1000),
        })

    def record_like(self, stream_id: str) -> int:
        """Increment live stream like counter and notify listeners."""
        with self._lock:
            self._stream_likes[stream_id] += 1
            likes = self._stream_likes[stream_id]

        self.broadcast_stream_update(stream_id, event="stream_like", data={
            "stream_id": stream_id,
            "likes": likes,
            "timestamp": int(time.time() * 1000),
        })
        return likes

    def publish_chat_message(
        self,
        stream_id: str,
        author: str,
        text: str,
        is_host: bool = False,
        avatar: str = "",
    ) -> dict[str, Any]:
        """Publish a live chat message and broadcast via SSE to all connected viewers in real time."""
        msg_id = f"msg_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        message_data = {
            "id": msg_id,
            "stream_id": stream_id,
            "author": author,
            "text": text,
            "is_host": is_host,
            "avatar": avatar,
            "timestamp": int(time.time() * 1000),
        }
        self.broadcast_stream_update(stream_id, event="chat_message", data=message_data)
        return message_data

    def publish_super_chat(
        self,
        stream_id: str,
        author: str,
        amount: str,
        text: str,
        currency: str = "INR",
    ) -> dict[str, Any]:
        """Publish a paid Super Chat donation event and broadcast to all viewers."""
        super_chat_data = {
            "id": f"sc_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}",
            "stream_id": stream_id,
            "author": author,
            "amount": amount,
            "currency": currency,
            "text": text,
            "timestamp": int(time.time() * 1000),
        }
        self.broadcast_stream_update(stream_id, event="super_chat", data=super_chat_data)
        return super_chat_data

    def broadcast_stream_update(self, stream_id: str, event: str, data: dict[str, Any]) -> None:
        """Deliver an SSE formatted payload to all connected clients."""
        payload = f"event: {event}\ndata: {json.dumps(data)}\n\n"
        with self._lock:
            dead_clients: list[str] = []
            subscribers = self._listeners.get(stream_id, {})
            for c_id, q in subscribers.items():
                try:
                    q.put_nowait(payload)
                except queue.Full:
                    dead_clients.append(c_id)

            for c_id in dead_clients:
                subscribers.pop(c_id, None)

    def event_stream_generator(self, stream_id: str, visitor_id: str | None = None) -> Generator[str, None, None]:
        """Yield Server-Sent Events messages with automatic 15-second heartbeat keep-alive."""
        client_id, q = self.register_viewer(stream_id, visitor_id)

        # Initial connection handshake event
        initial_payload = {
            "stream_id": stream_id,
            "viewers": self.get_viewers_count(stream_id),
            "likes": self._stream_likes.get(stream_id, 0),
            "status": self._stream_status.get(stream_id, "active"),
            "connected_at": int(time.time() * 1000),
        }
        yield f"event: connected\ndata: {json.dumps(initial_payload)}\n\n"

        try:
            last_heartbeat = time.time()
            while True:
                try:
                    # Non-blocking wait with 1.0s timeout to allow heartbeat check
                    msg = q.get(timeout=1.0)
                    yield msg
                except queue.Empty:
                    # Check if heartbeat interval (15s) elapsed
                    now = time.time()
                    if now - last_heartbeat >= 15.0:
                        last_heartbeat = now
                        yield f": heartbeat {int(now)}\n\n"
        except GeneratorExit:
            logger.info(f"SSE client {client_id} disconnected from stream {stream_id}")
        except Exception as exc:
            logger.debug(f"SSE stream generator exception: {exc}")
        finally:
            self.unregister_viewer(stream_id, client_id, visitor_id)


# Global singleton SSE Hub
LIVE_SSE_HUB = LiveStreamSSEHub()

