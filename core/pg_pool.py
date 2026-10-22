"""PostgreSQL Primary and Read Replica Cluster Manager with PgBouncer Connection Pooling.
Provides automatic read/write query splitting, connection validation, retry logic,
and seamless local SQLite connection pool fallback.
"""

from contextlib import contextmanager
import itertools
import logging
import threading
import time
from typing import Any

from config import (
    DATABASE_READ_URLS,
    DATABASE_URL,
    PG_CONNECT_TIMEOUT,
    PG_POOL_MAXCONN,
    PG_POOL_MINCONN,
    REACTIONS_DB,
    USE_POSTGRES,
)
from core.db import get_db_connection as get_sqlite_conn

logger = logging.getLogger("watchbloom.pg_pool")

try:
    import psycopg2
    from psycopg2 import pool
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    psycopg2 = None  # type: ignore
    pool = None  # type: ignore
    RealDictCursor = None  # type: ignore
    HAS_PSYCOPG2 = False


class DatabaseClusterManager:
    """Manages high-performance connection pools to PostgreSQL Primary, Read Replicas,
    PgBouncer, or SQLite fallback.
    """

    def __init__(self):
        self._write_pool = None
        self._read_pools: list[Any] = []
        self._read_cycler = None
        self._lock = threading.Lock()
        self.use_postgres = USE_POSTGRES and HAS_PSYCOPG2
        self.stats = {
            "write_queries": 0,
            "read_queries": 0,
            "failed_connections": 0,
            "retries": 0,
        }
        if self.use_postgres:
            self._init_pools()

    def _init_pools(self):
        try:
            connect_kwargs = {
                "connect_timeout": PG_CONNECT_TIMEOUT,
                "keepalives": 1,
                "keepalives_idle": 30,
                "keepalives_interval": 10,
                "keepalives_count": 5,
            }

            # 1. Primary Write Pool (Direct or via PgBouncer port 6432)
            pool_mod: Any = pool
            self._write_pool = pool_mod.ThreadedConnectionPool(
                minconn=PG_POOL_MINCONN,
                maxconn=PG_POOL_MAXCONN,
                dsn=DATABASE_URL,
                **connect_kwargs,
            )
            logger.info(f"Initialized PostgreSQL Primary write pool (min={PG_POOL_MINCONN}, max={PG_POOL_MAXCONN}).")

            # 2. Read Replica Pools (Direct or via PgBouncer port 6433)
            replica_urls = DATABASE_READ_URLS or [DATABASE_URL]
            for url in replica_urls:
                try:
                    pool_mod: Any = pool
                    p = pool_mod.ThreadedConnectionPool(
                        minconn=PG_POOL_MINCONN,
                        maxconn=PG_POOL_MAXCONN,
                        dsn=url,
                        **connect_kwargs,
                    )
                    self._read_pools.append(p)
                except Exception as r_err:
                    logger.warning(f"Could not connect to read replica ({url}): {r_err}")

            if not self._read_pools and self._write_pool:
                self._read_pools.append(self._write_pool)

            self._read_cycler = itertools.cycle(self._read_pools)
            logger.info(f"Initialized {len(self._read_pools)} PostgreSQL read replica pools.")
        except Exception as e:
            logger.warning(f"Failed to initialize PostgreSQL cluster, falling back to SQLite: {e}")
            self.use_postgres = False

    def _validate_connection(self, conn) -> bool:
        """Verify that a pooled connection is alive before borrowing."""
        if not conn or conn.closed != 0:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute("/* ping */ SELECT 1;")
            return True
        except Exception:
            return False

    @contextmanager
    def get_connection(self, write: bool = False):
        """Acquire connection routed to Primary (write=True) or Read Replicas (write=False).
        Includes connection validation and broken socket recycling.
        """
        if not self.use_postgres or not self._write_pool:
            # Seamless fallback to existing optimized SQLite manager
            with get_sqlite_conn(REACTIONS_DB) as conn:
                yield conn
            return

        with self._lock:
            if write:
                self.stats["write_queries"] += 1
            else:
                self.stats["read_queries"] += 1

        target_pool = self._write_pool if (write or not self._read_pools or self._read_cycler is None) else next(self._read_cycler)
        conn = None
        is_broken = False

        # Acquire connection with validation (up to 3 retries)
        for attempt in range(3):
            try:
                candidate = target_pool.getconn()
                if self._validate_connection(candidate):
                    conn = candidate
                    break
                else:
                    # Stale or dead connection; discard and close
                    target_pool.putconn(candidate, close=True)
                    self.stats["retries"] += 1
            except Exception as get_err:
                logger.warning(f"Error checking out database connection (attempt {attempt + 1}): {get_err}")
                self.stats["failed_connections"] += 1
                time.sleep(0.05)

        if not conn:
            # Fallback to write pool if read pool candidate failed
            if not write and self._write_pool:
                try:
                    conn = self._write_pool.getconn()
                    target_pool = self._write_pool
                except Exception:
                    pass

            if not conn:
                # Ultimate fallback to SQLite to prevent 500 errors
                logger.error("PostgreSQL pool exhausted or unreachable. Falling back to local SQLite.")
                with get_sqlite_conn(REACTIONS_DB) as fallback_conn:
                    yield fallback_conn
                return

        try:
            if write:
                conn.autocommit = False
            yield conn
            if write:
                conn.commit()
        except Exception:
            if write and conn and conn.closed == 0:
                try:
                    conn.rollback()
                except Exception:
                    pass
            is_broken = True
            raise
        finally:
            if conn:
                try:
                    if conn.closed != 0:
                        is_broken = True
                    target_pool.putconn(conn, close=is_broken)
                except Exception as put_err:
                    logger.warning(f"Error returning connection to pool: {put_err}")

    def init_schema(self):
        """Create tables and indexes in PostgreSQL Primary."""
        if not self.use_postgres:
            return

        with self.get_connection(write=True) as conn:
            cur = conn.cursor()
            try:
                # 1. Reactions table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS video_reactions (
                        item_id VARCHAR(64) NOT NULL,
                        visitor_id VARCHAR(64) NOT NULL,
                        reaction VARCHAR(16) NOT NULL CHECK (reaction IN ('like', 'dislike')),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (item_id, visitor_id)
                    );
                    CREATE INDEX IF NOT EXISTS idx_pg_reactions_visitor ON video_reactions(visitor_id, reaction);
                    CREATE INDEX IF NOT EXISTS idx_pg_reactions_item ON video_reactions(item_id, reaction);
                    """
                )

                # 2. Videos catalog table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS videos (
                        id VARCHAR(64) PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        author VARCHAR(100) NOT NULL,
                        description TEXT,
                        category VARCHAR(50),
                        format VARCHAR(30) DEFAULT 'standard',
                        views BIGINT DEFAULT 0,
                        duration INT DEFAULT 0,
                        mins INT DEFAULT 1,
                        media_filename VARCHAR(255),
                        hls_master_url VARCHAR(500),
                        date DATE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
                    CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC);
                    CREATE INDEX IF NOT EXISTS idx_videos_date ON videos(date DESC);

                    -- 3. Live events table
                    CREATE TABLE IF NOT EXISTS live_events (
                        id VARCHAR(64) PRIMARY KEY,
                        title VARCHAR(255) NOT NULL,
                        author VARCHAR(100) NOT NULL,
                        description TEXT,
                        category VARCHAR(50) DEFAULT 'entertainment',
                        status VARCHAR(20) DEFAULT 'active',
                        media_filename VARCHAR(255),
                        hls_url VARCHAR(500),
                        media_url VARCHAR(500),
                        views BIGINT DEFAULT 0,
                        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        ended_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_pg_live_events_status ON live_events(status);
                    CREATE INDEX IF NOT EXISTS idx_pg_live_events_author ON live_events(author);
                    """
                )
            finally:
                cur.close()
            logger.info("PostgreSQL schema and covering indexes verified.")

    def get_stats(self) -> dict[str, Any]:
        """Return pool connection statistics."""
        return {
            "use_postgres": self.use_postgres,
            "minconn": PG_POOL_MINCONN,
            "maxconn": PG_POOL_MAXCONN,
            "read_pools_count": len(self._read_pools),
            "stats": self.stats,
        }

    def close_all(self):
        """Cleanly close all pools."""
        if self._write_pool:
            try:
                self._write_pool.closeall()
            except Exception:
                pass
        for p in self._read_pools:
            try:
                p.closeall()
            except Exception:
                pass


DB_CLUSTER = DatabaseClusterManager()
get_db = DB_CLUSTER.get_connection
