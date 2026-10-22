"""Operational Resilience & Fault Tolerance Engine for Watchbloom.
Implements Circuit Breakers, Retries with Exponential Backoff + Jitter,
and Idempotency Management for critical downstream services (Email, SMS, R2 CDN).
"""

from enum import Enum
from functools import wraps
import logging
import random
import threading
import time
from typing import Any, Callable, TypeVar

from core.cache import CACHE

logger = logging.getLogger("watchbloom.resilience")

F = TypeVar("F", bound=Callable[..., Any])


class CircuitState(str, Enum):
    CLOSED = "CLOSED"        # Normal operations; requests pass through
    OPEN = "OPEN"            # Downstream failure detected; fail fast immediately
    HALF_OPEN = "HALF_OPEN"  # Testing recovery with canary requests


class CircuitBreakerOpenException(Exception):
    """Raised when an operation is attempted while the circuit breaker is OPEN."""
    pass


class CircuitBreaker:
    """Thread-safe circuit breaker preventing cascading failures in downstream dependencies.
    
    Protects services like Gmail SMTP, Twilio SMS, and Cloudflare R2 object storage.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout_seconds: float = 30.0,
        expected_exceptions: tuple[type[Exception], ...] = (Exception,),
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        self.expected_exceptions = expected_exceptions

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time = 0.0
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            if self._state == CircuitState.OPEN:
                # Check if recovery timeout has elapsed to transition into HALF_OPEN
                if (time.time() - self._last_failure_time) > self.recovery_timeout_seconds:
                    self._state = CircuitState.HALF_OPEN
                    logger.info(f"CircuitBreaker '{self.name}': Transitioned from OPEN to HALF_OPEN (probing downstream).")
            return self._state

    def __call__(self, func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            state = self.state
            if state == CircuitState.OPEN:
                logger.warning(f"CircuitBreaker '{self.name}': Call fast-failed (Circuit is OPEN).")
                raise CircuitBreakerOpenException(f"Downstream service '{self.name}' is currently unavailable (Circuit OPEN).")

            try:
                result = func(*args, **kwargs)
                self._record_success()
                return result
            except self.expected_exceptions as exc:
                self._record_failure(exc)
                raise exc

        return wrapper  # type: ignore[return-value]

    def _record_success(self) -> None:
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                logger.info(f"CircuitBreaker '{self.name}': Recovery verified. Transitioned from HALF_OPEN to CLOSED.")
            self._state = CircuitState.CLOSED
            self._failure_count = 0

    def _record_failure(self, exc: Exception) -> None:
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            logger.warning(
                f"CircuitBreaker '{self.name}': Recorded failure ({self._failure_count}/{self.failure_threshold}): {exc}"
            )
            if self._failure_count >= self.failure_threshold or self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                logger.error(f"CircuitBreaker '{self.name}': Failure threshold exceeded! Circuit is now OPEN.")


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 0.5,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    expected_exceptions: tuple[type[Exception], ...] = (Exception,),
) -> Callable[[F], F]:
    """Decorator executing exponential backoff with full jitter to avoid stampede retries."""

    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            delay = initial_delay
            last_exception: Exception | None = None

            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except expected_exceptions as exc:
                    last_exception = exc
                    if attempt == max_retries:
                        logger.error(f"Function '{func.__name__}' failed after {max_retries} attempts: {exc}")
                        raise

                    actual_delay = delay
                    if jitter:
                        actual_delay = random.uniform(0.1, delay)

                    logger.warning(
                        f"Function '{func.__name__}' attempt {attempt} failed ({exc}). Retrying in {actual_delay:.2f}s..."
                    )
                    time.sleep(actual_delay)
                    delay *= backoff_factor

            if last_exception:
                raise last_exception

        return wrapper  # type: ignore[return-value]

    return decorator


def check_idempotency_key(idempotency_key: str, ttl_seconds: int = 86400) -> tuple[bool, Any | None]:
    """Check if an operation with this idempotency key was already completed.
    
    Returns: (is_duplicate: bool, cached_result: Any | None)
    """
    if not idempotency_key:
        return False, None

    cache_key = f"idempotency:{idempotency_key}"
    existing = CACHE.get(cache_key)
    if existing:
        return True, existing
    return False, None


def store_idempotency_result(idempotency_key: str, result: Any, ttl_seconds: int = 86400) -> None:
    """Store the completed result of an idempotent operation."""
    if not idempotency_key:
        return
    cache_key = f"idempotency:{idempotency_key}"
    CACHE.set(cache_key, result, ttl=ttl_seconds)


# Pre-configured circuit breakers for external systems
SMTP_CIRCUIT_BREAKER = CircuitBreaker("smtp_mail_service", failure_threshold=4, recovery_timeout_seconds=45.0)
SMS_CIRCUIT_BREAKER = CircuitBreaker("sms_gateway", failure_threshold=4, recovery_timeout_seconds=45.0)
R2_STORAGE_CIRCUIT_BREAKER = CircuitBreaker("cloudflare_r2_storage", failure_threshold=5, recovery_timeout_seconds=60.0)

