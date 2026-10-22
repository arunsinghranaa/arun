# Watchbloom API v1

Watchbloom has its own JSON API for its own catalog. It is inspired by common video-platform concepts such as videos, playlists, channels, search, and explore; it does not call YouTube or return YouTube catalog data.

## Base URL

When running locally, use:

```text
http://127.0.0.1:5000/api/v1
```

The local URL is available only on the computer running the Flask app. A public URL requires a deployment. Read-only catalog endpoints do not need an API key.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1` | API version and route list |
| GET | `/api/v1/docs` | This guide |
| GET | `/api/v1/explore` | Browse all catalog items |
| GET | `/api/v1/videos` | Browse videos |
| GET | `/api/v1/videos/{item_id}` | Get one video |
| GET, POST | `/api/v1/videos/{item_id}/reactions` | Read or set this browser's like/dislike and get shared totals |
| GET | `/api/v1/playlists` | Browse playlists |
| GET | `/api/v1/playlists/{item_id}` | Get a playlist and its video entries |
| GET | `/api/v1/search?q=...` | Search videos and playlists |
| GET | `/api/v1/suggestions?q=...` | Search suggestions |
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/channels` | List creators and their catalog counts |
| GET, POST/PUT | `/api/v1/user/settings` | Retrieve or update user privacy, playback, and notification preferences |
| POST | `/api/v1/reports` | Submit abuse, copyright, or guideline violation report for review |
| GET | `/api/v1/reports/{report_id}` | Check status and resolution of an abuse report |
| POST | `/api/v1/support/contact` | Submit support inquiry or feedback to helpdesk queue |
| GET | `/api/v1/support/mail/{mail_id}` | Check status and details of a support inquiry ticket |
| GET | `/api/v1/notifications` | Fetch recent system notifications and activity alerts |
| POST | `/api/v1/notifications/{id}/read` | Mark a system notification as read |
| GET | `/api/v1/channels/{channel_id}` | Get creator details |
| GET | `/api/v1/channels/{channel_id}/videos` | List a creator's videos |
| GET | `/api/v1/channels/{channel_id}/playlists` | List a creator's playlists |
| GET | `/api/v1/media/{item_id}` | Stream an original catalogued video file |
| GET | `/api/v1/media/{item_id}/signed-url` | Generate a time-limited HMAC-SHA256 signed URL for media access |
| POST | `/api/v1/uploads/presigned-url` | Generate Cloudflare R2 presigned upload URL for direct-to-storage client uploads |
| POST | `/api/v1/videos/transcode/async` | Dispatch asynchronous multi-bitrate HLS transcoding to Celery worker pool |
| GET | `/api/v1/jobs/{task_id}` | Poll background job status and progress metadata |
| POST | `/api/v1/videos/{item_id}/view` | Record video view into high-concurrency Redis write-behind buffer |
| POST | `/api/v1/admin/flush-buffers` | Flush write-behind view and reaction buffers to persistent database |
| POST | `/api/v1/auth/register` | Register new user account with hashed password and role |
| POST | `/api/v1/auth/login` | Authenticate with credentials and receive signed HS256 JWT token with RBAC claims |
| POST | `/api/v1/auth/logout` | Revoke current JWT token (adds to Redis revocation blocklist) |
| GET | `/api/v1/auth/me` | Fetch authenticated user profile and permissions |
| POST | `/api/v1/auth/demo-token` | Generate demo JWT token for local testing |
| GET | `/api/v1/auth/verify` | Validate Bearer JWT token |
| GET | `/api/v1/subtitles/{item_id}/{track_index}` | Stream an original WebVTT subtitle track |
| GET | `/api/v1/hls/{item_id}/master.m3u8` | Stream HLS master adaptive bitrate playlist |
| GET | `/api/v1/hls/{item_id}/{quality}/{filename}` | Stream HLS variant playlist or `.ts` segment |
| GET | `/api/v1/hls/live/{stream_id}/{filename}` | Stream low-latency live HLS playlist or segment |
| GET | `/metrics` | Prometheus metrics endpoint (OpenMetrics text format) |
| GET | `/api/v1/metrics` | Prometheus metrics JSON summary |
| POST | `/api/v1/telemetry` | Ingest client-side QoE playback telemetry |

## Examples

