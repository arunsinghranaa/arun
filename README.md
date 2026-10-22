# Watchbloom

Watchbloom is a responsive video and playlist discovery app built with Flask and SQLite FTS5. It has its own search, categories, visual identity, and catalog. It does not fetch YouTube data or reuse YouTube branding.

## Features

- Search videos and playlists with title-weighted relevance, prefix matching, typo correction, and suggestions.
- Browse categories, filter by content type, duration, and upload date, and sort by featured, popularity, or newest.
- Play your own original MP4 or WebM files in a browser video player.
- Follow creators, choose a local bell preference, save items, and keep recent searches on this device; switch between soft charcoal dark mode and warm light mode.
- English/Hinglish interface, keyboard-friendly search, responsive navigation, and clear empty/error states.
- Playlists contain links to catalogued videos and show their contents in the playlist detail view.

The catalog currently contains sample metadata and CSS-generated cover art. No video files were supplied with the project, so the player will show a helpful message until you add your own media. Follows and bell preferences are saved in the current browser only; this demo does not send push notifications.

## Run locally on Windows

Open PowerShell in this project folder:

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Open <http://127.0.0.1:5000/>. Keep the terminal open while using the app. Flask debug mode is off by default.

## Add your videos

1. Copy your original video into `static/videos/`. MP4 (H.264) is recommended; WebM is also supported.
2. Add or edit a video entry in `catalog.json`. Set `media` to the file name only, for example `"media": "python-loops.mp4"`.
3. Set `category` to one of: `technology`, `gaming`, `music`, `news`, `sports`, `cooking`, `travel`, `entertainment`, `lifestyle`, `creative`, or `learning`.
4. Restart the server and open the video card. The player supports browser controls, seeking, and fullscreen.

Never put a path to someone else's copyrighted video into the catalog unless you have permission to use it. This version has no public upload feature.

Example:

```json
{
  "id": "v9",
"type": "video",
  "title": "A video you made",
  "author": "Your name",
  "tags": "topic original video",
  "mins": 8,
  "description": "A short description of your video.",
  "views": 0,
  "date": "2026-10-17",
  "art": "aqua",
  "category": "technology",
  "media": "your-video.mp4"
}
```

## API

Open the versioned API overview at <http://127.0.0.1:5000/api/v1> while the app is running, or read [API.md](API.md).

```text
GET /api/v1
GET /api/v1/explore?sort=newest&limit=6&offset=0
GET /api/v1/videos?sort=popularity
GET /api/v1/playlists?category=technology
GET /api/v1/search?q=python&type=all&sort=relevance
GET /api/v1/suggestions?q=py
GET /api/v1/channels
GET /api/v1/channels/northstar-lab/videos
GET /api/v1/playlists/p4
GET /api/v1/media/v9
GET /healthz
```

The existing `/api/...` routes remain as compatibility aliases. `type=course` is accepted as a legacy alias for `type=playlist`. Follow and bell preferences remain local to the browser because this demo has no account sign-in or server-side subscription storage. Playlist results include `playlist_items` with their video metadata; search and browse results also include `category`, `category_label`, and `media_url`. The media endpoint only serves a catalogued video file with an MP4 or WebM extension from `static/videos/`; it supports browser range requests for seeking.

## Free Render preview

The included `render.yaml` configures a free Flask web service with Gunicorn and a health check. Connect this folder to a Git repository, then create a Blueprint in Render and deploy it. Render assigns an `onrender.com` subdomain; the exact address is reserved only when the service is created.

Render's free service can sleep after inactivity and its writable filesystem is temporary. The app therefore stores saved items and recent searches in the viewer's browser and does not support accounts or uploads. Bundled video files are part of the deploy, but public video traffic is subject to the host's free bandwidth limits. Treat this as a small demo/hobby deployment, not a public-scale video host.

## Global Scale Deployment & Orchestration

Watchbloom supports enterprise, YouTube-scale high-concurrency deployments:

