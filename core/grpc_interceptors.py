"""Google & YouTube production-grade gRPC Interceptors, Resilient Client Policies,
Distributed Tracing (W3C traceparent), Structured Logging, and Health Checking.
"""

from collections import namedtuple
import contextvars
import json
import logging
import random
import secrets
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import grpc
from google.rpc import code_pb2, status_pb2
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

logger = logging.getLogger("watchbloom.grpc")

# ── W3C DISTRIBUTED TRACE CONTEXT (traceparent: 00-{trace_id}-{span_id}-{flags}) ──
_CURRENT_TRACE: contextvars.ContextVar[Dict[str, str]] = contextvars.ContextVar(
    "current_trace", default={}
)


def generate_trace_id() -> str:
    """Generate 16-byte random hex string (32 characters)."""
    return secrets.token_hex(16)


def generate_span_id() -> str:
    """Generate 8-byte random hex string (16 characters)."""
    return secrets.token_hex(8)


def parse_traceparent(val: str) -> Optional[Tuple[str, str, str]]:
    """Parse W3C traceparent: 00-{trace_id}-{span_id}-{flags}."""
    if not val or not isinstance(val, str):
        return None
    parts = val.strip().split("-")
    if len(parts) == 4 and parts[0] == "00" and len(parts[1]) == 32 and len(parts[2]) == 16:
        return parts[1], parts[2], parts[3]
    return None


def format_traceparent(trace_id: str, span_id: str, flags: str = "01") -> str:
    """Format into standard W3C traceparent header."""
    return f"00-{trace_id}-{span_id}-{flags}"


def get_current_trace() -> Dict[str, str]:
    """Retrieve active trace context."""
    return _CURRENT_TRACE.get()


def set_current_trace(trace_id: str, span_id: str, flags: str = "01") -> None:
    """Set active trace context in ContextVar."""
    _CURRENT_TRACE.set({
        "trace_id": trace_id,
        "span_id": span_id,
        "flags": flags,
        "traceparent": format_traceparent(trace_id, span_id, flags),
    })


# ── IDEMPOTENT METHODS FOR SAFE AUTOMATIC RETRY ──
IDEMPOTENT_METHODS = {
    # CatalogService
    "/watchbloom.catalog.CatalogService/SearchVideos",
    "/watchbloom.catalog.CatalogService/GetVideo",
    "/watchbloom.catalog.CatalogService/BrowseCatalog",
    "/watchbloom.catalog.CatalogService/GetCategories",
    "/watchbloom.catalog.CatalogService/GetChannels",
    # StreamingService
    "/watchbloom.streaming.StreamingService/ResolveOptimalCdn",
    "/watchbloom.streaming.StreamingService/GetSignedMediaUrl",
    "/watchbloom.streaming.StreamingService/GetMasterPlaylist",
    # AuthService
    "/watchbloom.auth.AuthService/VerifyToken",
    "/watchbloom.auth.AuthService/GetUserProfile",
    "/watchbloom.auth.AuthService/GetUserSettings",
    "/watchbloom.auth.AuthService/GetNotificationLogs",
    "/watchbloom.auth.AuthService/MarkNotificationRead",
    # AnalyticsService
    "/watchbloom.analytics.AnalyticsService/GetRealtimeMetrics",
    # Health
    "/grpc.health.v1.Health/Check",
}

# Retryable transient status codes
RETRYABLE_STATUS_CODES = {
    grpc.StatusCode.UNAVAILABLE,
    grpc.StatusCode.DEADLINE_EXCEEDED,
    grpc.StatusCode.RESOURCE_EXHAUSTED,
}


