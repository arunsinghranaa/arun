# Watchbloom Docker Multi-Container Architecture & Operations Guide

This guide describes how to build, run, scale, and maintain the containerized Watchbloom video streaming platform in development, staging, and high-concurrency production environments.

---

## 1. Container Architecture Overview

The multi-container deployment orchestrates 9 specialized services over an isolated bridge network (`watchbloom_net`):

```mermaid
flowchart TD
    User["Viewers & Creators"] -->|Port 80/443| Nginx["Nginx Reverse Proxy & Load Balancer<br/>(docker/Dockerfile.nginx)"]
    
    subgraph FrontendAndEdge["Edge & Static Delivery"]
        Nginx -->|Direct High-Speed Serving| StaticFiles["Static UI & Assets (/static/)"]
        Nginx -->|HLS Immutable Caching| VideoSegments[".ts & .m4s Video Segments"]
    end

    subgraph AppCluster["Application Tier (Scalable)"]
        Nginx -->|Round-Robin| API1["Watchbloom Flask API (Replica 1)<br/>(docker/Dockerfile.api)"]
        Nginx -->|Round-Robin| API2["Watchbloom Flask API (Replica 2)"]
    end

    subgraph QueueAndWorkers["Asynchronous Transcoding Cluster (Scalable)"]
        API1 & API2 -->|Enqueue Transcode Jobs| RedisQueue[("Redis Broker & Cache<br/>(redis:7.2-alpine)")]
        RedisQueue --> Worker1["Celery Transcoding Worker 1<br/>(docker/Dockerfile.worker)"]
        RedisQueue --> Worker2["Celery Transcoding Worker 2"]
        CeleryBeat["Celery Beat Scheduler<br/>(docker/Dockerfile.beat)"] -->|Periodic Buffer Flush| RedisQueue
    end

    subgraph DatabaseTier["High-Availability Database Cluster"]
        API1 & API2 -->|Write Queries (INSERT/UPDATE)| PBWrite["PgBouncer Write Pool<br/>(Port 6432)"]
        API1 & API2 -->|Read Queries (SELECT)| PBRead["PgBouncer Read Pool<br/>(Port 6433)"]
        
        PBWrite --> PGPrimary[("PostgreSQL 16 Primary<br/>(postgres_primary:5432)")]
        PGPrimary -.->|Streaming WAL Replication| PGReplica[("PostgreSQL 16 Read Replica<br/>(postgres_replica:5432)")]
        PBRead --> PGReplica
    end

    subgraph CloudStorage["Cloud Object Storage (Optional)"]
        Worker1 & Worker2 -->|Upload ABR HLS Packages| R2["Cloudflare R2 Object Storage<br/>(Zero Egress)"]
    end
```

---

## 2. Directory Structure

```text
├── docker/
│   ├── Dockerfile.api         # Multi-stage hardened Flask API container (non-root)
│   ├── Dockerfile.worker      # Celery worker container equipped with FFmpeg
│   ├── Dockerfile.beat        # Celery beat periodic task scheduler
│   ├── Dockerfile.nginx       # Edge Nginx reverse proxy with caching & rate limiting
│   ├── nginx/
│   │   ├── nginx.conf         # Worker processes, connection tuning, Gzip settings
│   │   └── watchbloom.conf    # Upstream routing, rate limiting zones, HLS headers
│   ├── pgbouncer/
│   │   ├── pgbouncer-write.ini # Transaction pool configuration for Primary writes (6432)
│   │   ├── pgbouncer-read.ini  # Transaction pool configuration for Read replicas (6433)
│   │   └── userlist.txt       # MD5 auth credentials for PgBouncer
│   └── postgres/
│       ├── init-primary.sh    # WAL replication role & postgresql.conf optimization
│       └── init-replica.sh    # Standby replication bootstrap from primary via pg_basebackup
├── scripts/
│   ├── entrypoint-api.sh      # Health waiting, schema verification, Gunicorn launch
│   ├── entrypoint-worker.sh   # FFmpeg binary check, broker waiting, Celery launch
│   └── migrate_sqlite_to_pg.py# Data transfer script from SQLite to PostgreSQL
├── docker-compose.yml         # Master production orchestration file
├── docker-compose.dev.yml     # Development override with hot-reload bind mounts
├── .dockerignore              # Clean build context exclusion list
└── .env.example               # Full environment variables template
```