### 1. Production Docker Compose Cluster
- **4 API Pods + 6 Celery Transcoding Workers + PgBouncer Read/Write + Postgres Primary/Replica + Redis**:
  ```powershell
  docker compose up -d --build
  docker compose up -d --scale api=4 --scale celery_worker=6
  ```
- See [DOCKER.md](DOCKER.md) for complete operations guide.

### 2. Kubernetes Orchestration (`k8s/`)
- Declarative manifests with Kustomize support (`k8s/kustomization.yaml`):
  ```bash
  kubectl apply -k k8s/
  ```
- **Horizontal Pod Autoscaling (HPA)**: Dual-metric scaling based on CPU (70%), Memory (80%), and Prometheus request throughput (`250 rps/pod`).
- **KEDA Event-driven Scaler**: Auto-scales Celery transcode workers from 2 to 24 pods based on Redis transcoding queue backlogs.
- **High Availability**: Pod anti-affinity and multi-zone topology spread constraints.

### 3. Docker Swarm Stack (`docker-stack.yml`)
- Deploy to a Docker Swarm cluster with rolling zero-downtime updates:
  ```bash
  docker stack deploy -c docker-stack.yml watchbloom
  ```

### 4. Cloudflare CDN & Global Load Balancing (`cloudflare/`)
- **Edge Caching Rules**: 1-year immutable edge caching for HLS `.ts` video chunks, byte-range caching, and Tiered Cache (`cloudflare/cache-rules.json`).
- **Edge Authentication Worker**: Validates cryptographic HMAC-SHA256 signatures at Cloudflare's edge PoPs before traffic reaches origin (`cloudflare/worker-edge-auth.js`).
- **Global Server Load Balancer (GSLB)**: Geo-steering and sub-5s automatic failover across multi-region Kubernetes clusters (`cloudflare/load-balancer.tf`).

### 5. Optimized Database Pooling & Redis Caching
- **Database Connection Pools**: Auto-validated PostgreSQL Primary and Read Replica connection pools (`min=5`, `max=50`) via PgBouncer with `SELECT 1` pre-borrow validation, idle keepalives, and thread-safe SQLite connection pool fallback.
- **Redis High-Performance Caching**: Caches frequently accessed video metadata (`item:meta:*`), categories (`catalog:categories`), creator channel directories (`channels:directory`), and shared reaction totals (`reaction:counts:*`) with distributed lock stampede (dogpile) protection and atomic pattern invalidation.

### 6. Monorepo Microservices & gRPC Inter-Service Communication
Watchbloom utilizes a high-performance **Monorepo** architecture with decoupled microservices communicating over **gRPC** and **Protocol Buffers** for YouTube-scale internal remote procedure calls:
- **Monorepo Structure**:
  ```text
  search-backend/
  ├── proto/                 # Canonical Protocol Buffer definitions & compiled stubs
  │   ├── auth.proto         # AuthService schema (tokens, RBAC, profiles)
  │   ├── catalog.proto      # CatalogService schema (search, browse, channels)
  │   ├── streaming.proto    # StreamingService schema (signed URLs, multi-CDN)
  │   └── analytics.proto    # AnalyticsService schema (views, QoE, telemetry)
  ├── services/              # Domain-decoupled microservices
  │   ├── auth/              # Auth microservice server (port 50051) & reusable client
  │   ├── catalog/           # Catalog & search microservice (port 50052) & client
  │   ├── streaming/         # Streaming & multi-CDN routing microservice (port 50054) & client
  │   └── analytics/         # Real-time event ingestion & metrics microservice (port 50055) & client
  └── scripts/
      └── compile_proto.py   # Protoc compilation script for updating stubs
  ```
- **High-Performance gRPC Communication**:
  - Strongly-typed binary serialization with zero schema drift.
  - HTTP/2 multiplexing, header compression, and persistent connection channels with TCP keepalive (`grpc.keepalive_time_ms = 30000`).
  - Thread-safe gRPC client wrappers with lazy stub caching and connection reuse.
