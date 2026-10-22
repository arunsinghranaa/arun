"""Unit and integration tests for Server-Sent Events (SSE) live streaming telemetry.
Tests real-time viewer count tracking, stream status events, and HTTP streaming endpoints.
"""

import json
import unittest

from app import app
from core.sse_live import LIVE_SSE_HUB, LiveStreamSSEHub


class TestServerSentEventsLive(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.hub = LiveStreamSSEHub()

    def test_hub_viewer_registration_and_count(self):
        stream_id = "test_stream_101"
        self.assertEqual(self.hub.get_viewers_count(stream_id), 0)

        c1, q1 = self.hub.register_viewer(stream_id, visitor_id="visitor_alpha")
        self.assertEqual(self.hub.get_viewers_count(stream_id), 1)

        c2, q2 = self.hub.register_viewer(stream_id, visitor_id="visitor_beta")
        self.assertEqual(self.hub.get_viewers_count(stream_id), 2)

        # Disconnect client 1
        self.hub.unregister_viewer(stream_id, c1, visitor_id="visitor_alpha")
        self.assertEqual(self.hub.get_viewers_count(stream_id), 1)

        # Disconnect client 2
        self.hub.unregister_viewer(stream_id, c2, visitor_id="visitor_beta")
        self.assertEqual(self.hub.get_viewers_count(stream_id), 0)

    def test_hub_status_and_likes(self):
        stream_id = "test_stream_102"
        self.hub.update_stream_status(stream_id, "active")
        self.assertEqual(self.hub._stream_status.get(stream_id), "active")

        like_count = self.hub.record_like(stream_id)
        self.assertEqual(like_count, 1)

    def test_sse_endpoint_headers_and_initial_handshake(self):
        stream_id = "v_live_unit_test"
        response = self.client.get(f"/api/v1/live/{stream_id}/events")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.content_type)
        self.assertEqual(response.headers.get("X-Accel-Buffering"), "no")
        self.assertEqual(response.headers.get("Cache-Control"), "no-cache, no-transform")

        # Read the first event chunk
        iterator = iter(response.response)
        raw_chunk = next(iterator)
        first_chunk = raw_chunk.decode("utf-8") if isinstance(raw_chunk, bytes) else str(raw_chunk)
        self.assertIn("event: connected", first_chunk)
        self.assertIn(stream_id, first_chunk)

    def test_live_stream_like_endpoint(self):
        stream_id = "v_live_like_test"
        res = self.client.post(f"/api/v1/live/{stream_id}/like")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("stream_id"), stream_id)
        self.assertGreaterEqual(data.get("likes", 0), 1)

    def test_live_stream_status_endpoint(self):
        stream_id = "v_live_status_test"
        res = self.client.get(f"/api/v1/live/{stream_id}/status")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("stream_id"), stream_id)
        self.assertIn("viewers", data)

    def test_live_chat_and_superchat_endpoints(self):
        stream_id = "v_live_chat_test_1"
        # 1. Post live chat message
        res_chat = self.client.post(f"/api/v1/live/{stream_id}/chat", json={
            "text": "Incredible high-definition stream quality! 🔥",
            "author": "PriyaSharma",
            "is_host": False,
        })
        self.assertEqual(res_chat.status_code, 201)
        chat_data = res_chat.get_json()
        self.assertTrue(chat_data.get("success"))
        self.assertEqual(chat_data["message"]["author"], "PriyaSharma")
        self.assertIn("stream quality", chat_data["message"]["text"])

        # 2. Post Super Chat
        res_sc = self.client.post(f"/api/v1/live/{stream_id}/superchat", json={
            "text": "Supporting the channel from Mumbai! ❤️",
            "amount": "250.00",
            "currency": "INR",
        })
        self.assertEqual(res_sc.status_code, 201)
        sc_data = res_sc.get_json()
        self.assertTrue(sc_data.get("success"))
        self.assertEqual(sc_data["superchat"]["amount"], "250.00")

    def test_cdn_purge_endpoint(self):
        res = self.client.post("/api/v1/cdn/purge", json={
            "tags": ["watchbloom-vod-101", "watchbloom-manifests"],
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("watchbloom-vod-101", data.get("purged_tags", []))


if __name__ == "__main__":
    unittest.main()

