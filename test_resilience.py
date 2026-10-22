"""Unit tests for operational resilience module (Circuit Breaker, Exponential Backoff, Idempotency).
"""

import time
import unittest

from core.resilience import (
    CircuitBreaker,
    CircuitBreakerOpenException,
    CircuitState,
    check_idempotency_key,
    retry_with_backoff,
    store_idempotency_result,
)


class TestResilienceModule(unittest.TestCase):
    def test_circuit_breaker_transitions(self):
        cb = CircuitBreaker("test_breaker", failure_threshold=2, recovery_timeout_seconds=0.2)
        self.assertEqual(cb.state, CircuitState.CLOSED)

        @cb
        def fragile_func(fail: bool):
            if fail:
                raise ValueError("External service down")
            return "success"

        # Success path
        self.assertEqual(fragile_func(fail=False), "success")
        self.assertEqual(cb.state, CircuitState.CLOSED)

        # 1st failure
        with self.assertRaises(ValueError):
            fragile_func(fail=True)
        self.assertEqual(cb.state, CircuitState.CLOSED)

        # 2nd failure -> Circuit trips to OPEN
        with self.assertRaises(ValueError):
            fragile_func(fail=True)
        self.assertEqual(cb.state, CircuitState.OPEN)

        # 3rd call immediately fast-fails without executing function
        with self.assertRaises(CircuitBreakerOpenException):
            fragile_func(fail=False)

        # Wait for recovery timeout -> transitions to HALF_OPEN
        time.sleep(0.25)
        self.assertEqual(cb.state, CircuitState.HALF_OPEN)

        # Next successful call resets to CLOSED
        self.assertEqual(fragile_func(fail=False), "success")
        self.assertEqual(cb.state, CircuitState.CLOSED)

    def test_retry_with_backoff(self):
        attempts = 0

        @retry_with_backoff(max_retries=3, initial_delay=0.01, backoff_factor=1.5, jitter=False)
        def unstable_operation():
            nonlocal attempts
            attempts += 1
            if attempts < 3:
                raise ConnectionError("Temporary network blip")
            return "recovered"

        result = unstable_operation()
        self.assertEqual(result, "recovered")
        self.assertEqual(attempts, 3)

    def test_idempotency_flow(self):
        key = "idemp_test_12345"
        is_dup, val = check_idempotency_key(key)
        self.assertFalse(is_dup)
        self.assertIsNone(val)

        store_idempotency_result(key, '{"status": "processed", "id": 999}')
        is_dup, val = check_idempotency_key(key)
        self.assertTrue(is_dup)
        self.assertIn("processed", str(val))


if __name__ == "__main__":
    unittest.main()

