"""Chaos Engineering & Fault Injection Test Harness for Watchbloom.
Enables controlled resilience validation (Chaos Mesh / Chaos Monkey pattern)
to verify CircuitBreakers, Retry Backoffs, and Redlock distributed locks under turbulence.
"""

from contextlib import contextmanager
from dataclasses import dataclass
import logging
import random
import threading
import time
from typing import Generator

logger = logging.getLogger("watchbloom.chaos")


@dataclass
class ChaosRule:
    target_service: str
    failure_rate: float = 0.0      # Probability 0.0 to 1.0
    latency_delay_seconds: float = 0.0  # Latency injected
    exception_type: type[Exception] | None = None
    enabled: bool = False


class ChaosHarness:
    """Controls dynamic chaos injection into microservice calls and database queries."""

    def __init__(self):
        self._lock = threading.Lock()
        self._rules: dict[str, ChaosRule] = {}
        self.experiments_run: int = 0
        self.faults_injected: int = 0

    def enable_chaos(
        self,
        target_service: str,
        failure_rate: float = 0.5,
        latency_delay_seconds: float = 0.1,
        exception_type: type[Exception] | None = None,
    ) -> None:
        """Activate chaos injection rule for a specific downstream service."""
        with self._lock:
            self._rules[target_service] = ChaosRule(
                target_service=target_service,
                failure_rate=failure_rate,
                latency_delay_seconds=latency_delay_seconds,
                exception_type=exception_type or ConnectionResetError,
                enabled=True,
            )
        logger.warning(
            f"CHAOS ENABLED on '{target_service}': Failure rate {failure_rate*100}%, Latency {latency_delay_seconds}s"
        )

    def disable_chaos(self, target_service: str) -> None:
        """Deactivate chaos rule for a service."""
        with self._lock:
            if target_service in self._rules:
                self._rules[target_service].enabled = False
        logger.info(f"Chaos disabled on '{target_service}'.")

    def maybe_inject_chaos(self, target_service: str) -> None:
        """Hook called before invoking external downstream dependencies."""
        with self._lock:
            rule = self._rules.get(target_service)

        if not rule or not rule.enabled:
            return

        self.experiments_run += 1

        # 1. Inject artificial network latency / jitter
        if rule.latency_delay_seconds > 0:
            time.sleep(rule.latency_delay_seconds)

        # 2. Inject artificial fault based on failure probability
        if rule.failure_rate > 0 and random.random() < rule.failure_rate:
            self.faults_injected += 1
            exc_class = rule.exception_type or ConnectionResetError
            logger.warning(f"CHAOS INJECTED: Simulating '{exc_class.__name__}' on '{target_service}'")
            raise exc_class(f"Simulated chaos fault injected on '{target_service}'")

    @contextmanager
    def experiment(
        self,
        target_service: str,
        failure_rate: float = 0.5,
        latency_delay_seconds: float = 0.05,
    ) -> Generator["ChaosHarness", None, None]:
        """Context manager for temporary, isolated chaos testing."""
        self.enable_chaos(target_service, failure_rate, latency_delay_seconds)
        try:
            yield self
        finally:
            self.disable_chaos(target_service)


CHAOS = ChaosHarness()