```text
http://127.0.0.1:5000/api/v1/videos?sort=popularity&limit=6
http://127.0.0.1:5000/api/v1/playlists?category=technology
http://127.0.0.1:5000/api/v1/search?q=python&type=video&sort=relevance
http://127.0.0.1:5000/api/v1/suggestions?q=py
http://127.0.0.1:5000/api/v1/categories
http://127.0.0.1:5000/api/v1/channels
http://127.0.0.1:5000/api/v1/channels/northstar-lab
http://127.0.0.1:5000/api/v1/channels/northstar-lab/videos
http://127.0.0.1:5000/api/v1/playlists/p4
```

PowerShell examples:

```powershell
Invoke-RestMethod "http://127.0.0.1:5000/api/v1/videos?limit=6"
Invoke-RestMethod "http://127.0.0.1:5000/api/v1/search?q=python"
Invoke-RestMethod "http://127.0.0.1:5000/api/v1/channels/northstar-lab"
```

## Reactions and subtitles

Reaction requests use the `X-Watchbloom-Visitor` header with a stable, random browser ID. The app creates and stores this ID in that browser. A visitor can have one reaction per video; sending `like`, `dislike`, or `null` sets, switches, or removes it. Responses include aggregate `likes` and `dislikes` totals. These are anonymous browser-ID counts, not verified people or account votes.

```text
GET /api/v1/videos/v1/reactions
POST /api/v1/videos/v1/reactions  {"reaction":"like"}
```

Videos may list original WebVTT subtitle files in `catalog.json`:

```json
"subtitles": [{"language": "hi", "label": "Hindi", "file": "v1-hi.vtt"}]
```

Place that file in `static/subtitles/`. Start it with `WEBVTT`; the video details response exposes safe track labels and URLs for the player. No subtitle is fabricated when a video has no track attached.

Browse and search accept `type=all|video|playlist`, `sort=relevance|popularity|newest`, `category`, `duration=all|under3|3to20|over20`, `uploaded=any|today|week|month|year`, `limit`, and `offset`. Video and playlist list routes default to their own type. Search results include a `results` array and `total`; playlists include `playlist_items` with metadata for their videos.

## Follow and bell preferences

The current app has no accounts or login. Follow/unfollow and bell preferences are stored in the browser on that device, so there are no server-side subscription or notification routes yet. A secure API for syncing those preferences needs user sign-in first. This demo does not send push notifications.

## Video files

`media_url` is present only when the matching original MP4 or WebM file exists in `static/videos/`. The media route supports range requests for seeking. The API does not proxy or download videos from another platform.

## Pagination Envelopes

Catalog browsing (`/api/v1/videos`, `/api/v1/playlists`, `/api/v1/channels`, `/api/v1/search`) returns standardized pagination envelopes:

```json
{
  "results": [...],
  "total": 46,
  "limit": 10,
  "offset": 0,
  "page": 1,
  "total_pages": 5,
  "has_next": true,
  "has_prev": false
}
```

Both `limit` (clamped 1-50) with `offset` and 1-indexed `page` (e.g. `?limit=10&page=2`) are supported.

## Security, JWT Authentication & Role-Based Access Control (RBAC)

- **JWT Authentication**: Register via `POST /api/v1/auth/register` or authenticate via `POST /api/v1/auth/login`. Attach `Authorization: Bearer <token>` to protected endpoints.
- **Role-Based Access Control (RBAC)**:
  - **`admin`**: Full platform authority (delete any video, flush counter buffers, manage system settings).
  - **`creator`**: Content publisher (upload videos, initiate transcode jobs, manage and delete *own* videos).
  - **`viewer` / `user`**: Consumer (search, browse, reactions, watch streams; prohibited from uploading or deleting content).
  - **`anonymous`**: Public guest (search, browse, watch streams).
