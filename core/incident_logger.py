"""Production Incident Management, On-Call Escalation & Blameless Postmortem Generator.
Implements Google SRE Incident Command System (ICS) for P0-P3 outages.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import json
import logging
import threading
import time
from typing import Any
import uuid

logger = logging.getLogger("watchbloom.incidents")


class IncidentSeverity(str, Enum):
    P0 = "P0"  # Critical outage: Global playback failure or primary DB down
    P1 = "P1"  # High severity: Degraded live streaming, high transcoding failure rate
    P2 = "P2"  # Moderate severity: Search latency elevated, admin metrics delayed
    P3 = "P3"  # Low severity: Minor visual bug, non-critical background task slow


class IncidentStatus(str, Enum):
    DECLARED = "DECLARED"
    INVESTIGATING = "INVESTIGATING"
    IDENTIFIED = "IDENTIFIED"
    MITIGATING = "MITIGATING"
    RESOLVED = "RESOLVED"


@dataclass
class IncidentTimelineEntry:
    timestamp: float
    description: str
    actor: str = "SRE_SYSTEM"


@dataclass
class ProductionIncident:
    incident_id: str
    title: str
    severity: IncidentSeverity
    status: IncidentStatus = IncidentStatus.DECLARED
    lead_responder: str = "OnCall-Primary"
    impact_summary: str = ""
    root_cause: str = ""
    start_time: float = field(default_factory=time.time)
    resolved_time: float | None = None
    timeline: list[IncidentTimelineEntry] = field(default_factory=list)
    action_items: list[str] = field(default_factory=list)


class IncidentManager:
    """Orchestrates active production incidents and automated blameless postmortem creation."""

    def __init__(self):
        self._lock = threading.Lock()
        self._incidents: dict[str, ProductionIncident] = {}

    def declare_incident(
        self,
        title: str,
        severity: IncidentSeverity = IncidentSeverity.P1,
        lead_responder: str = "OnCall-Primary",
        impact_summary: str = "",
    ) -> ProductionIncident:
        """Declare a new production incident and notify on-call escalation team."""
        incident_id = f"inc_{datetime.now(timezone.utc).strftime('%Y%m%d')}_{uuid.uuid4().hex[:6]}"
        now = time.time()
        incident = ProductionIncident(
            incident_id=incident_id,
            title=title,
            severity=severity,
            lead_responder=lead_responder,
            impact_summary=impact_summary,
            start_time=now,
            timeline=[
                IncidentTimelineEntry(
                    timestamp=now,
                    description=f"Incident declared at severity {severity.value}: {title}",
                    actor=lead_responder,
                )
            ],
        )

        with self._lock:
            self._incidents[incident_id] = incident

        logger.critical(
            f"SRE ON-CALL ALERT [{severity.value}]: Incident '{title}' declared! (ID: {incident_id})"
        )
        return incident

    def add_timeline_event(self, incident_id: str, description: str, actor: str = "SRE") -> None:
        """Append an operational update to the incident timeline."""
        with self._lock:
            inc = self._incidents.get(incident_id)
            if inc:
                inc.timeline.append(
                    IncidentTimelineEntry(timestamp=time.time(), description=description, actor=actor)
                )

    def resolve_incident(
        self,
        incident_id: str,
        root_cause: str,
        action_items: list[str] | None = None,
    ) -> bool:
        """Mark incident as resolved and record postmortem findings."""
        now = time.time()
        with self._lock:
            inc = self._incidents.get(incident_id)
            if not inc:
                return False

            inc.status = IncidentStatus.RESOLVED
            inc.resolved_time = now
            inc.root_cause = root_cause
            if action_items:
                inc.action_items.extend(action_items)

            inc.timeline.append(
                IncidentTimelineEntry(timestamp=now, description=f"Incident resolved: {root_cause}", actor="SRE")
            )

        logger.info(f"Incident '{incident_id}' marked RESOLVED. Total duration: {now - inc.start_time:.1f}s")
        return True

    def generate_postmortem_markdown(self, incident_id: str) -> str:
        """Generate a Google SRE-standard Blameless Postmortem document."""
        with self._lock:
            inc = self._incidents.get(incident_id)

        if not inc:
            return "# Postmortem Not Found"

        duration_sec = (inc.resolved_time or time.time()) - inc.start_time
        duration_min = round(duration_sec / 60.0, 1)

        timeline_lines = "\n".join(
            f"- **{time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(e.timestamp))}** [{e.actor}]: {e.description}"
            for e in inc.timeline
        )

        actions_lines = "\n".join(f"- [ ] {item}" for item in inc.action_items) if inc.action_items else "- [ ] None recorded"

        return f"""# SRE Blameless Postmortem: {inc.title}

**Incident ID:** `{inc.incident_id}`  
**Severity:** `{inc.severity.value}`  
**Status:** `{inc.status.value}`  
**Lead Responder:** `{inc.lead_responder}`  
**Time to Resolution (TTR):** `{duration_min} minutes`  

---

## 1. Executive Summary & Impact
{inc.impact_summary or "Production impairment affecting Watchbloom services."}

## 2. Root Cause Analysis (5 Whys)
{inc.root_cause or "Pending postmortem investigation."}

## 3. Incident Timeline
{timeline_lines}

## 4. Corrective & Preventative Action Items
{actions_lines}
"""


INCIDENT_MANAGER = IncidentManager()