# ── SERVER INTERCEPTOR: TRACING, STRUCTURED LOGGING & RICH ERROR HANDLING ──
class UnifiedServerInterceptor(grpc.ServerInterceptor):
    """Production server interceptor implementing:
    1. W3C Traceparent extraction, child span generation, and response header injection.
    2. Structured JSON/Context logging of inbound requests and latency.
    3. Google rich status error handling (google.rpc.Status in grpc-status-details-bin).
    """

    def __init__(self, service_name: str = "grpc-service"):
        self.service_name = service_name

    def intercept_service(self, continuation, handler_call_details):
        handler = continuation(handler_call_details)
        if handler is None:
            return None

        method = handler_call_details.method

        if handler.unary_unary:
            def unary_unary(request, context):
                # 1. Extract W3C Trace Context
                metadata_dict = dict(context.invocation_metadata() or ())
                incoming_tp = metadata_dict.get("traceparent")
                parsed = parse_traceparent(incoming_tp) if incoming_tp else None

                if parsed:
                    trace_id, parent_span_id, flags = parsed
                else:
                    trace_id = generate_trace_id()
                    flags = "01"

                span_id = generate_span_id()
                set_current_trace(trace_id, span_id, flags)

                # Attach outgoing traceparent in trailing metadata
                tp_out = format_traceparent(trace_id, span_id, flags)
                context.set_trailing_metadata((("traceparent", tp_out),))

                # 2. Structured Request Logging
                peer = context.peer() or "unknown"
                start_time = time.perf_counter()
                logger.info(
                    f"[{self.service_name}] Inbound RPC start: {method} "
                    f"from={peer} trace_id={trace_id} span_id={span_id}"
                )

                # 3. Execution & Google.rpc.Status rich error wrapping
                try:
                    if handler.unary_unary is None:
                        return None
                    response = handler.unary_unary(request, context)
                    duration_ms = (time.perf_counter() - start_time) * 1000.0
                    logger.info(
                        f"[{self.service_name}] Inbound RPC success: {method} "
                        f"duration={duration_ms:.2f}ms trace_id={trace_id}"
                    )
                    return response
                except Exception as exc:
                    duration_ms = (time.perf_counter() - start_time) * 1000.0
                    # Map standard Python domain exceptions to Google RPC statuses
                    grpc_code, rpc_code = self._map_exception_to_codes(exc)

                    # Build rich Google RPC Status
                    rich_status = status_pb2.Status(
                        code=rpc_code,
                        message=str(exc) or "Internal Service Error",
                    )
                    status_bin = rich_status.SerializeToString()

                    # Set trailing metadata with standard Google grpc-status-details-bin
                    existing_trailing: list[tuple[str, str | bytes]] = list(context.trailing_metadata() or ())
                    existing_trailing.append(("grpc-status-details-bin", status_bin))
                    context.set_trailing_metadata(tuple(existing_trailing))

                    logger.error(
                        f"[{self.service_name}] Inbound RPC failure: {method} "
                        f"code={grpc_code.name} duration={duration_ms:.2f}ms "
                        f"trace_id={trace_id} error={exc}"
                    )
                    context.abort(grpc_code, str(exc))

            return grpc.unary_unary_rpc_method_handler(
                unary_unary,
                request_deserializer=handler.request_deserializer,
                response_serializer=handler.response_serializer,
            )

        return handler

    @staticmethod
    def _map_exception_to_codes(exc: Exception) -> Tuple[grpc.StatusCode, int]:
        if isinstance(exc, ValueError):
            return grpc.StatusCode.INVALID_ARGUMENT, code_pb2.INVALID_ARGUMENT
        if isinstance(exc, KeyError):
            return grpc.StatusCode.NOT_FOUND, code_pb2.NOT_FOUND
        if isinstance(exc, PermissionError):
            return grpc.StatusCode.PERMISSION_DENIED, code_pb2.PERMISSION_DENIED
        if isinstance(exc, TimeoutError):
            return grpc.StatusCode.DEADLINE_EXCEEDED, code_pb2.DEADLINE_EXCEEDED
        return grpc.StatusCode.INTERNAL, code_pb2.INTERNAL


