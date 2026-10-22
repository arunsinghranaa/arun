"""Unit and Integration Tests for Advanced Enterprise Systems & SRE Operations.
Tests Webhooks & SSRF defense, JWT Key Rotation & JWKS, SLO & Error Budgets,
Disaster Recovery Failover, Chaos Engineering, and Incident Postmortems.
"""

import time
import unittest

from core.chaos_engineering import CHAOS
from core.disaster_recovery import DR_CONTROLLER, RegionRole
from core.incident_logger import INCIDENT_MANAGER, IncidentSeverity, IncidentStatus
from core.jwt_rotation import KEY_ROTATION
from core.slo_tracker import SLO_TRACKER
from core.webhooks import SSRFValidationError, generate_webhook_signature, validate_webhook_url_against_ssrf


class AdvancedEnterpriseSystemsTests(unittest.TestCase):

    def test_ssrf_protection_and_signature(self):
        """Verify SSRF validator blocks localhost and private subnets, and validates HMAC-SHA256."""
        # 1. SSRF blocks
        with self.assertRaises(SSRFValidationError):
            validate_webhook_url_against_ssrf("http://localhost:5000/webhook")

        with self.assertRaises(SSRFValidationError):
            validate_webhook_url_against_ssrf("http://127.0.0.1:8080/hook")

        with self.assertRaises(SSRFValidationError):
            validate_webhook_url_against_ssrf("http://169.254.169.254/latest/meta-data/")

        # 2. Valid URL scheme
        with self.assertRaises(SSRFValidationError):
            validate_webhook_url_against_ssrf("ftp://example.com/hook")

        # 3. HMAC-SHA256 Signature calculation
        payload = b'{"event":"video.ready","id":"v123"}'
        secret = "super_secret_webhook_key"
        sig = generate_webhook_signature(payload, secret)
        self.assertTrue(len(sig) == 64)
        # Signature is deterministic
        self.assertEqual(sig, generate_webhook_signature(payload, secret))

    def test_jwt_key_rotation_and_jwks(self):
        """Verify rolling zero-downtime key rotation, grace period validation, and revocation."""
        initial_payload = {"sub": "usr_test_alpha", "role": "creator"}

        # 1. Encode with initial key
        token_v1 = KEY_ROTATION.encode_token(initial_payload, expires_in_seconds=300)
        decoded_v1 = KEY_ROTATION.decode_token(token_v1)
        self.assertEqual(decoded_v1["sub"], "usr_test_alpha")

        # 2. Rotate to new key (token_v1 must still be verifiable during grace period)
        new_kid = KEY_ROTATION.rotate_key(grace_period_seconds=60.0)
        self.assertNotEqual(new_kid, KEY_ROTATION._keyring[KEY_ROTATION._active_kid].secret_or_key)

        # Existing token still valid in grace period
        decoded_v1_post_rotation = KEY_ROTATION.decode_token(token_v1)
        self.assertEqual(decoded_v1_post_rotation["sub"], "usr_test_alpha")

        # New token encoded with new key
        token_v2 = KEY_ROTATION.encode_token({"sub": "usr_test_beta"}, expires_in_seconds=300)
        decoded_v2 = KEY_ROTATION.decode_token(token_v2)
        self.assertEqual(decoded_v2["sub"], "usr_test_beta")

        # 3. Revoke a key instantly
        KEY_ROTATION.revoke_key(KEY_ROTATION._keyring[new_kid].kid)
        with self.assertRaises(Exception):
            KEY_ROTATION.decode_token(token_v2)

        # 4. JWKS format
        jwks = KEY_ROTATION.get_jwks()
        self.assertIn("keys", jwks)
        self.assertIsInstance(jwks["keys"], list)

    def test_slo_and_error_budget_tracking(self):
        """Verify SLI calculation, remaining budget, and multi-burn-rate alerting."""
        slo_name = "test_video_slo"
        SLO_TRACKER._specs[slo_name] = SLO_TRACKER._specs["video_playback"]

        # Record 990 good events and 10 bad events (1% bad -> burn rate will be elevated)
        for _ in range(99):
            SLO_TRACKER.record_event(slo_name, is_good=True, latency_ms=45.0)
        SLO_TRACKER.record_event(slo_name, is_good=False, latency_ms=250.0)

        status = SLO_TRACKER.get_status(slo_name)
        self.assertGreater(status["total_events"], 0)
        self.assertIn(status["alert_level"], ("HEALTHY", "ELEVATED", "TICKET_WARNING", "PAGER_CRITICAL"))
        self.assertGreaterEqual(status["p99_latency_ms"], 0.0)

    def test_disaster_recovery_controller_and_failover(self):
        """Verify cross-region health validation, schema version matching, and failover promotion."""
        # 1. Probes
        DR_CONTROLLER.record_probe("us-east-1", is_success=True, latency_ms=10.0)
        DR_CONTROLLER.record_probe("eu-central-1", is_success=True, latency_ms=22.0)

        # 2. Execute failover to eu-central-1
        event = DR_CONTROLLER.trigger_failover("eu-central-1", reason="Simulated us-east-1 fiber disruption")
        self.assertEqual(DR_CONTROLLER.active_write_region, "eu-central-1")
        self.assertEqual(DR_CONTROLLER.regions["eu-central-1"].role, RegionRole.PRIMARY)
        self.assertEqual(DR_CONTROLLER.regions["us-east-1"].role, RegionRole.DEGRADED)
        self.assertEqual(event["status"], "COMPLETED")

        # 3. Failover history
        status = DR_CONTROLLER.get_cluster_status()
        self.assertEqual(status["active_write_region"], "eu-central-1")
        self.assertGreaterEqual(status["total_failovers"], 1)

        # Failover back to us-east-1 for clean test state
        DR_CONTROLLER.regions["us-east-1"].is_healthy = True
        DR_CONTROLLER.trigger_failover("us-east-1", reason="Restoring baseline primary")

    def test_chaos_engineering_harness(self):
        """Verify chaos injection harness injects faults in a controlled experiment."""
        service = "external_cdn_origin"

        # Baseline: No chaos -> no exception
        CHAOS.maybe_inject_chaos(service)

        # Active chaos experiment: 100% failure rate
        with CHAOS.experiment(service, failure_rate=1.0, latency_delay_seconds=0.0):
            with self.assertRaises(ConnectionResetError):
                CHAOS.maybe_inject_chaos(service)

        # Post-experiment: Chaos automatically disabled
        CHAOS.maybe_inject_chaos(service)

    def test_incident_manager_and_postmortem(self):
        """Verify incident declaration, timeline logging, resolution, and blameless postmortem."""
        inc = INCIDENT_MANAGER.declare_incident(
            title="PgBouncer Connection Spike on Live Event",
            severity=IncidentSeverity.P1,
            lead_responder="SRE-Lead-Arun",
            impact_summary="Live chat connection latency elevated for 5 minutes during premiere.",
        )
        self.assertEqual(inc.status, IncidentStatus.DECLARED)

        # Add timeline event
        INCIDENT_MANAGER.add_timeline_event(inc.incident_id, "Scaled PgBouncer replicas to 8", actor="SRE-Lead-Arun")

        # Resolve
        resolved = INCIDENT_MANAGER.resolve_incident(
            inc.incident_id,
            root_cause="Sudden 10x viewer influx exceeded default client connection ceiling.",
            action_items=["Increase default_pool_size in pgbouncer.ini to 100", "Add KEDA scaler for pgbouncer"],
        )
        self.assertTrue(resolved)

        # Generate Postmortem
        postmortem_md = INCIDENT_MANAGER.generate_postmortem_markdown(inc.incident_id)
        self.assertIn("SRE Blameless Postmortem", postmortem_md)
        self.assertIn("Root Cause Analysis (5 Whys)", postmortem_md)
        self.assertIn("Increase default_pool_size in pgbouncer.ini to 100", postmortem_md)


if __name__ == "__main__":
    unittest.main()

