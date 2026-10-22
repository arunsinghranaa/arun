#!/usr/bin/env bash
set -e

echo "=== Starting Watchbloom Transcoding Worker ==="

# Verify FFmpeg binary
if command -v ffmpeg >/dev/null 2>&1; then
    echo "FFmpeg detected: $(ffmpeg -version | head -n 1)"
else
    echo "WARNING: ffmpeg not found in PATH!"
fi

# Wait for Celery broker (Redis)
if [ -n "$CELERY_BROKER_URL" ]; then
    echo "Waiting for Celery broker connectivity..."
    python -c "
import os, time, sys
try:
    import redis
    broker_url = os.environ.get('CELERY_BROKER_URL', '')
    if broker_url.startswith('redis://'):
        for attempt in range(30):
            try:
                r = redis.Redis.from_url(broker_url, socket_timeout=2)
                r.ping()
                print('Broker connected successfully!')
                sys.exit(0)
            except Exception:
                time.sleep(1)
        print('Broker connection timeout, launching anyway.')
except ImportError:
    pass
"
fi

echo "Launching Celery Worker..."
exec "$@"