---

## 3. Quickstart & Deployment

### Step 1: Prepare Environment Configuration
Copy the template configuration and customize credentials:
```bash
cp .env.example .env
```
Ensure you set a strong `SECRET_KEY`, `POSTGRES_PASSWORD`, and your Cloudflare R2 credentials (if using R2 storage).

### Step 2: Build and Start All Containers
Launch the complete multi-container stack in the background:
```bash
docker compose up -d --build
```

### Step 3: Verify Container Health
Check that all 9 services report healthy status:
```bash
docker compose ps
```
Expected output:
```text
NAME                            IMAGE                        STATUS
watchbloom_nginx                watchbloom-nginx             Up (healthy) 0.0.0.0:80->80/tcp
watchbloom_api_1                watchbloom/api:latest        Up (healthy) 5000/tcp
watchbloom_transcode_worker_1   watchbloom/worker:latest     Up (healthy)
watchbloom_celery_beat          watchbloom/beat:latest       Up
watchbloom_pgbouncer_write      edoburu/pgbouncer:v1.22.1    Up (healthy) 0.0.0.0:6432->6432/tcp
watchbloom_pgbouncer_read       edoburu/pgbouncer:v1.22.1    Up (healthy) 0.0.0.0:6433->6433/tcp
watchbloom_pg_primary           postgres:16-alpine           Up (healthy) 5432/tcp
watchbloom_pg_replica           postgres:16-alpine           Up (healthy) 5432/tcp
watchbloom_redis                redis:7.2-alpine             Up (healthy) 0.0.0.0:6379->6379/tcp
```

### Step 4: Run Initial Database Migration
If you have existing catalog data or SQLite reactions to import into PostgreSQL:
```bash
docker compose exec api python scripts/migrate_sqlite_to_pg.py
```

---

## 4. Horizontal Scaling in Production

To handle YouTube-scale concurrency spikes (e.g. viral video uploads, live event streaming):

### Scale Application API Workers:
Spin up multiple stateless Flask Gunicorn instances behind Nginx:
```bash
docker compose up -d --scale api=4
```
Nginx automatically load-balances incoming HTTP/2 requests across all 4 API containers.

### Scale Transcoding Workers:
Increase the Celery FFmpeg encoding capacity to process multiple video uploads simultaneously:
```bash
docker compose up -d --scale celery_worker=6
```
The Redis task queue distributes transcoding jobs across all 6 workers with strict prefetch limits (`worker_prefetch_multiplier = 1`).

---

## 5. Development Mode with Live Code Reloading

For local development where you want code changes to reflect immediately without rebuilding Docker images:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```
This mounts the local repository directory directly into `/app` with Flask auto-reload enabled.

---

## 6. Monitoring, Logs & Troubleshooting

### View Service Logs
```bash
# Follow all logs
docker compose logs -f

# Follow API server logs
docker compose logs -f api

# Follow transcoding worker logs
docker compose logs -f celery_worker
```

### Inspect PgBouncer Connection Pools
```bash
docker compose exec pgbouncer_write psql -p 6432 -U watchbloom_user -d pgbouncer -c "SHOW POOLS;"
docker compose exec pgbouncer_write psql -p 6432 -U watchbloom_user -d pgbouncer -c "SHOW CLIENTS;"
```

### Inspect Redis Queue Depth
```bash
docker compose exec redis redis-cli -n 1 LLEN celery
```

### Verify PostgreSQL Replication Lag
```bash
docker compose exec postgres_primary psql -U watchbloom_user -d watchbloom -c "SELECT client_addr, state, sync_state FROM pg_stat_replication;"
```

---

## 7. Production Hardening Features

- **Non-Root Execution:** API, Worker, and Beat containers run as unprivileged user `watchbloom` (UID 10001).
- **Multi-Stage Builds:** Development compilers (`gcc`, `libpq-dev`) are stripped from final runtime images.
- **PgBouncer Transaction Pooling:** Up to 10,000 client connections multiplexed into 50 database connections, eliminating connection exhaustion.
- **Resource Constraints:** Explicit CPU and memory limits prevent runaway FFmpeg jobs from impacting the API server.
- **Graceful Shutdown:** SIGTERM handling allows Gunicorn and Celery to finish active requests before terminating.

