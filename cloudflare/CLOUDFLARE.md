# Cloudflare Global Edge CDN & Load Balancing Guide for Watchbloom

This guide outlines how to configure Cloudflare to provide edge caching, DDoS mitigation, token authentication at the edge, and Global Server Load Balancing (GSLB) across multi-region Kubernetes/Docker clusters.

---

## Architecture Overview

```
 [Global Users (Worldwide)]
           │
           ▼
 [Cloudflare Anycast Network (300+ Edge PoPs)]
    ├── DDoS & WAF Protection
    ├── Edge Worker: Token & Signed URL Verification (`cloudflare/worker-edge-auth.js`)
    ├── Edge Cache: HLS .ts chunks (1 yr) / Playlists / Static Assets
    └── Cloudflare Global Load Balancer (Geo & Dynamic Latency Steering)
           │
     ┌─────┴──────────────────┬──────────────────┐
     ▼                        ▼                  ▼
[US East K8s Cluster]    [EU Central K8s]   [Asia Pacific K8s]
  (4-40 API Replicas)    (4-40 API Replicas)  (4-40 API Replicas)
```

---

## 1. Cloudflare Cache Rules Activation

Import or apply the rules defined in [`cloudflare/cache-rules.json`](./cache-rules.json) via Cloudflare Dashboard > **Caching** > **Cache Rules** or via Cloudflare API:

1. **HLS Video Segments (`.ts`, `.m4s`)**:
   - **Edge TTL**: 1 Year (`31536000s`)
   - **Browser TTL**: 1 Year
   - **Byte-Range Caching**: Enabled (critical for video scrubbing & seeking)
   - **Tiered Cache**: Enabled (routes cache misses through Cloudflare Regional Tiered Caches, achieving 99%+ cache hit ratio and near-zero origin egress).

2. **HLS VOD Manifests (`master.m3u8`)**:
   - **Edge TTL**: 24 Hours with `stale-while-revalidate`
   - **Browser TTL**: 10 seconds

3. **HLS Live Streaming Manifests**:
   - **Edge TTL**: 2 seconds
   - **Browser TTL**: 1 second

4. **Catalog Search API (`/api/v1/search*`)**:
   - **Edge TTL**: 5 minutes
   - **Browser TTL**: 60 seconds
   - Bypass cache if `Authorization` header is present.

---

## 2. Deploying Edge Authentication Worker

The worker at [`cloudflare/worker-edge-auth.js`](./worker-edge-auth.js) validates cryptographic HMAC-SHA256 signatures for media endpoints before they hit your clusters:

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Set the cryptographic secret
wrangler secret put MEDIA_SIGNING_SECRET

# 4. Deploy worker to 300+ Edge Data Centers
wrangler deploy
```

---

## 3. Cloudflare Global Server Load Balancer (GSLB)

Deploy the Terraform configuration in [`cloudflare/load-balancer.tf`](./load-balancer.tf):

```bash
cd cloudflare
terraform init
terraform plan
terraform apply
```

Features provided:
- **Geo-Steering**: Automatically directs users in North America to US East, European users to EU Central, and Asian users to Asia Pacific.
- **Dynamic Latency Failover**: If an entire cloud region or datacenter suffers an outage, Cloudflare detects it via `/healthz` monitor within 10 seconds and reroutes traffic automatically.
- **Zero-Downtime Maintenance**: Individual clusters can be drained or upgraded without user impact.

