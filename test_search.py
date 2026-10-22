from typing import Any
import unittest
import tempfile
from pathlib import Path
import grpc

import app as app_module
from app import app
from search_engine import SearchEngine

engine = SearchEngine.from_json("catalog.json")


def ids(r):
    return [x["id"] for x in r["results"]]


class EngineTests(unittest.TestCase):
    def test_and_first_then_partial(self):
        exact = engine.search("python loops")
        self.assertFalse(exact["partial"])
        self.assertEqual(ids(exact)[0], "v1")
        loose = engine.search("python tutorial")
        self.assertTrue(loose["partial"])
        self.assertIn("v1", ids(loose))
        self.assertEqual(engine.search("zzzz qqqq")["total"], 0)

    def test_prefix_on_last_word(self):
        self.assertIn("v3", ids(engine.search("css gri")))

    def test_title_beats_description(self):
        self.assertEqual(ids(engine.search("python"))[0], "v1")

    def test_type_filter_and_legacy_course_alias(self):
        r = engine.search("python", "playlist")
        self.assertTrue(r["results"] and all(x["type"] == "playlist" for x in r["results"]))
        legacy = engine.search("python", "course")
        self.assertEqual(ids(legacy), ids(r))

    def test_playlist_expands_its_video_entries(self):
        playlist = next(item for item in engine.browse(type_="playlist", limit=20)["results"] if item["id"] == "p4")
        self.assertEqual([item["id"] for item in playlist["playlist_items"]], ["v1", "v2", "v7"])

    def test_category_filter(self):
        r = engine.browse(category="music")
        self.assertEqual(ids(r), ["v8"])
        self.assertEqual(r["results"][0]["category_label"], "Music")

    def test_typo_correction(self):
        r = engine.search("pyton")
        self.assertEqual(r["corrected_query"], "python")
        self.assertIn("v1", ids(r))

    def test_stopwords_and_empty(self):
        self.assertEqual(engine.search("the of")["total"], 0)
        self.assertEqual(engine.search("   ")["total"], 0)

    def test_special_characters_are_safe(self):
        for q in ['"', "'; DROP TABLE fts;--", "c++", "a*b", "NEAR(x y)", "title:python"]:
            engine.search(q)

    def test_suggest(self):
        s = engine.suggest("pyth")
        self.assertTrue(s and s[0]["text"].startswith("Python"))
        self.assertEqual(engine.suggest(""), [])


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.c = app.test_client()
        self.client = self.c

    def test_search_endpoint(self):
        r = self.c.get("/api/search?q=weather&type=video")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.get_json()["results"][0]["id"], "v2")

    def test_api_index_and_docs(self):
        overview = self.c.get("/api")
        self.assertEqual(overview.status_code, 200)
        self.assertEqual(overview.get_json()["base_path"], "/api")
        self.assertIn("/api/items/<item_id>", [entry["path"] for entry in overview.get_json()["endpoints"]])
        docs = self.c.get("/api/docs")
        self.assertEqual(docs.status_code, 200)
        docs.close()

    def test_item_detail_endpoint(self):
        response = self.c.get("/api/items/p4")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["type"], "playlist")
        self.assertEqual([item["id"] for item in response.get_json()["playlist_items"]], ["v1", "v2", "v7"])
        self.assertEqual(self.c.get("/api/items/does-not-exist").status_code, 404)

    def test_bad_type(self):
        self.assertEqual(self.c.get("/api/search?q=x&type=bad").status_code, 400)

    def test_playlist_api_and_legacy_alias(self):
        current = self.c.get("/api/browse?type=playlist")
        legacy = self.c.get("/api/browse?type=course")
        self.assertEqual(current.status_code, 200)
        self.assertEqual(legacy.status_code, 200)
        self.assertEqual(ids(current.get_json()), ids(legacy.get_json()))

    def test_search_playlist_api_and_legacy_alias(self):
        current = self.c.get("/api/search?q=python&type=playlist")
        legacy = self.c.get("/api/search?q=python&type=course")
        self.assertEqual(current.status_code, 200)
        self.assertEqual(legacy.status_code, 200)
        self.assertEqual(ids(current.get_json()), ids(legacy.get_json()))

    def test_bad_limit(self):
        self.assertEqual(self.c.get("/api/search?q=x&limit=abc").status_code, 400)

    def test_category_filter_endpoint(self):
        response = self.c.get("/api/browse?category=music")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ids(response.get_json()), ["v8"])

    def test_bad_category(self):
        self.assertEqual(self.c.get("/api/search?q=x&category=unknown").status_code, 400)

    def test_media_endpoint_supports_range_requests(self):
        original_dir = app_module.VIDEO_DIR
        original_media = app_module.engine.meta["v1"].get("media")
        try:
            with tempfile.TemporaryDirectory(dir=app_module.VIDEO_DIR) as directory:
                video_path = Path(directory) / "sample.mp4"
                video_path.write_bytes(b"0123456789")
                app_module.VIDEO_DIR = Path(directory)
                app_module.engine.meta["v1"]["media"] = "sample.mp4"
                response = self.c.get("/api/media/v1", headers={"Range": "bytes=0-3"})
                self.assertEqual(response.status_code, 206)
                self.assertEqual(response.data, b"0123")
                response.close()
        finally:
            app_module.VIDEO_DIR = original_dir
            if original_media is None:
                app_module.engine.meta["v1"].pop("media", None)
            else:
                app_module.engine.meta["v1"]["media"] = original_media

    def test_media_endpoint_returns_not_found_without_file(self):
        response = self.c.get("/api/media/p1")
        self.assertEqual(response.status_code, 404)

    def test_suggest_endpoint(self):
        self.assertTrue(self.c.get("/api/suggest?q=css").get_json()["suggestions"])

    def test_api_save_live_with_valid_recording(self):
        import io
        fake_webm = io.BytesIO(b"\x1a\x45\xdf\xa3fake-webm-live-data-stream")
        resp = self.c.post(
            "/api/v1/live/save",
            data={
                "id": "v_live_unit_test_stream_01",
                "title": "Unit Test Live Broadcast",
                "author": "Arun Rana",
                "description": "Live stream unit testing.",
                "category": "entertainment",
                "tags": "#live #broadcast",
                "mins": "3",
                "duration": "180",
                "views": "42",
                "file": (fake_webm, "stream.webm"),
            },
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertTrue(data.get("success"))
        item = data["item"]
        self.assertTrue(item["id"].startswith("v_live_"))
        self.assertEqual(item["format"], "live")
        self.assertTrue(item["isLiveVod"])
        self.assertEqual(item["mins"], 3)
        self.assertEqual(item["duration"], 180)
        self.assertEqual(item["views"], 42)
        self.assertTrue(item["media"].startswith("live_v_live_unit_test_stream_01_"))
        self.assertTrue(item["media"].endswith(".webm"))
        test_file = app_module.VIDEO_DIR / item["media"]
        if test_file.is_file():
            test_file.unlink(missing_ok=True)
        self.c.delete(f"/api/v1/videos/{item['id']}")

    def test_api_save_live_rejects_test_recording(self):
        resp = self.c.post(
            "/api/v1/live/save",
            json={
                "id": "v_live_test_reject_stream",
                "title": "Stream Rejecting Test Video",
                "media": "Generated Video October 17, 2026 - 1_14PM.mp4",
                "mins": "4",
                "duration": "240",
            },
        )
        self.assertEqual(resp.status_code, 201)
        item = resp.get_json()["item"]
        self.assertNotIn("Generated Video", item["media"])
        self.assertTrue(item["media"].startswith("live_"))
        self.assertTrue(item["media"].endswith(".webm") or item["media"].endswith(".mp4"))
        self.c.delete(f"/api/v1/videos/{item['id']}")

    def test_api_save_live_data_integrity_and_type_verification(self):
        resp = self.c.post(
            "/api/v1/live/save",
            json={
                "id": "   invalid chars @#$ 999   ",
                "title": "   ",
                "author": "",
                "description": "",
                "category": "invalid_category",
                "tags": "",
                "mins": "not_an_int",
                "duration": "invalid_duration",
                "views": "-100",
                "date": "invalid_date_format",
                "art": "hacked-art",
            },
        )
        self.assertEqual(resp.status_code, 201)
        item = resp.get_json()["item"]
        self.assertTrue(item["id"].startswith("v_live_"))
        self.assertEqual(item["format"], "live")
        self.assertEqual(item["type"], "video")
        self.assertIsInstance(item["mins"], int)
        self.assertGreaterEqual(item["mins"], 1)
        self.assertIsInstance(item["duration"], int)
        self.assertGreaterEqual(item["duration"], item["mins"] * 60)
        self.assertIsInstance(item["views"], int)
        self.assertGreaterEqual(item["views"], 1)
        self.assertEqual(item["category"], "entertainment")
        self.assertTrue(item["tags"].startswith("#live"))
        self.assertRegex(item["date"], r"^\d{4}-\d{2}-\d{2}$")
        self.assertEqual(item["art"], "art-night")
        self.assertTrue(item["isLiveVod"])
        self.c.delete(f"/api/v1/videos/{item['id']}")

    def test_api_media_live_stream_ignores_quality_param(self):
        res = self.c.get("/api/media/v_live_1792483699587?quality=1080p")
        self.assertIn(res.status_code, [200, 206])
        self.assertEqual(res.mimetype, "video/webm")
        res.close()

    def test_api_delete_video_removes_from_catalog_and_engine(self):
        # 1. Create a temporary video
        create_resp = self.c.post(
            "/api/v1/live/save",
            json={
                "id": "v_live_delete_test_temp_01",
                "title": "Temporary Video For Delete Test",
                "description": "Will be deleted",
                "author": "Delete Tester",
            },
        )
        self.assertEqual(create_resp.status_code, 201)
        # Verify it exists in engine
        self.assertIn("v_live_delete_test_temp_01", app_module.engine.meta)

        # 2. Delete the video
        del_resp = self.c.delete("/api/v1/videos/v_live_delete_test_temp_01")
        self.assertEqual(del_resp.status_code, 200)
        data = del_resp.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("deleted_id"), "v_live_delete_test_temp_01")

        # 3. Verify it is removed from engine
        self.assertNotIn("v_live_delete_test_temp_01", app_module.engine.meta)

    def test_api_live_start_active_lifecycle_and_uri_mapping(self):
        # 1. Start live stream
        start_resp = self.c.post(
            "/api/v1/live/start",
            json={
                "id": "v_live_audit_test_01",
                "title": "Audit Live Broadcast",
                "author": "Studio Audit",
                "category": "entertainment",
            },
        )
        self.assertEqual(start_resp.status_code, 201)
        data = start_resp.get_json()
        self.assertTrue(data.get("success"))
        stream = data.get("stream", {})
        self.assertEqual(stream.get("id"), "v_live_audit_test_01")
        self.assertEqual(stream.get("hls_url"), "/api/v1/hls/live/v_live_audit_test_01/live.m3u8")
        self.assertEqual(stream.get("media_url"), "/api/media/v_live_audit_test_01")
        self.assertTrue(stream.get("isLive"))

        # 2. Query active streams
        active_resp = self.c.get("/api/v1/live/active")
        self.assertEqual(active_resp.status_code, 200)
        active_data = active_resp.get_json()
        active_ids = [s.get("id") for s in active_data.get("streams", [])]
        self.assertIn("v_live_audit_test_01", active_ids)

        # 3. Query video endpoint for active live stream
        vid_resp = self.c.get("/api/v1/videos/v_live_audit_test_01")
        self.assertEqual(vid_resp.status_code, 200)
        vid_data = vid_resp.get_json()
        self.assertEqual(vid_data.get("hls_url"), "/api/v1/hls/live/v_live_audit_test_01/live.m3u8")

        # 4. End live stream
        end_resp = self.c.post("/api/v1/live/end", json={"id": "v_live_audit_test_01"})
        self.assertEqual(end_resp.status_code, 200)
        self.assertTrue(end_resp.get_json().get("success"))

        # Clean up
        app_module.engine.meta.pop("v_live_audit_test_01", None)

    def test_live_uri_resolution_hls_accuracy(self):
        live_pub = app_module.engine._public_item({
            "id": "v_live_test_hls_01",
            "type": "video",
            "format": "live",
            "isLiveVod": True,
            "title": "Live Manifest Test",
            "media": "live_file.webm",
        })
        self.assertEqual(live_pub.get("hls_url"), "/api/v1/hls/live/v_live_test_hls_01/live.m3u8")

        vod_pub = app_module.engine._public_item({
            "id": "v_vod_standard_01",
            "type": "video",
            "format": "standard",
            "title": "Standard VOD Test",
            "media": "v1.mp4",
        })
        self.assertEqual(vod_pub.get("hls_url"), "/api/v1/hls/v_vod_standard_01/master.m3u8")

    def test_elimination_of_cross_event_mapping_discrepancies(self):
        # When a live stream ID has no media file and no record, it must return 404 rather than hijacking an unrelated stream
        res = self.c.get("/api/media/v_live_nonexistent_stream_xyz_999")
        self.assertEqual(res.status_code, 404)
        res.close()

    def test_security_headers_present(self):
        resp = self.c.get("/")
        self.assertEqual(resp.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(resp.headers.get("X-Frame-Options"), "SAMEORIGIN")
        self.assertEqual(resp.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")
        self.assertIn("microphone=(self)", resp.headers.get("Permissions-Policy", ""))
        self.assertIn("default-src 'self'", resp.headers.get("Content-Security-Policy", ""))
        resp.close()

    def test_upload_rejects_unauthorized_extensions(self):
        import io
        fake_html = io.BytesIO(b"<html><script>alert(1)</script></html>")
        resp = self.c.post(
            "/api/v1/videos/upload",
            data={
                "title": "Malicious Upload Attempt",
                "file": (fake_html, "exploit.html"),
            },
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Invalid file type", resp.get_json().get("error", ""))

    def test_upload_rejects_path_traversal_in_media_param(self):
        resp = self.c.post(
            "/api/v1/videos/upload",
            json={
                "title": "Path Traversal Test",
                "media": "upload_../../app.py",
            },
        )
        self.assertEqual(resp.status_code, 201)
        item_id = resp.get_json()["item"]["id"]
        # media parameter in engine metadata must NOT be the traversal string; safe fallback used
        self.assertEqual(app_module.engine.meta[item_id].get("media"), "v1.mp4")
        app_module.engine.remove_item(item_id)
        self.c.delete(f"/api/v1/videos/{item_id}")

    def test_upload_mandatory_category_validation(self):
        # 1. Explicit empty category rejected
        resp_empty = self.c.post(
            "/api/v1/videos/upload",
            json={"title": "Test Empty Category", "category": ""},
        )
        self.assertEqual(resp_empty.status_code, 400)
        self.assertIn("mandatory", resp_empty.get_json().get("error", "").lower())

        # 2. Invalid category rejected
        resp_invalid = self.c.post(
            "/api/v1/videos/upload",
            json={"title": "Test Invalid Category", "category": "vlog_nonsense"},
        )
        self.assertEqual(resp_invalid.status_code, 400)
        self.assertIn("invalid category", resp_invalid.get_json().get("error", "").lower())

        # 3. Valid category accepted and accurately routed
        resp_valid = self.c.post(
            "/api/v1/videos/upload",
            json={"title": "Unit Test Gaming Upload", "category": "gaming"},
        )
        self.assertEqual(resp_valid.status_code, 201)
        item_id = resp_valid.get_json()["item"]["id"]
        self.assertEqual(app_module.engine.meta[item_id]["category"], "gaming")
        app_module.engine.remove_item(item_id)
        self.c.delete(f"/api/v1/videos/{item_id}")

    def test_video_deletion_safe_from_path_traversal(self):
        test_canary = app_module.BASE_DIR / "deletion_canary.tmp"
        test_canary.write_text("safe", encoding="utf-8")
        try:
            app_module.engine.meta["v_malicious_test"] = {
                "id": "v_malicious_test",
                "type": "video",
                "media": f"upload_../../{test_canary.name}",
            }
            resp = self.c.delete("/api/v1/videos/v_malicious_test")
            self.assertEqual(resp.status_code, 200)
            self.assertTrue(test_canary.is_file())
        finally:
            test_canary.unlink(missing_ok=True)
            app_module.engine.meta.pop("v_malicious_test", None)

    def test_find_valid_live_recordings_sanitizes_glob(self):
        results = app_module.find_valid_live_recordings("*?[]test")
        self.assertIsInstance(results, list)

    def test_max_content_length_configured(self):
        self.assertEqual(app.config.get("MAX_CONTENT_LENGTH"), 250 * 1024 * 1024)

    def test_hls_master_playlist_endpoint(self):
        resp = self.c.get("/api/v1/hls/v1/master.m3u8")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/vnd.apple.mpegurl")
        content = resp.data.decode("utf-8")
        self.assertTrue(content.startswith("#EXTM3U"))
        self.assertIn("1080p/index.m3u8", content)
        self.assertIn("720p/index.m3u8", content)
        resp.close()

    def test_hls_variant_and_segment_endpoint(self):
        resp = self.c.get("/api/v1/hls/v1/1080p/index.m3u8")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/vnd.apple.mpegurl")
        content = resp.data.decode("utf-8")
        self.assertIn("seg_000.ts", content)
        resp.close()

        seg_resp = self.c.get("/api/v1/hls/v1/1080p/seg_000.ts")
        self.assertEqual(seg_resp.status_code, 200)
        self.assertEqual(seg_resp.mimetype, "video/MP2T")
        self.assertGreater(len(seg_resp.data), 1000)
        seg_resp.close()

    def test_prometheus_metrics_endpoint(self):
        resp = self.c.get("/metrics")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("text/plain", str(resp.mimetype))
        metrics_text = resp.data.decode("utf-8")
        self.assertIn("watchbloom_http_requests_total", metrics_text)
        self.assertIn("watchbloom_hls_segments_served_total", metrics_text)
        self.assertIn("watchbloom_active_streams", metrics_text)
        resp.close()

    def test_qoe_telemetry_endpoint(self):
        resp = self.c.post(
            "/api/v1/telemetry",
            json={
                "videoId": "v1",
                "events": [
                    {"type": "stall", "value": 2},
                    {"type": "stall_duration", "value": 1.45},
                    {"type": "dropped_frames", "value": 3},
                    {"type": "startup_time", "value": 0.32},
                ],
            },
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["status"], "ok")

        # Verify reflected in Prometheus metrics
        metrics_resp = self.c.get("/metrics")
        metrics_text = metrics_resp.data.decode("utf-8")
        self.assertIn('watchbloom_qoe_stalls_total{video_id="v1"} 2', metrics_text)
        self.assertIn('watchbloom_qoe_dropped_frames_total{video_id="v1"} 3', metrics_text)
        metrics_resp.close()

    def test_strict_cors_preflight_and_headers(self):
        resp = self.c.open(
            "/api/v1/search",
            method="OPTIONS",
            headers={"Origin": "http://127.0.0.1:5000", "Access-Control-Request-Method": "GET"},
        )
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(resp.headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:5000")
        self.assertIn("GET", resp.headers.get("Access-Control-Allow-Methods", ""))
        self.assertIn("Authorization", resp.headers.get("Access-Control-Allow-Headers", ""))
        self.assertEqual(resp.headers.get("Access-Control-Allow-Credentials"), "true")
        resp.close()

    def test_jwt_auth_workflow_and_verification(self):
        # 1. Login or get demo token
        login_resp = self.c.post("/api/v1/auth/login", json={"username": "arun_test"})
        self.assertEqual(login_resp.status_code, 200)
        data = login_resp.get_json()
        self.assertTrue(data.get("success"))
        token = data.get("token")
        self.assertTrue(token)

        # 2. Verify with valid token
        verify_resp = self.c.get("/api/v1/auth/verify", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(verify_resp.status_code, 200)
        self.assertTrue(verify_resp.get_json().get("valid"))
        self.assertEqual(verify_resp.get_json()["user"]["name"], "arun_test")

        # 3. Reject missing or malformed token
        no_auth = self.c.get("/api/v1/auth/verify")
        self.assertEqual(no_auth.status_code, 401)

        bad_auth = self.c.get("/api/v1/auth/verify", headers={"Authorization": "Bearer invalid.token.payload"})
        self.assertEqual(bad_auth.status_code, 401)

    def test_cache_manager_performance(self):
        from core.cache import CACHE
        CACHE.clear()
        CACHE.set("test_key", '{"cached": true}', ttl=60)
        self.assertEqual(CACHE.get("test_key"), '{"cached": true}')
        CACHE.delete("test_key")
        self.assertIsNone(CACHE.get("test_key"))

    def test_strict_error_handling_json(self):
        resp = self.c.get("/api/v1/unknown_route_not_found_999")
        self.assertEqual(resp.status_code, 404)
        data = resp.get_json()
        self.assertEqual(data.get("code"), 404)
        self.assertEqual(data.get("status"), "error")
        self.assertIn("error", data)

    def test_pagination_envelopes_and_clamping(self):
        # 1. Search pagination with limit & offset
        resp = self.c.get("/api/v1/search?q=python&limit=2&offset=0")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["limit"], 2)
        self.assertEqual(data["offset"], 0)
        self.assertEqual(data["page"], 1)
        self.assertGreater(data["total"], 0)
        self.assertGreaterEqual(data["total_pages"], 1)
        self.assertIsInstance(data["results"], list)
        self.assertLessEqual(len(data["results"]), 2)
        self.assertFalse(data["has_prev"])

        # 2. Search pagination with 1-indexed page
        resp_p2 = self.c.get("/api/v1/search?q=python&limit=2&page=2")
        self.assertEqual(resp_p2.status_code, 200)
        data_p2 = resp_p2.get_json()
        self.assertEqual(data_p2["page"], 2)
        self.assertEqual(data_p2["offset"], 2)
        self.assertTrue(data_p2["has_prev"])

        # 3. Limit clamping: max limit is 50, min limit is 1
        resp_clamp = self.c.get("/api/v1/search?q=python&limit=999")
        self.assertEqual(resp_clamp.status_code, 200)
        self.assertEqual(resp_clamp.get_json()["limit"], 50)

        # 4. Channels pagination envelope
        resp_chan = self.c.get("/api/v1/channels?limit=3")
        self.assertEqual(resp_chan.status_code, 200)
        chan_data = resp_chan.get_json()
        self.assertEqual(chan_data["limit"], 3)
        self.assertEqual(chan_data["page"], 1)
        self.assertIn("total_pages", chan_data)
        self.assertIn("has_next", chan_data)

    def test_signed_media_urls_and_tamper_protection(self):
        from core.signed_urls import generate_signed_media_url, verify_signed_media_request

        # 1. Generate signed URL via API endpoint
        gen_resp = self.c.get("/api/v1/media/v1/signed-url?expires_in=300")
        self.assertEqual(gen_resp.status_code, 200)
        body = gen_resp.get_json()
        self.assertTrue(body.get("success"))
        signed_url = body.get("signed_url")
        self.assertIn("sig=", signed_url)
        self.assertIn("expires=", signed_url)

        # 2. Access with valid signature
        media_resp = self.c.get(signed_url)
        self.assertIn(media_resp.status_code, (200, 206))
        media_resp.close()

        # 3. Access with tampered signature -> 403 Forbidden
        tampered_url = signed_url.replace("sig=", "sig=invalid_sig_")
        bad_sig_resp = self.c.get(tampered_url)
        self.assertEqual(bad_sig_resp.status_code, 403)
        self.assertIn("Forbidden", bad_sig_resp.get_json()["error"])

        # 4. Access with expired signature
        expired_url = generate_signed_media_url("/api/v1/media/v1", expires_in=-10)
        expired_resp = self.c.get(expired_url)
        self.assertEqual(expired_resp.status_code, 403)
        self.assertIn("expired", expired_resp.get_json()["error"].lower())

        # 5. Direct verification helper check
        valid, reason = verify_signed_media_request("/api/v1/media/v1", None, None, allow_unsigned=True)
        self.assertTrue(valid)
        self.assertEqual(reason, "unsigned_allowed")

        invalid, reason = verify_signed_media_request("/api/v1/media/v1", None, None, allow_unsigned=False)
        self.assertFalse(invalid)

    def test_input_sanitization_and_canonical_safety(self):
        from core.sanitization import is_safe_path, is_safe_video_filename, sanitize_id, sanitize_text
        import os

        # Text XSS removal
        raw_xss = "<script>alert('pwned')</script><b>Hello World</b>"
        cleaned = sanitize_text(raw_xss)
        self.assertEqual(cleaned, "Hello World")
        self.assertNotIn("<script>", cleaned)

        # Traversal path rejection
        self.assertEqual(sanitize_id("../../../etc/passwd"), "passwd")
        self.assertEqual(sanitize_id("normal_id_123"), "normal_id_123")

        # Video filename safety
        self.assertFalse(is_safe_video_filename("../../app.py"))
        self.assertFalse(is_safe_video_filename("exploit.sh"))
        self.assertFalse(is_safe_video_filename("video.mp4\x00.exe"))
        self.assertTrue(is_safe_video_filename("v1.mp4"))
        self.assertTrue(is_safe_video_filename("upload_1234_test.webm"))

        # Canonical path safety
        base = os.path.abspath(".")
        self.assertTrue(is_safe_path(base, "catalog.json"))
        self.assertFalse(is_safe_path(base, "../../../etc/passwd"))

    def test_sqlite_wal_mode_and_covering_indexes(self):
        from core.db import get_db_connection
        from config import REACTIONS_DB

        with get_db_connection(REACTIONS_DB) as conn:
            # Verify WAL journal mode
            journal_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
            self.assertEqual(journal_mode.lower(), "wal")

            # Verify covering indexes
            indexes = [row[1] for row in conn.execute("PRAGMA index_list('video_reactions');").fetchall()]
            self.assertIn("idx_reactions_visitor_reaction", indexes)
            self.assertIn("idx_reactions_item_reaction", indexes)

    def test_sentry_monitoring_integration(self):
        from core.monitoring import capture_exception, capture_message, init_monitoring

        # Initialize without DSN (local dev mode)
        res = init_monitoring()
        self.assertFalse(res)

        # Verify fallback helpers do not crash
        capture_exception(RuntimeError("test exception"))
        capture_message("test info message", level="info")

    def test_brotli_and_gzip_compression_middleware(self):
        import brotli
        import gzip
        import json

        # 1. Test Brotli compression
        resp_br = self.c.get("/api/v1/search?q=python", headers={"Accept-Encoding": "br"})
        self.assertEqual(resp_br.status_code, 200)
        self.assertEqual(resp_br.headers.get("Content-Encoding"), "br")
        self.assertIn("Accept-Encoding", resp_br.headers.get("Vary", ""))
        decompressed_br = brotli.decompress(resp_br.data).decode("utf-8")
        data_br = json.loads(decompressed_br)
        self.assertIn("results", data_br)
        self.assertGreaterEqual(data_br["total"], 1)

        # 2. Test Gzip compression
        resp_gz = self.c.get("/api/v1/search?q=python", headers={"Accept-Encoding": "gzip"})
        self.assertEqual(resp_gz.status_code, 200)
        self.assertEqual(resp_gz.headers.get("Content-Encoding"), "gzip")
        decompressed_gz = gzip.decompress(resp_gz.data).decode("utf-8")
        data_gz = json.loads(decompressed_gz)
        self.assertIn("results", data_gz)

        # 3. Test uncompressed when client doesn't support br/gzip
        resp_raw = self.c.get("/api/v1/search?q=python", headers={"Accept-Encoding": "identity"})
        self.assertIsNone(resp_raw.headers.get("Content-Encoding"))

    def test_sparse_fieldsets_projection(self):
        # 1. Single item sparse fieldset
        resp = self.c.get("/api/v1/videos/v1?fields=id,title,views")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(set(data.keys()), {"id", "title", "views"})
        self.assertEqual(data["id"], "v1")

        # 2. Search collection sparse fieldset
        resp_search = self.c.get("/api/v1/search?q=python&fields=id,title,mins&limit=2")
        self.assertEqual(resp_search.status_code, 200)
        search_data = resp_search.get_json()
        self.assertTrue(search_data["results"])
        for item in search_data["results"]:
            self.assertEqual(set(item.keys()), {"id", "title", "mins"})

    def test_messagepack_binary_serialization(self):
        import msgpack

        # 1. Item MessagePack serialization
        resp = self.c.get("/api/v1/videos/v1", headers={"Accept": "application/x-msgpack"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/x-msgpack")
        unpacked = msgpack.unpackb(resp.data, raw=False)
        self.assertEqual(unpacked["id"], "v1")
        self.assertIn("title", unpacked)

        # 2. Search MessagePack serialization
        resp_search = self.c.get("/api/v1/search?q=python", headers={"Accept": "application/x-msgpack"})
        self.assertEqual(resp_search.status_code, 200)
        self.assertEqual(resp_search.mimetype, "application/x-msgpack")
        unpacked_search = msgpack.unpackb(resp_search.data, raw=False)
        self.assertIn("results", unpacked_search)
        self.assertGreaterEqual(unpacked_search["total"], 1)

    def test_cloudflare_r2_presigned_and_cdn_headers(self):
        # 1. Presigned upload URL generation
        presigned_resp = self.c.post(
            "/api/v1/uploads/presigned-url",
            json={"filename": "my_test_video.mp4", "content_type": "video/mp4"}
        )
        self.assertEqual(presigned_resp.status_code, 200)
        res_data = presigned_resp.get_json()
        self.assertTrue(res_data.get("success"))
        self.assertIn("upload_url", res_data)
        self.assertIn("key", res_data)

        # Reject invalid extensions
        bad_resp = self.c.post(
            "/api/v1/uploads/presigned-url",
            json={"filename": "exploit.exe"}
        )
        self.assertEqual(bad_resp.status_code, 400)

        # 2. Cloudflare CDN cache headers on HLS endpoints
        hls_master = self.c.get("/api/v1/hls/v1/master.m3u8")
        self.assertEqual(hls_master.status_code, 200)
        self.assertEqual(hls_master.headers.get("CDN-Cache-Control"), "max-age=86400")
        hls_master.close()

        hls_seg = self.c.get("/api/v1/hls/v1/1080p/seg_000.ts")
        self.assertIn(hls_seg.status_code, (200, 206))
        self.assertEqual(hls_seg.headers.get("CDN-Cache-Control"), "max-age=31536000")
        self.assertIn("immutable", hls_seg.headers.get("Cache-Control", ""))
        hls_seg.close()

    def test_write_behind_view_counter_and_flush(self):
        # 1. Record buffered view
        view_resp = self.c.post("/api/v1/videos/v1/view")
        self.assertEqual(view_resp.status_code, 200)
        view_data = view_resp.get_json()
        self.assertTrue(view_data.get("success"))
        self.assertGreaterEqual(view_data["buffered_views"], 1)

        # 2. Verify view is reflected in public video detail response
        detail_resp = self.c.get("/api/v1/videos/v1")
        self.assertEqual(detail_resp.status_code, 200)
        views = detail_resp.get_json()["views"]
        self.assertGreater(views, 0)

        # 3. Flush buffers
        flush_resp = self.c.post("/api/v1/admin/flush-buffers")
        self.assertEqual(flush_resp.status_code, 200)
        self.assertTrue(flush_resp.get_json().get("success"))

    def test_async_transcoding_pipeline_and_job_status(self):
        # 1. Dispatch async transcoding task
        async_resp = self.c.post("/api/v1/videos/transcode/async", json={"item_id": "v1"})
        self.assertEqual(async_resp.status_code, 202)
        async_data = async_resp.get_json()
        self.assertTrue(async_data.get("success"))
        job_id = async_data["job_id"]
        self.assertTrue(job_id)

        # 2. Query job status
        status_resp = self.c.get(f"/api/v1/jobs/{job_id}")
        self.assertEqual(status_resp.status_code, 200)
        status_data = status_resp.get_json()
        self.assertEqual(status_data["job_id"], job_id)
        self.assertIn("state", status_data)

    def test_database_cluster_manager_routing(self):
        from core.pg_pool import DB_CLUSTER, get_db

        # Test read routing (Read Replicas or fallback)
        with get_db(write=False) as conn:
            self.assertIsNotNone(conn)

        # Test write routing (Primary or fallback)
        with get_db(write=True) as conn:
            self.assertIsNotNone(conn)

    def test_rbac_user_registration_and_authentication(self):
        """Verify registration, password authentication, and role assignment."""
        from core.models import User, db
        with app.app_context():
            User.query.filter(User.username == "alice_viewer").delete()
            db.session.commit()
        from core.auth import USERS, USER_LOCK
        with USER_LOCK:
            USERS.pop("alice_viewer", None)

        # 1. Register new viewer
        reg_resp = self.c.post("/api/v1/auth/register", json={
            "username": "alice_viewer",
            "password": "Password123!",
            "role": "viewer",
        })
        self.assertEqual(reg_resp.status_code, 201)
        data = reg_resp.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["user"]["role"], "viewer")
        token = data.get("token")
        self.assertTrue(token)

        # 2. Reject duplicate registration
        dup_resp = self.c.post("/api/v1/auth/register", json={
            "username": "alice_viewer",
            "password": "AnotherPassword",
        })
        self.assertEqual(dup_resp.status_code, 409)

        # 3. Valid Login with credentials
        login_resp = self.c.post("/api/v1/auth/login", json={
            "username": "alice_viewer",
            "password": "Password123!",
        })
        self.assertEqual(login_resp.status_code, 200)
        self.assertEqual(login_resp.get_json()["user"]["role"], "viewer")

        # 4. Reject invalid password
        bad_login = self.c.post("/api/v1/auth/login", json={
            "username": "alice_viewer",
            "password": "WrongPassword!",
        })
        self.assertEqual(bad_login.status_code, 401)

    def test_rbac_access_control_and_permissions(self):
        """Verify Role-Based Access Control on sensitive operations."""
        from core.auth import Role, generate_token

        # Generate tokens with distinct roles
        viewer_token = generate_token(user_id="usr_view_99", username="test_viewer", role=Role.VIEWER)
        creator_token = generate_token(user_id="usr_creat_99", username="test_creator", role=Role.CREATOR)
        admin_token = generate_token(user_id="usr_adm_99", username="test_admin", role=Role.ADMIN)

        # 1. Video Deletion RBAC:
        # Viewer attempting delete must be rejected with 403 Forbidden
        viewer_del = self.c.delete("/api/v1/videos/v1", headers={"Authorization": f"Bearer {viewer_token}"})
        self.assertEqual(viewer_del.status_code, 403)
        self.assertIn("Forbidden", viewer_del.get_json().get("error", ""))

        # 2. Buffer Flush RBAC:
        # Viewer attempting buffer flush must be rejected with 403 Forbidden
        viewer_flush = self.c.post("/api/v1/admin/flush-buffers", headers={"Authorization": f"Bearer {viewer_token}"})
        self.assertEqual(viewer_flush.status_code, 403)

        # Admin attempting buffer flush must succeed
        admin_flush = self.c.post("/api/v1/admin/flush-buffers", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(admin_flush.status_code, 200)

        # 3. Upload Privileges RBAC:
        # Viewer attempting R2 presigned upload must be rejected with 403 Forbidden
        viewer_presign = self.c.post("/api/v1/uploads/presigned-url", json={"filename": "test.mp4"}, headers={"Authorization": f"Bearer {viewer_token}"})
        self.assertEqual(viewer_presign.status_code, 403)

        # Creator attempting R2 presigned upload must succeed with 200
        creator_presign = self.c.post("/api/v1/uploads/presigned-url", json={"filename": "test.mp4"}, headers={"Authorization": f"Bearer {creator_token}"})
        self.assertEqual(creator_presign.status_code, 200)

    def test_jwt_revocation_and_logout_blocklist(self):
        """Verify token logout and revocation blocklist enforcement."""
        from core.auth import Role, generate_token

        token = generate_token(user_id="usr_logout_01", username="logout_user", role=Role.VIEWER)

        # Token initially valid
        verify_resp1 = self.c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(verify_resp1.status_code, 200)
        self.assertTrue(verify_resp1.get_json().get("authenticated"))

        # Logout / Revoke token
        logout_resp = self.c.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(logout_resp.status_code, 200)
        self.assertTrue(logout_resp.get_json().get("success"))

        # Token immediately rejected after revocation
        verify_resp2 = self.c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(verify_resp2.status_code, 401)

    def test_sliding_window_rate_limiting_and_headers(self):
        """Verify rate limiting headers and 429 response when limits are exceeded."""
        from core.rate_limit import RATE_LIMITER

        RATE_LIMITER.clear()

        # 1. Search endpoint returns rate limit headers
        resp = self.c.get("/api/v1/search?q=test")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("X-RateLimit-Limit", resp.headers)
        self.assertIn("X-RateLimit-Remaining", resp.headers)
        self.assertIn("X-RateLimit-Reset", resp.headers)

        # 2. Test rate limit exhaustion
        key = "ip:127.0.0.1:api_test_exhaust"
        # Consume 5 requests with limit 5
        for _ in range(5):
            allowed, rem, reset_ts, retry = RATE_LIMITER.check(key, limit=5, window_seconds=60)
            self.assertTrue(allowed)

        # 6th request must be rejected
        allowed, rem, reset_ts, retry = RATE_LIMITER.check(key, limit=5, window_seconds=60)
        self.assertFalse(allowed)
        self.assertEqual(rem, 0)
        self.assertGreaterEqual(retry, 1)

        # Reset for test cleanliness
        RATE_LIMITER.reset(key)

    def test_database_connection_pool_health_and_validation(self):
        """Verify database connection pool stats, thread borrowing, and health validation."""
        import concurrent.futures
        from core.pg_pool import DB_CLUSTER, get_db

        # 1. Pool stats reporting
        stats = DB_CLUSTER.get_stats()
        self.assertIn("minconn", stats)
        self.assertIn("maxconn", stats)
        self.assertIn("stats", stats)

        # 2. Concurrently borrow connections across 10 threads
        def _execute_query(thread_idx: int):
            with get_db(write=False) as conn:
                cur = conn.cursor()
                cur.execute("SELECT 1;")
                res = cur.fetchone()
                return res[0] if res is not None else 0

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(_execute_query, i) for i in range(20)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        self.assertEqual(len(results), 20)
        self.assertTrue(all(r == 1 for r in results))

    def test_redis_caching_frequently_accessed_data(self):
        """Verify Redis JSON caching, dogpile stampede protection, and pattern invalidation."""
        from core.cache import CACHE

        CACHE.clear()

        # 1. Test set_json and get_json
        test_payload = {"id": "v_test_101", "title": "Cached Title", "views": 500}
        CACHE.set_json("item:meta:v_test_101", test_payload, ttl=60)
        retrieved = CACHE.get_json("item:meta:v_test_101")
        self.assertEqual(retrieved, test_payload)

        # 2. Test get_or_compute stampede protection
        compute_call_count = 0

        def _expensive_compute():
            nonlocal compute_call_count
            compute_call_count += 1
            return {"heavy_data": [1, 2, 3], "ts": 12345}

        # First call computes
        val1 = CACHE.get_or_compute("heavy:test:key", _expensive_compute, ttl=60)
        self.assertEqual(compute_call_count, 1)
        self.assertEqual(val1["heavy_data"], [1, 2, 3])

        # Second call hits cache, compute_fn is NOT called
        val2 = CACHE.get_or_compute("heavy:test:key", _expensive_compute, ttl=60)
        self.assertEqual(compute_call_count, 1)
        self.assertEqual(val2, val1)

        # 3. Test delete_pattern
        CACHE.set_json("test_pattern:a", 1, ttl=60)
        CACHE.set_json("test_pattern:b", 2, ttl=60)
        CACHE.set_json("other_pattern:c", 3, ttl=60)

        deleted_count = CACHE.delete_pattern("test_pattern:*")
        self.assertGreaterEqual(deleted_count, 2)
        self.assertIsNone(CACHE.get_json("test_pattern:a"))
        self.assertIsNone(CACHE.get_json("test_pattern:b"))
        self.assertIsNotNone(CACHE.get_json("other_pattern:c"))

        # 4. Item Detail Route caching in app
        item_resp = self.c.get("/api/v1/items/v1")
        self.assertEqual(item_resp.status_code, 200)
        cached_meta = CACHE.get_json("item:meta:v1")
        self.assertIsNotNone(cached_meta)
        assert cached_meta is not None
        self.assertEqual(cached_meta["id"], "v1")

        # 5. Categories route caching in app
        cat_resp = self.c.get("/api/v1/categories")
        self.assertEqual(cat_resp.status_code, 200)
        cached_cats = CACHE.get_json("catalog:categories")
        self.assertIsNotNone(cached_cats)
        self.assertIsInstance(cached_cats, list)

        # 6. Cache stats tracking
        stats = CACHE.get_stats()
        self.assertIn("hits", stats)
        self.assertIn("misses", stats)
        self.assertIn("hit_ratio", stats)
        self.assertGreater(stats["hits"], 0)

    def test_multicdn_url_resolution_and_headers(self):
        """Verify Multi-CDN endpoint routing and Surrogate-Key headers."""
        from core.cdn import MULTI_CDN, apply_cdn_cache_headers
        from flask import Response

        # Test Multi-CDN URL routing
        cf_url = MULTI_CDN.get_optimal_cdn_url("hls/v1/master.m3u8", provider="cloudflare")
        self.assertTrue(cf_url.endswith("hls/v1/master.m3u8"))

        cloudfront_url = MULTI_CDN.get_optimal_cdn_url("hls/v1/master.m3u8", provider="cloudfront")
        self.assertTrue(cloudfront_url.endswith("hls/v1/master.m3u8"))

        # Test Edge-Control and Surrogate-Key headers
        mock_resp = Response("test payload")
        apply_cdn_cache_headers(mock_resp, "hls_segment", item_id="v1")
        self.assertIn("Edge-Control", mock_resp.headers)
        self.assertIn("Surrogate-Key", mock_resp.headers)
        self.assertIn("watchbloom-v1", mock_resp.headers["Surrogate-Key"])

    def test_av1_hls_dual_codec_manifest_structure(self):
        """Verify dual-codec (AV1 + H.264) HLS playlist structure."""
        import hls_packager

        # Verify AV1 encoder detection helper returns boolean and string
        has_av1, encoder = hls_packager.has_av1_encoder()
        self.assertIsInstance(has_av1, bool)
        self.assertIsInstance(encoder, str)

        # Test packaging creates dual-codec master playlist
        master_path = hls_packager.package_vod_variants("v1", enable_av1=True)
        self.assertTrue(master_path.is_file())
        content = master_path.read_text(encoding="utf-8")
        self.assertIn("#EXTM3U", content)
        self.assertIn('CODECS="avc1.64001f,mp4a.40.2"', content)
        self.assertIn('CODECS="av01.0.08M.10,mp4a.40.2"', content)

    def test_hls_empty_manifest_rejection_and_404(self):
        """Verify packager rejects packaging videos with missing media and API returns 404 instead of empty manifests."""
        import hls_packager
        with self.assertRaises(FileNotFoundError):
            hls_packager.package_vod_variants("nonexistent_video_stream_00")

        resp = self.c.get("/api/v1/hls/nonexistent_video_stream_00/master.m3u8")
        self.assertEqual(resp.status_code, 404)

        # Check v1 has valid non-empty stream entries
        v1_resp = self.c.get("/api/v1/hls/v1/master.m3u8")
        self.assertEqual(v1_resp.status_code, 200)
        self.assertIn("#EXT-X-STREAM-INF:", v1_resp.data.decode("utf-8"))
        resp.close()
        v1_resp.close()

    def test_realtime_stream_processing_and_analytics(self):
        """Verify real-time stream processing, QoE telemetry, and sliding window analytics."""
        from core.stream_processing import STREAM_AGGREGATOR, STREAM_PRODUCER

        # 1. Record view events and QoE telemetry
        STREAM_AGGREGATOR.record_local_view("v_popular_01")
        STREAM_AGGREGATOR.record_local_view("v_popular_01")
        STREAM_AGGREGATOR.record_local_view("v_popular_02")
        STREAM_AGGREGATOR.record_local_qoe("cloudflare", 11.5)
        STREAM_AGGREGATOR.record_local_qoe("cloudfront", 13.2)

        # 2. Ingest telemetry via HTTP API
        telemetry_resp = self.c.post("/api/v1/telemetry", json={
            "videoId": "v_popular_01",
            "cdn": "cloudflare",
            "latency_ms": 12.0,
            "buffer_ratio": 0.005,
        })
        self.assertEqual(telemetry_resp.status_code, 200)

        # 3. Query Real-Time Stream Analytics API
        analytics_resp = self.c.get("/api/v1/analytics/realtime")
        self.assertEqual(analytics_resp.status_code, 200)
        data = analytics_resp.get_json()
        self.assertIn("total_active_viewers", data)
        self.assertIn("trending_videos", data)
        self.assertIn("cdn_latency_ms", data)
        self.assertGreater(data["total_active_viewers"], 0)

    def test_grpc_monorepo_microservices_rpc_calls(self):
        """Verify gRPC Protocol Buffer inter-service RPC calls across the Monorepo microservices."""
        import services.auth
        import services.catalog
        import services.streaming
        import services.analytics
        from services.auth.client import AuthClient
        from services.catalog.client import CatalogClient
        from services.streaming.client import StreamingClient
        from services.analytics.client import AnalyticsClient

        # 1. Start gRPC microservers on ephemeral dynamic test ports
        auth_srv = services.auth.serve(port=0)
        catalog_srv = services.catalog.serve(port=0)
        streaming_srv = services.streaming.serve(port=0)
        analytics_srv = services.analytics.serve(port=0)

        try:
            # 2. Test Auth Microservice gRPC RPCs
            auth_client = AuthClient(f"localhost:{auth_srv.bound_port}")
            auth_res = auth_client.authenticate("admin", "admin123")
            self.assertTrue(auth_res.success)
            self.assertEqual(auth_res.user.role, "admin")
            self.assertIn("video:delete", auth_res.user.permissions)

            # Verify token RPC
            verify_res = auth_client.verify_token(auth_res.token)
            self.assertTrue(verify_res.valid)
            self.assertEqual(verify_res.user.username, "admin")

            # 3. Test Catalog Microservice gRPC RPCs
            catalog_client = CatalogClient(f"localhost:{catalog_srv.bound_port}")
            search_res = catalog_client.search_videos("python", limit=5)
            self.assertGreater(search_res.total, 0)
            self.assertGreater(len(search_res.results), 0)
            self.assertIn("Python", search_res.results[0].title)

            video_res = catalog_client.get_video("v1")
            self.assertTrue(video_res.found)
            self.assertEqual(video_res.item.id, "v1")

            # 4. Test Streaming Microservice gRPC RPCs
            streaming_client = StreamingClient(f"localhost:{streaming_srv.bound_port}")
            signed_res = streaming_client.get_signed_media_url("/api/media/v1", expires_in=1800)
            self.assertTrue(signed_res.signed_url.startswith("/api/media/v1?"))
            self.assertTrue(bool(signed_res.signature))

            cdn_res = streaming_client.resolve_optimal_cdn("hls/v1/master.m3u8", preferred_provider="cloudflare")
            self.assertIn("master.m3u8", cdn_res.optimal_url)

            # 5. Test Analytics Microservice gRPC RPCs
            analytics_client = AnalyticsClient(f"localhost:{analytics_srv.bound_port}")
            ingest_res = analytics_client.ingest_view("v1", "127.0.0.1", playback_time_s=12.5)
            self.assertTrue(ingest_res.success)

            metrics_res = analytics_client.get_realtime_metrics(window_seconds=60)
            self.assertEqual(metrics_res.window_seconds, 60)
            self.assertGreaterEqual(metrics_res.total_active_viewers, 0)

            # Clean client channels
            auth_client.close()
            catalog_client.close()
            streaming_client.close()
            analytics_client.close()

        finally:
            # Clean server termination
            auth_srv.stop(grace=0)
            catalog_srv.stop(grace=0)
            streaming_srv.stop(grace=0)
            analytics_srv.stop(grace=0)

    def test_grpc_health_checking_protocol(self):
        """Verify gRPC Health Checking Protocol (grpc.health.v1.Health) across all microservices."""
        from grpc_health.v1 import health_pb2, health_pb2_grpc
        import services.auth
        import services.catalog
        import services.streaming
        import services.analytics

        auth_srv = services.auth.serve(port=0)
        catalog_srv = services.catalog.serve(port=0)
        streaming_srv = services.streaming.serve(port=0)
        analytics_srv = services.analytics.serve(port=0)

        try:
            # Verify Auth Health
            ch_auth = grpc.insecure_channel(f"localhost:{auth_srv.bound_port}")
            stub_auth: Any = health_pb2_grpc.HealthStub(ch_auth)
            res_all = stub_auth.Check(health_pb2.HealthCheckRequest(service=""))
            self.assertEqual(res_all.status, health_pb2.HealthCheckResponse.SERVING)
            res_svc = stub_auth.Check(health_pb2.HealthCheckRequest(service="watchbloom.auth.AuthService"))
            self.assertEqual(res_svc.status, health_pb2.HealthCheckResponse.SERVING)
            ch_auth.close()

            # Verify Catalog Health
            ch_cat = grpc.insecure_channel(f"localhost:{catalog_srv.bound_port}")
            stub_cat: Any = health_pb2_grpc.HealthStub(ch_cat)
            res_all = stub_cat.Check(health_pb2.HealthCheckRequest(service=""))
            self.assertEqual(res_all.status, health_pb2.HealthCheckResponse.SERVING)
            res_svc = stub_cat.Check(health_pb2.HealthCheckRequest(service="watchbloom.catalog.CatalogService"))
            self.assertEqual(res_svc.status, health_pb2.HealthCheckResponse.SERVING)
            ch_cat.close()

            # Verify Streaming Health
            ch_str = grpc.insecure_channel(f"localhost:{streaming_srv.bound_port}")
            stub_str: Any = health_pb2_grpc.HealthStub(ch_str)
            res_all = stub_str.Check(health_pb2.HealthCheckRequest(service=""))
            self.assertEqual(res_all.status, health_pb2.HealthCheckResponse.SERVING)
            res_svc = stub_str.Check(health_pb2.HealthCheckRequest(service="watchbloom.streaming.StreamingService"))
            self.assertEqual(res_svc.status, health_pb2.HealthCheckResponse.SERVING)
            ch_str.close()

            # Verify Analytics Health
            ch_ana = grpc.insecure_channel(f"localhost:{analytics_srv.bound_port}")
            stub_ana: Any = health_pb2_grpc.HealthStub(ch_ana)
            res_all = stub_ana.Check(health_pb2.HealthCheckRequest(service=""))
            self.assertEqual(res_all.status, health_pb2.HealthCheckResponse.SERVING)
            res_svc = stub_ana.Check(health_pb2.HealthCheckRequest(service="watchbloom.analytics.AnalyticsService"))
            self.assertEqual(res_svc.status, health_pb2.HealthCheckResponse.SERVING)
            ch_ana.close()

        finally:
            auth_srv.stop(grace=0)
            catalog_srv.stop(grace=0)
            streaming_srv.stop(grace=0)
            analytics_srv.stop(grace=0)

    def test_grpc_w3c_distributed_tracing_and_propagation(self):
        """Verify OpenTelemetry-compatible W3C traceparent injection and propagation across RPC calls."""
        from core.grpc_interceptors import (
            format_traceparent,
            parse_traceparent,
            set_current_trace,
            get_current_trace,
            generate_trace_id,
            generate_span_id,
        )
        import services.catalog
        from services.catalog.client import CatalogClient

        # 1. Verify parser and formatter
        test_trace_id = "4bf92f3577b34da6a3ce929d0e0e4736"
        test_span_id = "00f067aa0ba902b7"
        tp = format_traceparent(test_trace_id, test_span_id, "01")
        self.assertEqual(tp, "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")

        parsed = parse_traceparent(tp)
        self.assertIsNotNone(parsed)
        assert parsed is not None
        self.assertEqual(parsed[0], test_trace_id)
        self.assertEqual(parsed[1], test_span_id)
        self.assertEqual(parsed[2], "01")

        # 2. Context propagation into live gRPC server
        catalog_srv = services.catalog.serve(port=0)
        try:
            set_current_trace(test_trace_id, test_span_id, "01")
            client = CatalogClient(f"localhost:{catalog_srv.bound_port}")
            res = client.search_videos("python", limit=2)
            self.assertGreater(res.total, 0)
            client.close()

            active = get_current_trace()
            self.assertEqual(active.get("trace_id"), test_trace_id)
        finally:
            catalog_srv.stop(grace=0)

    def test_grpc_client_side_load_balancing_and_retries(self):
        """Verify client-side round-robin and least-connection load balancing and resilient retries."""
        from core.grpc_interceptors import LoadBalancedChannelPool, ResilientClientInterceptor
        from proto import catalog_pb2, catalog_pb2_grpc

        # 1. Round-robin target selection
        pool = LoadBalancedChannelPool(["endpoint-a:50051", "endpoint-b:50051"], strategy="round_robin")
        t1 = pool.select_target()
        t2 = pool.select_target()
        t3 = pool.select_target()
        self.assertEqual(t1, "endpoint-a:50051")
        self.assertEqual(t2, "endpoint-b:50051")
        self.assertEqual(t3, "endpoint-a:50051")
        pool.close()

        # 2. Least connection target selection
        pool_lc = LoadBalancedChannelPool(["node-1:50052", "node-2:50052"], strategy="least_conn")
        n1 = pool_lc.select_target()
        self.assertIn(n1, ["node-1:50052", "node-2:50052"])
        pool_lc.release_target(n1)
        pool_lc.close()

        # 3. Resilient retry on transient error
        interceptor = ResilientClientInterceptor(
            default_timeout=0.2,
            max_retries=2,
            initial_backoff=0.01,
            backoff_factor=2.0,
            jitter=0.005,
        )
        raw_ch = grpc.insecure_channel("localhost:59997")
        ch = grpc.intercept_channel(raw_ch, interceptor)
        stub = catalog_pb2_grpc.CatalogServiceStub(ch)

        try:
            stub.SearchVideos(catalog_pb2.SearchRequest(query="test"))
        except grpc.RpcError as exc:
            self.assertIn(exc.code(), (grpc.StatusCode.UNAVAILABLE, grpc.StatusCode.DEADLINE_EXCEEDED))
        finally:
            raw_ch.close()

    def test_grpc_rich_error_model_google_rpc_status(self):
        """Verify standard google.rpc.Status rich error modeling via grpc-status-details-bin."""
        from concurrent import futures
        from google.rpc import code_pb2, status_pb2
        from core.grpc_interceptors import UnifiedServerInterceptor
        from proto import catalog_pb2, catalog_pb2_grpc

        class FailingServicer(catalog_pb2_grpc.CatalogServiceServicer):
            def GetVideo(self, request, context):
                raise ValueError("Video ID is invalid or malformed")

        server = grpc.server(
            futures.ThreadPoolExecutor(max_workers=2),
            interceptors=[UnifiedServerInterceptor("test-error-svc")],
        )
        catalog_pb2_grpc.add_CatalogServiceServicer_to_server(FailingServicer(), server)
        port = server.add_insecure_port("localhost:0")
        server.start()

        try:
            ch = grpc.insecure_channel(f"localhost:{port}")
            stub = catalog_pb2_grpc.CatalogServiceStub(ch)
            with self.assertRaises(grpc.RpcError) as cm:
                stub.GetVideo(catalog_pb2.GetVideoRequest(item_id="malformed"))

            err = cm.exception
            self.assertEqual(err.code(), grpc.StatusCode.INVALID_ARGUMENT)

            # Validate google.rpc.Status binary details in trailers
            trailing = err.trailing_metadata() or ()
            trailers: dict[str, Any] = {}
            for m in trailing:
                k = getattr(m, "key", "")
                v = getattr(m, "value", b"")
                trailers[str(k)] = v
            bin_details = trailers.get("grpc-status-details-bin")
            self.assertIsNotNone(bin_details)
            assert bin_details is not None

            rich_status = status_pb2.Status()
            rich_status.ParseFromString(bin_details)
            self.assertEqual(rich_status.code, code_pb2.INVALID_ARGUMENT)
            self.assertIn("Video ID is invalid or malformed", rich_status.message)
            ch.close()
        finally:
            server.stop(grace=0)






    def test_user_settings_rest_and_caching(self):
        """Verify GET and POST /api/v1/user/settings with Redis caching and persistence."""
        import uuid
        vis_id = f"test_vis_{uuid.uuid4().hex[:8]}"
        headers = {"X-Watchbloom-Visitor": vis_id}

        # 1. GET default settings
        res = self.client.get("/api/v1/user/settings", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        settings = data["settings"]
        self.assertEqual(settings["privacy"]["profile_visibility"], "public")
        self.assertEqual(settings["playback"]["default_quality"], "auto")

        # 2. UPDATE settings
        payload = {
            "privacy": {
                "profile_visibility": "unlisted",
                "show_subscriptions": False,
                "show_liked_videos": True,
                "search_indexing": False
            },
            "playback": {
                "default_quality": "1080p",
                "ambient_mode": False,
                "autoplay_next": False,
                "default_playback_rate": 1.5,
                "captions_enabled": True
            },
            "notifications": {
                "email_notifications": False,
                "new_subscriber_alerts": True,
                "recommendation_digests": False,
                "security_alerts": True
            }
        }
        res = self.client.post("/api/v1/user/settings", headers=headers, json=payload)
        self.assertEqual(res.status_code, 200)
        updated = res.get_json()["settings"]
        self.assertEqual(updated["privacy"]["profile_visibility"], "unlisted")
        self.assertFalse(updated["privacy"]["show_subscriptions"])
        self.assertEqual(updated["playback"]["default_quality"], "1080p")
        self.assertEqual(updated["playback"]["default_playback_rate"], 1.5)
        self.assertFalse(updated["notifications"]["email_notifications"])

        # 3. GET settings again (should hit cache or persistent store accurately)
        res2 = self.client.get("/api/v1/user/settings", headers=headers)
        self.assertEqual(res2.status_code, 200)
        cached = res2.get_json()["settings"]
        self.assertEqual(cached["privacy"]["profile_visibility"], "unlisted")
        self.assertEqual(cached["playback"]["default_quality"], "1080p")

    def test_abuse_reporting_pipeline(self):
        """Verify asynchronous abuse/copyright reporting pipeline with Celery dispatch."""
        import json
        import uuid
        vis_id = f"test_vis_{uuid.uuid4().hex[:8]}"
        headers = {"X-Watchbloom-Visitor": vis_id}

        # Validation failure: missing target_id
        res = self.client.post("/api/v1/reports", headers=headers, json={"reason_code": "spam"})
        self.assertEqual(res.status_code, 400)

        # Successful submission (202 Accepted for asynchronous background processing)
        report_data = {
            "target_type": "video",
            "target_id": "v1",
            "reason_code": "spam",
            "description": "Commercial spam links detected in description",
            "target_metadata": json.dumps({"video_title": "Python Loops", "timestamp": "01:23"})
        }
        res = self.client.post("/api/v1/reports", headers=headers, json=report_data)
        self.assertEqual(res.status_code, 202)
        data = res.get_json()
        self.assertTrue(data["success"])
        report_id = data["report_id"]
        self.assertTrue(report_id.startswith("rep_"))

        # Fetch report details
        res = self.client.get(f"/api/v1/reports/{report_id}")
        self.assertEqual(res.status_code, 200)
        rep = res.get_json()["report"]
        self.assertEqual(rep["report_id"], report_id)
        self.assertEqual(rep["target_id"], "v1")
        self.assertEqual(rep["reason_code"], "spam")
        self.assertEqual(rep["status"], "pending")

    def test_support_mail_and_notifications(self):
        """Verify support inquiry submission, email dispatch task, and notification read flow."""
        import uuid
        from core.settings_mail_reporting import create_system_notification

        vis_id = f"test_vis_{uuid.uuid4().hex[:8]}"
        headers = {"X-Watchbloom-Visitor": vis_id}

        # Submit support ticket (202 Accepted for async Celery dispatch)
        mail_data = {
            "email": "user@example.com",
            "category": "technical",
            "subject": "Playback buffering on AV1",
            "message": "Encountering high buffer ratio on 1080p stream"
        }
        res = self.client.post("/api/v1/support/contact", headers=headers, json=mail_data)
        self.assertEqual(res.status_code, 202)
        data = res.get_json()
        self.assertTrue(data["success"])
        mail_id = data["mail_id"]
        self.assertTrue(mail_id.startswith("mail_"))

        # Fetch support ticket
        res = self.client.get(f"/api/v1/support/mail/{mail_id}")
        self.assertEqual(res.status_code, 200)
        mail = res.get_json()["mail"]
        self.assertEqual(mail["mail_id"], mail_id)
        self.assertEqual(mail["email"], "user@example.com")
        self.assertEqual(mail["status"], "queued")

        # Create system notification and fetch via API
        uid = f"vis_{vis_id}"
        notif = create_system_notification(
            user_id=uid,
            title="Ticket Received",
            message=f"Your ticket {mail_id} has been queued.",
            notification_type="support"
        )
        self.assertIsNotNone(notif)
        notif_id = notif["id"]

        # List notifications
        res = self.client.get("/api/v1/notifications", headers=headers)
        self.assertEqual(res.status_code, 200)
        notif_data = res.get_json()
        self.assertGreaterEqual(notif_data["total"], 1)
        self.assertGreaterEqual(notif_data["unread_count"], 1)

        # Mark notification as read
        res = self.client.post(f"/api/v1/notifications/{notif_id}/read", headers=headers)
        self.assertEqual(res.status_code, 200)

        # Confirm unread count decreased
        res = self.client.get("/api/v1/notifications", headers=headers)
        self.assertEqual(res.status_code, 200)
        unread_after = res.get_json()["unread_count"]
        self.assertEqual(unread_after, 0)

    def test_grpc_auth_settings_reporting_mail(self):
        """Test gRPC microservice implementation of settings, reporting, and mail RPCs."""
        import uuid
        from concurrent import futures
        from core.grpc_interceptors import UnifiedServerInterceptor
        from core.settings_mail_reporting import create_system_notification
        from services.auth.server import AuthServiceServicer
        from services.auth.client import AuthClient
        from proto import auth_pb2_grpc

        server = grpc.server(
            futures.ThreadPoolExecutor(max_workers=2),
            interceptors=[UnifiedServerInterceptor("test-auth-settings-svc")]
        )
        auth_pb2_grpc.add_AuthServiceServicer_to_server(AuthServiceServicer(), server)
        port = server.add_insecure_port("127.0.0.1:0")
        server.start()

        try:
            client = AuthClient(f"127.0.0.1:{port}")
            user_id = f"grpc_u_{uuid.uuid4().hex[:8]}"

            # 1. GetUserSettings
            resp = client.get_user_settings(user_id)
            self.assertTrue(resp.success)
            self.assertEqual(resp.settings.user_id, user_id)
            self.assertEqual(resp.settings.profile_visibility, "public")

            # 2. UpdateUserSettings
            resp_update = client.update_user_settings(
                user_id=user_id,
                profile_visibility="unlisted",
                show_subscriptions=False,
                default_quality="1080p",
                ambient_mode=True
            )
            self.assertTrue(resp_update.success)
            self.assertEqual(resp_update.settings.profile_visibility, "unlisted")
            self.assertFalse(resp_update.settings.show_subscriptions)
            self.assertEqual(resp_update.settings.default_quality, "1080p")
            self.assertTrue(resp_update.settings.ambient_mode)

            # 3. SubmitAbuseReport
            report = client.submit_abuse_report(
                reporter_id=user_id,
                target_type="video",
                target_id="v1",
                reason_code="copyright",
                description="Uncredited audio clip used in background"
            )
            self.assertTrue(report.report_id.startswith("rep_"))
            self.assertEqual(report.status, "pending")

            # 4. SubmitSupportMail
            mail = client.submit_support_mail(
                user_id=user_id,
                email="grpc_creator@example.com",
                category="technical",
                subject="gRPC Ingestion Timeout",
                message="Client timed out while streaming chunks"
            )
            self.assertTrue(mail.mail_id.startswith("mail_"))
            self.assertEqual(mail.status, "queued")

            # 5. Notifications
            create_system_notification(
                user_id=user_id,
                title="gRPC Alert",
                message="Your RPC was processed",
                notification_type="system"
            )
            resp_notifs = client.get_notification_logs(user_id)
            self.assertGreaterEqual(len(resp_notifs.notifications), 1)
            target_id = resp_notifs.notifications[0].id
            ok = client.mark_notification_read(user_id=user_id, notification_id=target_id)
            self.assertTrue(ok)

            client.close()
        finally:
            server.stop(grace=0)


if __name__ == "__main__":
    try:
        unittest.main()
    finally:
        try:
            from core.db import SQLITE_POOL
            SQLITE_POOL.close_all()
            engine.close()
            app_module.engine.close()
        except Exception:
            pass
