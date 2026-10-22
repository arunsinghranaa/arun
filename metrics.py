"""Watchbloom Metrics & Telemetry Collector
Thread-safe Prometheus metrics registry and client-side QoE telemetry aggregator.
Zero-external-dependency, standard OpenMetrics / Prometheus text format 0.0.4.
"""

import threading
import time
from collections import defaultdict


class PrometheusRegistry:
    def __init__(self):
        self._lock = threading.Lock()
        # Requests: (method, endpoint, status) -> count
        self.http_requests_total = defaultdict(int)
        # Latency: endpoint -> (count, sum_seconds)
        self.http_duration = defaultdict(lambda: [0, 0.0])
        # HLS Segments: (quality,) -> count
        self.hls_segments_served = defaultdict(int)
        # Active live streams gauge
        self.active_streams = 0
        # Client QoE metrics
        self.qoe_stalls = defaultdict(int)
        self.qoe_stall_duration = defaultdict(float)
        self.qoe_dropped_frames = defaultdict(int)
        self.qoe_startup_time = defaultdict(lambda: [0, 0.0])
        self.qoe_quality_switches = defaultdict(int)

    def record_request(self, method: str, endpoint: str, status: int, duration_sec: float) -> None:
        with self._lock:
            self.http_requests_total[(method, endpoint, str(status))] += 1
            entry = self.http_duration[endpoint]
            entry[0] += 1
            entry[1] += duration_sec

    def record_hls_segment(self, quality: str = "auto") -> None:
        with self._lock:
            self.hls_segments_served[quality] += 1

    def set_active_streams(self, count: int) -> None:
        with self._lock:
            self.active_streams = max(0, count)

    def inc_active_streams(self) -> None:
        with self._lock:
            self.active_streams += 1

    def dec_active_streams(self) -> None:
        with self._lock:
            self.active_streams = max(0, self.active_streams - 1)

    def record_qoe(self, video_id: str, event_type: str, value: float | int = 1) -> None:
        safe_id = str(video_id or "unknown")[:32]
        with self._lock:
            if event_type == "stall":
                self.qoe_stalls[safe_id] += int(value or 1)
            elif event_type == "stall_duration":
                self.qoe_stall_duration[safe_id] += float(value or 0.0)
            elif event_type == "dropped_frames":
                self.qoe_dropped_frames[safe_id] += int(value or 0)
            elif event_type == "startup_time":
                entry = self.qoe_startup_time[safe_id]
                entry[0] += 1
                entry[1] += float(value or 0.0)
            elif event_type == "quality_switch":
                self.qoe_quality_switches[safe_id] += 1

    def generate_metrics_text(self) -> str:
        with self._lock:
            lines = [
                "# HELP watchbloom_http_requests_total Total HTTP requests received.",
                "# TYPE watchbloom_http_requests_total counter",
            ]
            for (method, endpoint, status), count in sorted(self.http_requests_total.items()):
                lines.append(
                    f'watchbloom_http_requests_total{{method="{method}",endpoint="{endpoint}",status="{status}"}} {count}'
                )

            lines.extend([
                "# HELP watchbloom_http_request_duration_seconds HTTP request latency summary in seconds.",
                "# TYPE watchbloom_http_request_duration_seconds summary",
            ])
            for endpoint, (count, total_sec) in sorted(self.http_duration.items()):
                lines.append(f'watchbloom_http_request_duration_seconds_count{{endpoint="{endpoint}"}} {count}')
                lines.append(f'watchbloom_http_request_duration_seconds_sum{{endpoint="{endpoint}"}} {total_sec:.6f}')

            lines.extend([
                "# HELP watchbloom_active_streams Current active live broadcasts.",
                "# TYPE watchbloom_active_streams gauge",
                f"watchbloom_active_streams {self.active_streams}",
                "# HELP watchbloom_hls_segments_served_total Total HLS video segments delivered.",
                "# TYPE watchbloom_hls_segments_served_total counter",
            ])
            for quality, count in sorted(self.hls_segments_served.items()):
                lines.append(f'watchbloom_hls_segments_served_total{{quality="{quality}"}} {count}')

            lines.extend([
                "# HELP watchbloom_qoe_stalls_total Playback buffering stall events reported by clients.",
                "# TYPE watchbloom_qoe_stalls_total counter",
            ])
            for video_id, count in sorted(self.qoe_stalls.items()):
                lines.append(f'watchbloom_qoe_stalls_total{{video_id="{video_id}"}} {count}')

            lines.extend([
                "# HELP watchbloom_qoe_stall_duration_seconds Total buffering wait time in seconds.",
                "# TYPE watchbloom_qoe_stall_duration_seconds counter",
            ])
            for video_id, total_dur in sorted(self.qoe_stall_duration.items()):
                lines.append(f'watchbloom_qoe_stall_duration_seconds{{video_id="{video_id}"}} {total_dur:.3f}')

            lines.extend([
                "# HELP watchbloom_qoe_dropped_frames_total Dropped video frames reported by client browsers.",
                "# TYPE watchbloom_qoe_dropped_frames_total counter",
            ])
            for video_id, count in sorted(self.qoe_dropped_frames.items()):
                lines.append(f'watchbloom_qoe_dropped_frames_total{{video_id="{video_id}"}} {count}')

            lines.extend([
                "# HELP watchbloom_qoe_startup_time_seconds Playback startup time (time-to-first-frame).",
                "# TYPE watchbloom_qoe_startup_time_seconds summary",
            ])
            for video_id, (count, total_time) in sorted(self.qoe_startup_time.items()):
                lines.append(f'watchbloom_qoe_startup_time_seconds_count{{video_id="{video_id}"}} {count}')
                lines.append(f'watchbloom_qoe_startup_time_seconds_sum{{video_id="{video_id}"}} {total_time:.4f}')

            lines.extend([
                "# HELP watchbloom_qoe_quality_switches_total Client adaptive or manual quality switch events.",
                "# TYPE watchbloom_qoe_quality_switches_total counter",
            ])
            for video_id, count in sorted(self.qoe_quality_switches.items()):
                lines.append(f'watchbloom_qoe_quality_switches_total{{video_id="{video_id}"}} {count}')

            return "\n".join(lines) + "\n"

    def get_summary(self) -> dict:
        with self._lock:
            total_requests = sum(self.http_requests_total.values())
            total_stalls = sum(self.qoe_stalls.values())
            total_dropped = sum(self.qoe_dropped_frames.values())
            total_segments = sum(self.hls_segments_served.values())
            return {
                "total_requests": total_requests,
                "active_streams": self.active_streams,
                "hls_segments_served": total_segments,
                "qoe_stalls": total_stalls,
                "qoe_dropped_frames": total_dropped,
            }


REGISTRY = PrometheusRegistry()

