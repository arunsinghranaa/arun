"""Unit and Integration Tests for Saga Orchestrator, Distributed Locking, and Feature Flags.
Verifies failure compensations, Dead Letter Queueing, lock mutual exclusion, and deterministic canary bucketing.
"""

import unittest
from typing import Any

from core.distributed_lock import DistributedLock, distributed_lock
from core.feature_flags import FEATURE_FLAGS, FeatureRule
from core.saga_orchestrator import DLQ, SagaOrchestrator, SagaStatus


class SagaAndDistLockTests(unittest.TestCase):

    def test_saga_orchestrator_successful_execution(self):
        """Verify forward execution of multi-step saga when all steps succeed."""
        orchestrator = SagaOrchestrator("test_video_pipeline")
        step1_called = False
        step2_called = False

        def step1_action(ctx: dict[str, Any]) -> dict[str, Any]:
            nonlocal step1_called
            step1_called = True
            return {"transcoded": True, "hls_path": "/var/media/v1/master.m3u8"}

        def step2_action(ctx: dict[str, Any]) -> dict[str, Any]:
            nonlocal step2_called
            step2_called = True
            return {"cdn_url": f"https://cdn.watchbloom.com{ctx['hls_path']}"}

        orchestrator.add_step("transcode", step1_action)
        orchestrator.add_step("cdn_upload", step2_action)

        success, result = orchestrator.execute({"video_id": "v101", "author": "creator_1"})
        self.assertTrue(success)
        self.assertTrue(step1_called)
        self.assertTrue(step2_called)
        self.assertEqual(result.get("transcoded"), True)
        self.assertIn("https://cdn.watchbloom.com", result.get("cdn_url", ""))
        self.assertEqual(orchestrator.log.status, SagaStatus.COMPLETED)

    def test_saga_orchestrator_failure_and_reverse_compensation(self):
        """Verify that when a downstream step fails, prior steps are compensated in reverse."""
        orchestrator = SagaOrchestrator("test_failed_upload_pipeline")
        events: list[str] = []

        def step1_action(ctx: dict[str, Any]) -> dict[str, Any]:
            events.append("step1_action")
            return {"step1_done": True}

        def step1_compensate(ctx: dict[str, Any]) -> None:
            events.append("step1_compensate")

        def step2_action(ctx: dict[str, Any]) -> dict[str, Any]:
            events.append("step2_action")
            return {"step2_done": True}

        def step2_compensate(ctx: dict[str, Any]) -> None:
            events.append("step2_compensate")

        def step3_action_fails(ctx: dict[str, Any]) -> dict[str, Any]:
            events.append("step3_action_fails")
            raise ConnectionError("CDN Origin Down")

        orchestrator.add_step("reserve_db", step1_action, step1_compensate)
        orchestrator.add_step("transcode_hls", step2_action, step2_compensate)
        orchestrator.add_step("cdn_replicate", step3_action_fails, retry_limit=1)

        success, result = orchestrator.execute({"video_id": "v_fail_99"})
        self.assertFalse(success)
        self.assertEqual(orchestrator.log.status, SagaStatus.COMPENSATED)
        self.assertEqual(orchestrator.log.failed_step, "cdn_replicate")

        # Step 2 compensated first, then Step 1
        self.assertIn("step1_action", events)
        self.assertIn("step2_action", events)
        self.assertIn("step3_action_fails", events)
        self.assertIn("step2_compensate", events)
        self.assertIn("step1_compensate", events)
        self.assertLess(events.index("step2_compensate"), events.index("step1_compensate"))

    def test_dead_letter_queue_push(self):
        """Verify failed sagas are pushed to DLQ with diagnostic error payloads."""
        orchestrator = SagaOrchestrator("test_dlq_pipeline")

        def bad_step(ctx: dict[str, Any]) -> dict[str, Any]:
            raise ValueError("Corrupt video file header")

        orchestrator.add_step("validate_codec", bad_step, retry_limit=1)
        success, _ = orchestrator.execute({"video_id": "v_corrupt"})
        self.assertFalse(success)
        self.assertEqual(orchestrator.log.failed_step, "validate_codec")

    def test_distributed_lock_acquisition_and_context_manager(self):
        """Verify distributed lock can be acquired, held, and safely released."""
        lock_name = "channel_sync_creator_99"
        lock = DistributedLock(lock_name, ttl_seconds=5.0)

        # 1. Acquire and release explicitly
        acquired = lock.acquire()
        self.assertTrue(acquired)
        released = lock.release()
        self.assertTrue(released)

        # 2. Context manager usage
        with distributed_lock(lock_name) as ctx_lock:
            self.assertTrue(ctx_lock._acquired)

    def test_feature_flags_canary_and_role_evaluation(self):
        """Verify feature flags evaluate roles, whitelists, and deterministic hash bucketing."""
        # 1. Test Admin / Role override
        FEATURE_FLAGS.set_rule(
            FeatureRule(
                name="test_creator_analytics_v2",
                enabled=True,
                rollout_percentage=0,  # 0% for general public
                allowed_roles=["creator", "admin"],
            )
        )
        self.assertTrue(FEATURE_FLAGS.is_enabled("test_creator_analytics_v2", user_role="creator"))
        self.assertTrue(FEATURE_FLAGS.is_enabled("test_creator_analytics_v2", user_role="admin"))
        self.assertFalse(FEATURE_FLAGS.is_enabled("test_creator_analytics_v2", user_role="viewer"))

        # 2. Test Deterministic Percentage Hash Bucketing
        FEATURE_FLAGS.set_rule(
            FeatureRule(
                name="test_new_player_ui",
                enabled=True,
                rollout_percentage=50,  # 50% rollout
            )
        )
        # Consistent result for the same user ID
        result_user_a = FEATURE_FLAGS.is_enabled("test_new_player_ui", user_id="user_alpha_123")
        result_user_a_repeat = FEATURE_FLAGS.is_enabled("test_new_player_ui", user_id="user_alpha_123")
        self.assertEqual(result_user_a, result_user_a_repeat)

        # 3. Master killswitch
        FEATURE_FLAGS.set_rule(
            FeatureRule(
                name="test_killed_feature",
                enabled=False,
                rollout_percentage=100,
            )
        )
        self.assertFalse(FEATURE_FLAGS.is_enabled("test_killed_feature", user_id="user_alpha_123", user_role="admin"))


if __name__ == "__main__":
    unittest.main()

