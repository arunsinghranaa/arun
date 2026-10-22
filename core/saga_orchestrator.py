"""Distributed Saga Pattern Orchestrator for Watchbloom.
Implements non-blocking distributed transactions across microservices,
asynchronous workers, object storage, and search indexers.

If any forward step fails after retries, registered compensating transactions
are executed in reverse order, ensuring eventual consistency without 2PC blocking.
Failed sagas are forwarded to a Dead Letter Queue (DLQ) for auditing and replay.
"""

from dataclasses import dataclass, field
from enum import Enum
import json
import logging
import time
from typing import Any, Callable
import uuid

from core.cache import CACHE
from core.resilience import check_idempotency_key

logger = logging.getLogger("watchbloom.saga")


class SagaStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    COMPENSATING = "COMPENSATING"
    COMPENSATED = "COMPENSATED"
    DLQ = "DLQ"


@dataclass
class SagaStep:
    """A single step in a distributed saga with its forward action and compensating action."""
    name: str
    action: Callable[[dict[str, Any]], dict[str, Any]]
    compensate: Callable[[dict[str, Any]], None] | None = None
    retry_limit: int = 2
    timeout_seconds: float = 30.0


@dataclass
class SagaExecutionLog:
    """Audit log of saga state and step transitions."""
    saga_id: str
    saga_name: str
    status: SagaStatus = SagaStatus.PENDING
    context: dict[str, Any] = field(default_factory=dict)
    completed_steps: list[str] = field(default_factory=list)
    failed_step: str | None = None
    error_message: str | None = None
    start_time: float = field(default_factory=time.time)
    end_time: float | None = None


class DeadLetterQueue:
    """Dead Letter Queue (DLQ) for failed sagas and poison messages."""

    def __init__(self, queue_name: str = "watchbloom:saga:dlq"):
        self.queue_name = queue_name

    def push(self, saga_log: SagaExecutionLog, payload: dict[str, Any]) -> str:
        """Push failed transaction payload and diagnostics to DLQ."""
        dlq_entry = {
            "dlq_id": f"dlq_{uuid.uuid4().hex[:12]}",
            "saga_id": saga_log.saga_id,
            "saga_name": saga_log.saga_name,
            "failed_step": saga_log.failed_step,
            "error_message": saga_log.error_message,
            "context": saga_log.context,
            "payload": payload,
            "timestamp": time.time(),
        }
        redis_client = CACHE.redis if CACHE.is_redis_active else None
        if redis_client:
            try:
                redis_client.lpush(self.queue_name, json.dumps(dlq_entry))
                # Keep last 10,000 DLQ entries
                redis_client.ltrim(self.queue_name, 0, 9999)
            except Exception as e:
                logger.error(f"Failed to push saga {saga_log.saga_id} to Redis DLQ: {e}")

        logger.critical(
            f"DLQ_ALERT: Saga '{saga_log.saga_name}' [ID: {saga_log.saga_id}] failed at "
            f"step '{saga_log.failed_step}': {saga_log.error_message}"
        )
        return dlq_entry["dlq_id"]

    def peek(self, limit: int = 10) -> list[dict[str, Any]]:
        """Retrieve recent DLQ items for inspection."""
        redis_client = CACHE.redis if CACHE.is_redis_active else None
        if not redis_client:
            return []
        try:
            items = redis_client.lrange(self.queue_name, 0, limit - 1)
            return [json.loads(item) for item in items]
        except Exception:
            return []


DLQ = DeadLetterQueue()


class SagaOrchestrator:
    """Coordinates multi-step distributed transactions with automated rollback compensation."""

    def __init__(self, saga_name: str, idempotency_key: str | None = None):
        self.saga_name = saga_name
        self.saga_id = f"saga_{uuid.uuid4().hex[:12]}"
        self.idempotency_key = idempotency_key or self.saga_id
        self.steps: list[SagaStep] = []
        self.log = SagaExecutionLog(saga_id=self.saga_id, saga_name=self.saga_name)

    def add_step(
        self,
        name: str,
        action: Callable[[dict[str, Any]], dict[str, Any]],
        compensate: Callable[[dict[str, Any]], None] | None = None,
        retry_limit: int = 2,
    ) -> "SagaOrchestrator":
        """Register a forward transaction step with its compensation handler."""
        self.steps.append(
            SagaStep(
                name=name,
                action=action,
                compensate=compensate,
                retry_limit=retry_limit,
            )
        )
        return self

    def execute(self, initial_payload: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
        """Execute the saga forward steps. If any step fails, trigger compensations in reverse.
        
        Returns: (success: bool, final_context: dict)
        """
        # 1. Enforce idempotency: prevent duplicate execution of the same transaction
        is_fresh, cached_result = check_idempotency_key(
            self.idempotency_key, ttl_seconds=3600
        )
        if not is_fresh and cached_result:
            logger.info(f"Saga '{self.saga_name}' deduplicated by idempotency key: {self.idempotency_key}")
            return True, cached_result.get("context", initial_payload)

        self.log.context = dict(initial_payload)
        self.log.status = SagaStatus.RUNNING
        executed_steps: list[SagaStep] = []

        logger.info(f"Starting Saga '{self.saga_name}' [ID: {self.saga_id}] with {len(self.steps)} steps.")

        for step in self.steps:
            step_success = False
            last_error: Exception | None = None

            for attempt in range(1, step.retry_limit + 1):
                try:
                    logger.debug(f"Saga '{self.saga_name}': Executing step '{step.name}' (attempt {attempt}/{step.retry_limit})")
                    step_output = step.action(self.log.context)
                    if isinstance(step_output, dict):
                        self.log.context.update(step_output)
                    executed_steps.append(step)
                    self.log.completed_steps.append(step.name)
                    step_success = True
                    break
                except Exception as err:
                    last_error = err
                    logger.warning(f"Saga '{self.saga_name}' step '{step.name}' attempt {attempt} failed: {err}")
                    if attempt < step.retry_limit:
                        time.sleep(0.05 * (2 ** (attempt - 1)))

            if not step_success:
                self.log.failed_step = step.name
                self.log.error_message = str(last_error)
                self.log.status = SagaStatus.FAILED
                logger.error(
                    f"Saga '{self.saga_name}' step '{step.name}' permanently failed! "
                    f"Initiating compensating transactions."
                )
                self._compensate(executed_steps, initial_payload)
                return False, {
                    "error": str(last_error),
                    "failed_step": step.name,
                    "saga_id": self.saga_id,
                    "status": self.log.status.value,
                }

        self.log.status = SagaStatus.COMPLETED
        self.log.end_time = time.time()
        logger.info(f"Saga '{self.saga_name}' [ID: {self.saga_id}] completed successfully in {self.log.end_time - self.log.start_time:.3f}s")
        return True, self.log.context

    def _compensate(self, executed_steps: list[SagaStep], initial_payload: dict[str, Any]) -> None:
        """Rollback all executed steps in reverse order."""
        self.log.status = SagaStatus.COMPENSATING
        logger.info(f"Compensating {len(executed_steps)} executed steps for saga {self.saga_id}...")

        for step in reversed(executed_steps):
            if step.compensate:
                try:
                    logger.info(f"Applying compensation for step '{step.name}'...")
                    step.compensate(self.log.context)
                except Exception as comp_err:
                    logger.critical(
                        f"CRITICAL: Compensation failed for step '{step.name}' on saga {self.saga_id}: {comp_err}"
                    )

        self.log.status = SagaStatus.COMPENSATED
        self.log.end_time = time.time()

        # Push to Dead Letter Queue for forensic analysis
        DLQ.push(self.log, initial_payload)