# ── CLIENT INTERCEPTOR: TRACING, RETRIES WITH EXPONENTIAL BACKOFF & JITTER ──
class _ClientCallDetails(
    namedtuple(
        "_ClientCallDetails",
        ("method", "timeout", "metadata", "credentials", "wait_for_ready"),
    ),
    grpc.ClientCallDetails,
):
    pass


class ResilientClientInterceptor(grpc.UnaryUnaryClientInterceptor):
    """Client interceptor that handles:
    1. Automatic W3C traceparent injection and propagation across hops.
    2. Per-call deadline enforcement & propagation.
    3. Transparent retries with exponential backoff & jitter for idempotent RPCs.
    """

    def __init__(
        self,
        default_timeout: float = 5.0,
        max_retries: int = 3,
        initial_backoff: float = 0.05,
        backoff_factor: float = 2.0,
        max_backoff: float = 1.0,
        jitter: float = 0.05,
    ):
        self.default_timeout = default_timeout
        self.max_retries = max_retries
        self.initial_backoff = initial_backoff
        self.backoff_factor = backoff_factor
        self.max_backoff = max_backoff
        self.jitter = jitter

    def intercept_unary_unary(self, continuation, client_call_details, request):
        method = client_call_details.method

        # 1. Distributed Tracing Injection
        trace_ctx = get_current_trace()
        if trace_ctx and "trace_id" in trace_ctx:
            trace_id = trace_ctx["trace_id"]
            flags = trace_ctx.get("flags", "01")
        else:
            trace_id = generate_trace_id()
            flags = "01"

        client_span_id = generate_span_id()
        traceparent = format_traceparent(trace_id, client_span_id, flags)

        # Merge metadata
        metadata = list(client_call_details.metadata or [])
        metadata.append(("traceparent", traceparent))

        # Enforce deadline timeout
        timeout = client_call_details.timeout or self.default_timeout

        call_details = _ClientCallDetails(
            method=method,
            timeout=timeout,
            metadata=tuple(metadata),
            credentials=client_call_details.credentials,
            wait_for_ready=client_call_details.wait_for_ready,
        )

        is_idempotent = method in IDEMPOTENT_METHODS
        attempt = 0

        while True:
            start_time = time.perf_counter()
            outcome = continuation(call_details, request)
            exc = outcome.exception()

            if exc is None:
                duration_ms = (time.perf_counter() - start_time) * 1000.0
                logger.debug(
                    f"Outbound RPC success: {method} duration={duration_ms:.2f}ms trace_id={trace_id}"
                )
                return outcome

            # Check if retryable
            code = getattr(exc, "code", lambda: None)() if hasattr(exc, "code") else None
            duration_ms = (time.perf_counter() - start_time) * 1000.0

            if is_idempotent and code in RETRYABLE_STATUS_CODES and attempt < self.max_retries:
                attempt += 1
                backoff = min(
                    self.max_backoff,
                    self.initial_backoff * (self.backoff_factor ** (attempt - 1)),
                )
                backoff += random.uniform(0, self.jitter)

                logger.warning(
                    f"Outbound RPC transient error: {method} code={code.name} "
                    f"attempt={attempt}/{self.max_retries} backoff={backoff:.3f}s trace_id={trace_id}"
                )
                time.sleep(backoff)
                continue

            logger.error(
                f"Outbound RPC failed: {method} code={code.name if code else 'UNKNOWN'} "
                f"duration={duration_ms:.2f}ms trace_id={trace_id} attempts={attempt + 1}"
            )
            return outcome