- **Token Revocation (Blocklist)**: Calling `POST /api/v1/auth/logout` revokes the token's unique `jti` in Redis and in-memory caches, immediately terminating access before expiry.
- **Strict CORS**: Origin whitelisting with preflight `OPTIONS` `204` handling and credentialed response headers (`Access-Control-Allow-Credentials: true`).
- **Security Headers**: All responses carry `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and a hardened `Content-Security-Policy`.
- **Input Sanitization**: Strip XSS scripts, HTML tags, and sanitize path traversal sequences in IDs and filenames.
- **Signed URLs**: Media streaming assets can be protected with time-limited HMAC-SHA256 signatures via `/api/v1/media/{item_id}/signed-url`. Set `REQUIRE_SIGNED_MEDIA=1` in environment to strictly enforce signed URLs.

## Distributed Sliding-Window Rate Limiting

The API is protected by a distributed sliding-window rate limiter powered by Redis (with thread-safe in-memory fallback):
- **Response Headers**:
  - `X-RateLimit-Limit`: Maximum requests permitted in window.
  - `X-RateLimit-Remaining`: Remaining permitted requests.
  - `X-RateLimit-Reset`: Unix timestamp when current window resets.
- **Rate Limit Tiers (Per Window)**:
  - **Anonymous Public**: `60 requests / minute` (keyed by real client IP via Cloudflare `CF-Connecting-IP`).
  - **Authenticated Viewer**: `300 requests / minute` (keyed by User ID).
  - **Creator**: `1,000 requests / minute` (keyed by User ID).
  - **Admin**: `10,000 requests / minute` or exempt.
- **Route-Specific Throttling**:
  - `POST /api/v1/auth/register`: `10 requests / minute` (prevents spam registration).
  - `POST /api/v1/auth/login`: `20 requests / minute` (mitigates brute-force credential stuffing).
  - `POST /api/v1/videos/upload`: `30 uploads / hour`.
- **Exceeded Response**: When thresholds are exceeded, the API returns **HTTP 429 Too Many Requests** with header `Retry-After: <seconds>` and JSON error envelope.

## Database Connection Pooling & Redis Caching

### 1. Database Connection Pooling Architecture
- **PostgreSQL Cluster Pooling (`core/pg_pool.py`)**:
  - Threaded connection pools (`PG_POOL_MINCONN=5`, `PG_POOL_MAXCONN=50`) connecting to PostgreSQL Primary (write) and Read Replicas (read) via PgBouncer.
  - **Connection Validation & Health Checks**: Fast `SELECT 1` ping verification prior to connection borrowing with automatic stale socket eviction (`putconn(conn, close=True)`).
  - **TCP Keepalives**: Idle keepalive intervals configured to prevent middlebox socket dropping.
  - **Auto-Failover**: Read queries automatically cycle across healthy read replicas, falling back to primary write pool or local SQLite if unavailable.
- **SQLite Connection Pool (`core/db.py`)**:
  - Thread-safe `SQLiteConnectionPool` with WAL mode (`PRAGMA journal_mode = WAL`), 64 MB memory page cache, and connection reuse eliminating repeated file open/close syscalls.

### 2. High-Performance Redis Caching for Frequently Accessed Data
- **Cached Entities & Key Patterns**:
  - **Video / Item Metadata** (`item:meta:{item_id}`): Caches base video metadata with 600s TTL. Real-time uncommitted view counters are overlaid dynamically on top of the cached representation.
  - **Categories** (`catalog:categories`): Caches sorted category dictionary with 3600s TTL.
  - **Channel Directory** (`channels:directory`): Caches aggregated creator catalog stats, view counts, and category distributions with 600s TTL.
  - **Reaction Counts** (`reaction:counts:{item_id}`): Caches shared like/dislike counts for 60s, protecting the database from high-volume read storms.
  - **Search & Explore Results** (`search:*`, `browse:*`): Caches paginated query results with 300s TTL.
- **Cache Stampede (Dogpile) Protection**: `CACHE.get_or_compute()` uses distributed Redis locks (and local thread locks) to ensure only a single worker executes the heavy data computation upon cache expiration, preventing database saturation.
- **Granular Pattern Invalidation**: Fast non-blocking SCAN-based key invalidation (`CACHE.delete_pattern()`) clears stale search, category, and item caches immediately upon video uploads, live stream recordings, or deletions.

## Microservices Architecture & gRPC Protocol Buffers (Inter-Service RPC)

To support massive concurrency with low CPU overhead and minimal bandwidth consumption, Watchbloom microservices communicate internally over **gRPC** using compact binary **Protocol Buffers (proto3)**.

### 1. Protocol Buffers & gRPC Services Overview

| Service | Port | Schema File | Core RPCs | Purpose |
| --- | --- | --- | --- | --- |
| **AuthService** | `50051` | `proto/auth.proto` | `Authenticate`, `VerifyToken`, `RegisterUser`, `RevokeToken`, `GetUserProfile` | Authentication, token validation, RBAC policy enforcement |
| **CatalogService** | `50052` | `proto/catalog.proto` | `SearchVideos`, `GetVideo`, `BrowseCatalog`, `GetCategories`, `GetChannels` | Search queries, full-text FTS5 matching, category and channel exploration |
| **StreamingService** | `50054` | `proto/streaming.proto` | `GetSignedMediaUrl`, `ResolveOptimalCdn`, `GetMasterPlaylist` | Multi-CDN routing, HMAC-SHA256 URL signing, HLS master playlist delivery |
| **AnalyticsService** | `50055` | `proto/analytics.proto` | `IngestViewEvent`, `IngestQoETelemetry`, `GetRealtimeMetrics` | High-throughput telemetry ingestion, buffer aggregation, live metrics reporting |

### 2. Python Client Usage Example

Microservices and API gateways invoke internal services via pooled, thread-safe gRPC clients:

```python
from services.auth.client import AuthClient
from services.catalog.client import CatalogClient
from services.streaming.client import StreamingClient
from services.analytics.client import AnalyticsClient

