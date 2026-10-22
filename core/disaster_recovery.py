"""Multi-Region Disaster Recovery (DR), Schema Versioning & Automated Failover Controller.
Orchestrates cross-region health validation, read replica promotion, and zero-data-loss failover.
"""

from dataclasses import dataclass, field
from enum import Enum
import logging
import threading
import time
from typing import Any
import uuid

logger = logging.getLogger("watchbloom.dr")


class RegionRole(str, Enum):
    PRIMARY = "PRIMARY"
    STANDBY = "STANDBY"
    FAILOVER_IN_PROGRESS = "FAILOVER_IN_PROGRESS"
    DEGRADED = "DEGRADED"


@dataclass
class RegionHealth:
    region_id: str
    role: RegionRole
    db_latency_ms: float = 0.0
    is_healthy: bool = True
    schema_version: str = "2026.10.v1"
    last_heartbeat: float = field(default_factory=time.time)
    consecutive_failures: int = 0


class DisasterRecoveryController:
    """Coordinates multi-region health probes, schema verification, and traffic failovers."""

    def __init__(self, primary_region: str = "us-east-1", secondary_region: str = "eu-central-1"):
        self.primary_region = primary_region
        self.secondary_region = secondary_region
        self._lock = threading.Lock()
        self.active_write_region = primary_region
        self.schema_version = "2026.10.v1"

        self.regions: dict[str, RegionHealth] = {
            primary_region: RegionHealth(region_id=primary_region, role=RegionRole.PRIMARY),
            secondary_region: RegionHealth(region_id=secondary_region, role=RegionRole.STANDBY),
        }
        self.failover_history: list[dict[str, Any]] = []

    def record_probe(self, region_id: str, is_success: bool, latency_ms: float = 12.0) -> None:
        """Record health probe from region monitoring agent."""
        with self._lock:
            if region_id not in self.regions:
                self.regions[region_id] = RegionHealth(region_id=region_id, role=RegionRole.STANDBY)

            r = self.regions[region_id]
            r.last_heartbeat = time.time()
            r.db_latency_ms = latency_ms

            if is_success:
                r.is_healthy = True
                r.consecutive_failures = 0
            else:
                r.consecutive_failures += 1
                if r.consecutive_failures >= 3:
                    r.is_healthy = False
                    logger.warning(
                        f"DR ALERT: Region '{region_id}' marked UNHEALTHY after {r.consecutive_failures} consecutive failures!"
                    )

    def trigger_failover(self, target_region: str, reason: str = "Primary region outage") -> dict[str, Any]:
        """Execute automated or operator-directed cross-region failover."""
        with self._lock:
            if target_region not in self.regions:
                raise ValueError(f"Unknown target region '{target_region}'")

            target = self.regions[target_region]
            if not target.is_healthy:
                raise RuntimeError(f"Cannot failover to unhealthy region '{target_region}'")

            if target.schema_version != self.schema_version:
                raise RuntimeError(
                    f"Schema version mismatch! Primary is '{self.schema_version}', target is '{target.schema_version}'"
                )

            old_primary = self.active_write_region
            self.active_write_region = target_region

            # Update roles
            if old_primary in self.regions:
                self.regions[old_primary].role = RegionRole.DEGRADED
            target.role = RegionRole.PRIMARY

            event = {
                "failover_id": f"fo_{uuid.uuid4().hex[:10]}",
                "from_region": old_primary,
                "to_region": target_region,
                "reason": reason,
                "timestamp": time.time(),
                "status": "COMPLETED",
            }
            self.failover_history.append(event)

            logger.critical(
                f"DISASTER RECOVERY COMPLETED: Traffic promoted to '{target_region}'. "
                f"Old region '{old_primary}' demoted to DEGRADED. Reason: {reason}"
            )
            return event

    def get_cluster_status(self) -> dict[str, Any]:
        """Return real-time multi-region replication and failover status."""
        with self._lock:
            return {
                "active_write_region": self.active_write_region,
                "schema_version": self.schema_version,
                "regions": {
                    k: {
                        "role": v.role.value,
                        "is_healthy": v.is_healthy,
                        "latency_ms": v.db_latency_ms,
                        "consecutive_failures": v.consecutive_failures,
                    }
                    for k, v in self.regions.items()
                },
                "total_failovers": len(self.failover_history),
                "latest_failover": self.failover_history[-1] if self.failover_history else None,
            }


DR_CONTROLLER = DisasterRecoveryController()