# ── CLIENT-SIDE LOAD BALANCER & CHANNEL POOL (ROUND-ROBIN & LEAST-CONN) ──
class LoadBalancedChannelPool:
    """Production client-side channel pool supporting:
    - Multiple backend target endpoints (e.g. ['host1:50051', 'host2:50051']).
    - Round-robin and Least-Connection load balancing policies.
    - Automatic channel keepalive and HTTP/2 multiplexing.
    - Health circuit breaking with automatic temporary cooldown on unavailable nodes.
    """

    def __init__(
        self,
        targets: Union[str, List[str]],
        strategy: str = "round_robin",
        default_timeout: float = 5.0,
        max_retries: int = 3,
    ):
        if isinstance(targets, str):
            self.targets = [t.strip() for t in targets.split(",") if t.strip()]
        else:
            self.targets = list(targets)

        if not self.targets:
            self.targets = ["localhost:50051"]

        self.strategy = strategy.lower()
        self.default_timeout = default_timeout
        self.max_retries = max_retries

        self._lock = threading.Lock()
        self._rr_index = 0
        self._active_conns: Dict[str, int] = {t: 0 for t in self.targets}
        self._unhealthy_until: Dict[str, float] = {}
        self._raw_channels: Dict[str, grpc.Channel] = {}
        self._intercepted_channels: Dict[str, grpc.Channel] = {}

    def _get_channel_for_target(self, target: str) -> grpc.Channel:
        with self._lock:
            if target not in self._intercepted_channels:
                raw_chan = grpc.insecure_channel(
                    target,
                    options=[
                        ("grpc.keepalive_time_ms", 30000),
                        ("grpc.keepalive_timeout_ms", 10000),
                        ("grpc.keepalive_permit_without_calls", True),
                        ("grpc.http2.max_pings_without_data", 0),
                    ],
                )
                interceptor = ResilientClientInterceptor(
                    default_timeout=self.default_timeout,
                    max_retries=self.max_retries,
                )
                intercepted = grpc.intercept_channel(raw_chan, interceptor)
                self._raw_channels[target] = raw_chan
                self._intercepted_channels[target] = intercepted
            return self._intercepted_channels[target]

    def select_target(self) -> str:
        """Select healthy target according to configured load-balancing strategy."""
        now = time.time()
        with self._lock:
            # Filter out temporarily unhealthy nodes
            healthy = [t for t in self.targets if self._unhealthy_until.get(t, 0) < now]
            if not healthy:
                # If all marked unhealthy, clear cooldowns and fallback to all targets
                self._unhealthy_until.clear()
                healthy = self.targets

            if self.strategy == "least_conn":
                # Pick target with smallest active connection load
                chosen = min(healthy, key=lambda t: self._active_conns.get(t, 0))
            else:
                # Round-robin selection
                chosen = healthy[self._rr_index % len(healthy)]
                self._rr_index += 1

            self._active_conns[chosen] = self._active_conns.get(chosen, 0) + 1
            return chosen

    def release_target(self, target: str, failed: bool = False) -> None:
        """Release active connection counter and update target health."""
        now = time.time()
        with self._lock:
            if target in self._active_conns:
                self._active_conns[target] = max(0, self._active_conns[target] - 1)
            if failed:
                # Mark unhealthy for 5-second cooldown
                self._unhealthy_until[target] = now + 5.0

    def get_channel(self) -> grpc.Channel:
        """Get an intercepted channel according to current LB selection."""
        target = self.select_target()
        return self._get_channel_for_target(target)

    def close(self) -> None:
        """Close all managed channels."""
        with self._lock:
            for chan in self._raw_channels.values():
                try:
                    chan.close()
                except Exception:
                    pass
            self._raw_channels.clear()
            self._intercepted_channels.clear()


# ── GRPC HEALTH CHECKING PROTOCOL (grpc.health.v1.Health) ──
def setup_health_checking(
    server: grpc.Server,
    service_names: Optional[List[str]] = None,
) -> health.HealthServicer:
    """Attach standard grpc.health.v1.Health servicer to gRPC server."""
    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)

    # Mark overall server health
    health_servicer.set("", health_pb2.HealthCheckResponse.SERVING)

    # Mark individual domain service names
    if service_names:
        for name in service_names:
            health_servicer.set(name, health_pb2.HealthCheckResponse.SERVING)

    return health_servicer