# 1. Authenticate user via AuthService
auth = AuthClient("localhost:50051")
auth_res = auth.authenticate("creator1", "secret123")
if auth_res.success:
    print(f"Logged in user: {auth_res.user.username}, Role: {auth_res.user.role}")

# 2. Search catalog via CatalogService
catalog = CatalogClient("localhost:50052")
search_res = catalog.search_videos("python", limit=5)
for video in search_res.results:
    print(f"[{video.id}] {video.title} - {video.views} views")

# 3. Resolve optimal CDN and signed media URL via StreamingService
streaming = StreamingClient("localhost:50054")
cdn_res = streaming.resolve_optimal_cdn("hls/v1/master.m3u8", preferred_provider="cloudflare")
signed_url = streaming.get_signed_media_url("/api/media/v1", expires_in=1800)
print(f"Optimal Stream URL: {cdn_res.optimal_url}")

# 4. Ingest real-time playback telemetry via AnalyticsService
analytics = AnalyticsClient("localhost:50055")
analytics.ingest_view("v1", client_ip="192.168.1.100", playback_time_s=45.2)
```

### 3. Production Interceptors & Reliability Engineering (`core/grpc_interceptors.py`)

- **W3C Distributed Tracing**: Interceptors extract and inject standard `traceparent` metadata (`00-{trace_id}-{span_id}-{flags}`) across client and server boundaries, tracking distributed request flows across the microservices ecosystem.
- **Structured RPC Telemetry**: Inbound and outbound RPC invocations are timed and logged with method name, peer address, execution duration in milliseconds, and status codes.
- **Google Rich Error Model**: Server interceptors catch Python domain exceptions and translate them into standardized `google.rpc.Status` protobuf payloads attached to `grpc-status-details-bin` trailing metadata.
- **Resilient Client Policies**:
  - Transparent retries with exponential backoff (`initial_backoff=0.05s`, `factor=2.0`, `max=1.0s`) and random jitter are enforced exclusively on idempotent RPCs (`SearchVideos`, `ResolveOptimalCdn`, `VerifyToken`, `GetMasterPlaylist`). Non-idempotent operations fail fast.
  - Per-call deadline propagation ensures bounded latency across distributed multi-hop calls.
- **gRPC Health Checking (`grpc.health.v1.Health`)**: Container lifecycle probes query `grpc.health.v1.Health/Check` for liveness and readiness across all four service ports.
- **Client-Side Load Balancing (`LoadBalancedChannelPool`)**: Supports comma-separated target endpoints (`"host1:50052,host2:50052"`) with `round_robin` and `least_conn` load distribution and automatic 5-second health cooldown for unavailable nodes.

### 4. Nginx Ingress Gateway & gRPC-Web Proxy

- **HTTP/2 Cleartext (h2c) Ingress (Port `50050`)**: Direct reverse proxy for internal gRPC clients and Kubernetes ingress controllers via `grpc_pass`.
- **gRPC-Web Translation (Port `80`)**: Enables direct browser client streaming RPC calls with CORS preflight `204` handling and exposure of `grpc-status`, `grpc-message`, `grpc-status-details-bin`, and `traceparent` headers.

### 5. Compilation of Protocol Buffer Schemas

Whenever `.proto` contracts in `proto/` are updated, stubs are recompiled into the repository via:

```powershell
python scripts/compile_proto.py
```


## User Settings, Mail & Reporting Endpoints

### 1. User Settings (`/api/v1/user/settings`)

- **`GET /api/v1/user/settings`**:
  Returns current privacy, playback, and notification settings for authenticated user (JWT) or visitor (`X-Watchbloom-Visitor`). Read operations are served from Redis cache when available.
  ```json
  {
    "success": true,
    "settings": {
      "user_id": "vis_a1b2c3d4",
      "privacy": {
        "profile_visibility": "public",
        "show_subscriptions": true,
        "show_liked_videos": false,
        "search_indexing": true
      },
      "playback": {
        "default_quality": "auto",
        "ambient_mode": true,
        "autoplay_next": true,
        "default_playback_rate": 1.0,
        "captions_enabled": false
      },
      "notifications": {
        "email_notifications": true,
        "new_subscriber_alerts": true,
        "recommendation_digests": true,
        "security_alerts": true
      },
      "updated_at": "2026-10-21T07:15:00+00:00"
    }
  }
  ```
- **`POST/PUT /api/v1/user/settings`**:
  Updates user settings. Accepts partial or full nested dictionaries (`privacy`, `playback`, `notifications`) or flat keys. Automatically invalidates and refreshes Redis cache.

### 2. Abuse & Copyright Reporting (`/api/v1/reports`)

- **`POST /api/v1/reports`**:
  Submits content for Trust & Safety review. Returns `202 Accepted` and enqueues asynchronous processing via Celery background workers.
  - **Payload**:
    - `target_type`: `"video"` | `"comment"` | `"channel"` | `"playlist"`
    - `target_id`: ID of the target resource
    - `reason_code`: `"spam"` | `"copyright"` | `"violence"` | `"harassment"` | `"other"`
    - `description`: Detailed description (up to 2000 chars)
    - `target_metadata`: Optional JSON metadata / timestamps
  - **Response (202 Accepted)**:
    ```json
    {
      "success": true,
      "report_id": "rep_123456789abc",
      "status": "pending",
      "is_async": true,
      "message": "Abuse report received and queued for review"
    }
    ```
- **`GET /api/v1/reports/{report_id}`**:
  Returns report details and current review status.

### 3. Contact Support & Mail (`/api/v1/support/contact`)

- **`POST /api/v1/support/contact`**:
  Submits inquiry or help ticket. Returns `202 Accepted` and dispatches confirmation email task via Celery.
  - **Payload**:
    - `email`: Contact email address
    - `category`: `"technical"` | `"streaming"` | `"account"` | `"creator"` | `"general"`
    - `subject`: Ticket subject
    - `message`: Description of inquiry (up to 5000 chars)
  - **Response (202 Accepted)**:
    ```json
    {
      "success": true,
      "mail_id": "mail_123456789abc",
      "status": "queued",
      "is_async": true,
      "message": "Support inquiry submitted. Our team will review and reply via email."
    }
    ```
- **`GET /api/v1/support/mail/{mail_id}`**:
  Returns ticket details and status.

### 4. Notifications & Alerts (`/api/v1/notifications`)

- **`GET /api/v1/notifications`**:
  Fetches notifications for current user with pagination (`limit`, `offset`) and filter (`unread=true`).
- **`POST /api/v1/notifications/{notification_id}/read`**:
  Marks the specified notification as read.

## Live Production Monitoring

- **Sentry SDK**: Configure `SENTRY_DSN` and `SENTRY_ENVIRONMENT` in environment variables for automatic crash reporting and Flask route exception tracking. Falls back gracefully when unconfigured in local development.
- **Prometheus Telemetry**: Scraped via `/metrics` (OpenMetrics format) or `/api/v1/metrics` (JSON summary), tracking request rates, latencies, active streams, and QoE metrics.

## Compatibility

The older `/api/browse`, `/api/search`, `/api/suggest`, `/api/items/{item_id}`, and `/api/media/{item_id}` routes remain available. The old `type=course` filter is accepted as an alias for `type=playlist`.