- **Production Interceptors & Reliability Engineering (`core/grpc_interceptors.py`)**:
  - **W3C Distributed Tracing (`traceparent`)**: OpenTelemetry-compatible `00-{trace_id}-{span_id}-{flags}` context propagation across microservice RPC hops.
  - **Structured Request/Response Logging**: Tracks inbound/outbound RPC method names, caller peers, latency, and status codes.
  - **Google Rich Error Model (`google.rpc.Status`)**: Standardized exception mapping (`code_pb2`) serialized into `grpc-status-details-bin` metadata.
  - **Resilient Client Policies**: Transparent retries with exponential backoff and randomized jitter for idempotent RPCs (`SearchVideos`, `ResolveOptimalCdn`, `VerifyToken`) and deadline propagation.
  - **gRPC Health Checking Protocol (`grpc.health.v1.Health`)**: Container lifecycle readiness and liveness probes (`Check` & `Watch`) implemented across all microservice servers.
  - **Client-Side Load Balancing (`LoadBalancedChannelPool`)**: Round-robin and least-connection routing across horizontally scaled service replicas with automatic circuit breaking.
- **Nginx HTTP/2 gRPC & gRPC-Web Gateway**:
  - Port `50050`: Dedicated cleartext HTTP/2 ingress gateway with native `grpc_pass` routing to internal microservice clusters.
  - Port `80`: gRPC-Web reverse-proxy with CORS preflight handling and `grpc-status-details-bin` trailer exposure for browser clients.
- **Compiling Protobuf Schemas**:
  ```powershell
  python scripts/compile_proto.py
  ```
- **Running a Service Server**:
  ```powershell
  python -m services.auth.server      # Starts AuthService on 0.0.0.0:50051
  python -m services.catalog.server   # Starts CatalogService on 0.0.0.0:50052
  python -m services.streaming.server # Starts StreamingService on 0.0.0.0:50054
  python -m services.analytics.server # Starts AnalyticsService on 0.0.0.0:50055
  ```



### Settings, Mail & Asynchronous Reporting Suite

- **User Preferences & Privacy**:
  - Fine-grained controls for channel visibility (`public`, `unlisted`, `private`), follower/subscription list exposure, public liked videos, and search engine indexing.
  - Streaming playback configuration: default quality resolution (`auto`, `1080p`, `720p`, `480p`, `360p`), ambient cinema glow, autoplay next, custom playback speed, and default captioning.
  - Granular notification subscriptions: email digests, new subscriber alerts, recommendation roundups, and critical security notices.
  - Low-latency read operations backed by Redis caching (`user:settings:{user_id}`) with automatic atomic cache invalidation and write-through persistence.
- **Asynchronous Trust & Safety Abuse Reporting**:
  - Multi-target reporting pipeline covering videos, comments, creator channels, and playlists.
  - Categorized violation reason codes (`spam`, `copyright`, `violence`, `harassment`, `other`) with context metadata and timestamp tagging.
  - Dispatches reports asynchronously via Celery worker queues (`process_abuse_report_task`) with fallback for synchronous test execution.
- **Support Mail & Helpdesk Integration**:
  - Authenticated and guest contact support submission interface with categorization (`technical`, `streaming`, `account`, `creator`, `general`).
  - Automated dispatch to Celery background task queue (`send_support_mail_task`) with ticket confirmation receipts and status tracking.
- **Real-Time Notification & Inquiries Feed**:
  - Real-time logging of system alerts, moderation outcomes, and support responses.
  - Interactive read/unread state tracking with instantaneous UI sync.
- **Frontend Settings Hub**:
  - Fully responsive, glassmorphic Settings Hub tab integrated directly into Watchbloom with 6 interactive panels: *Privacy & Profile*, *Playback Preferences*, *Notification Alerts*, *Contact & Support*, *Abuse Reporting*, and *Inquiries & Activity Log*.


The **Watchbloom** name is a working name, not a trademark clearance. Check the official trademark registries and the chosen domain registrar before using the name publicly.
