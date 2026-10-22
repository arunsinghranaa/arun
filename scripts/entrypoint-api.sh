#!/usr/bin/env bash
set -e

echo "=== Starting Watchbloom API Service ==="

# If PostgreSQL is configured, wait for PgBouncer / Postgres connection
if [ -n "$DATABASE_URL" ]; then
    echo "Checking database connectivity..."
    python -c "
import os, time, sys
try:
    import psycopg2
    db_url = os.environ.get('DATABASE_URL')
    for attempt in range(30):
        try:
            conn = psycopg2.connect(db_url, connect_timeout=3)
            conn.close()
            print('Database is ready!')
            sys.exit(0)
        except Exception as e:
            time.sleep(1)
    print('Database connection timeout, proceeding with startup anyway.')
except ImportError:
    pass
"
    # Auto-initialize schema
    echo "Verifying PostgreSQL schema..."
    python -c "
from core.pg_pool import DB_CLUSTER
DB_CLUSTER.init_schema()
" || echo "Schema verification completed or skipped."
fi

# If Redis is configured, verify connectivity
if [ -n "$REDIS_URL" ]; then
    echo "Verifying Redis connectivity..."
    python -c "
import os, sys
try:
    import redis
    r = redis.Redis.from_url(os.environ.get('REDIS_URL'), socket_timeout=2)
    r.ping()
    print('Redis connection verified!')
except Exception as e:
    print(f'Redis not available ({e}), using in-memory fallbacks.')
"
fi

echo "Launching Gunicorn application server..."
exec "$@"

