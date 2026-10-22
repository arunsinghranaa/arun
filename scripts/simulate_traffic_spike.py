"""High-Concurrency Traffic & Load Spike Simulator for Watchbloom.
Tests Horizontal Pod Autoscaler (HPA), Ingress rate-limiting, and Celery worker scaling.
"""

import argparse
import concurrent.futures
import time
import urllib.request
import urllib.error
import json
import statistics


def send_request(url: str) -> tuple[int, float]:
    """Execute single HTTP request and record response code and elapsed time."""
    start = time.perf_counter()
    status_code = 0
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "WatchbloomLoadTester/1.0",
                "Accept": "application/json",
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            status_code = resp.getcode()
            resp.read()
    except urllib.error.HTTPError as e:
        status_code = e.code
    except Exception:
        status_code = 599  # Client network error

    elapsed = time.perf_counter() - start
    return status_code, elapsed


def run_spike_test(target_url: str, total_requests: int, concurrency: int):
    print(f"\n========================================================")
    print(f" Watchbloom Traffic Spike Simulation")
    print(f" Target URL     : {target_url}")
    print(f" Total Requests : {total_requests}")
    print(f" Concurrency    : {concurrency} threads")
    print(f"========================================================\n")

    latencies = []
    status_codes = {}
    
    start_total = time.perf_counter()

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(send_request, target_url) for _ in range(total_requests)]
        for i, future in enumerate(concurrent.futures.as_completed(futures), start=1):
            code, lat = future.result()
            latencies.append(lat)
            status_codes[code] = status_codes.get(code, 0) + 1
            if i % 100 == 0 or i == total_requests:
                print(f"Progress: {i}/{total_requests} requests completed...")

    total_duration = time.perf_counter() - start_total
    rps = total_requests / total_duration if total_duration > 0 else 0

    latencies.sort()
    p50 = statistics.median(latencies) * 1000
    p95 = latencies[int(len(latencies) * 0.95)] * 1000
    p99 = latencies[int(len(latencies) * 0.99)] * 1000

    print(f"\n────────────────── RESULTS SUMMARY ──────────────────")
    print(f" Total Duration : {total_duration:.2f} seconds")
    print(f" Throughput     : {rps:.2f} req/sec")
    print(f" Status Codes   : {json.dumps(status_codes)}")
    print(f" Latency p50    : {p50:.2f} ms")
    print(f" Latency p95    : {p95:.2f} ms")
    print(f" Latency p99    : {p99:.2f} ms")
    print(f"─────────────────────────────────────────────────────\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Watchbloom Traffic Spike Tester")
    parser.add_argument("--url", default="http://localhost/api/v1/search?q=test", help="Target URL")
    parser.add_argument("--requests", type=int, default=500, help="Number of total requests")
    parser.add_argument("--concurrency", type=int, default=25, help="Concurrent client workers")
    args = parser.parse_args()

    run_spike_test(args.url, args.requests, args.concurrency)

