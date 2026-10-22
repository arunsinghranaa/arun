# ==============================================================================
# Cloudflare Global Load Balancer (GSLB) & Multi-Region Failover Architecture
# Provisions Geo-Steering, Health Probes, and Automatic Origin Failover
# ==============================================================================

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for watchbloom.com"
  type        = string
  default     = "023e105f4ecef8ad9ca31a8372d0c353"
}

# ── 1. CLUSTER HEALTH CHECK MONITOR ──
# Probes Watchbloom /healthz endpoint every 10 seconds across global edge nodes
resource "cloudflare_load_balancer_monitor" "watchbloom_health" {
  account_id     = var.cloudflare_zone_id
  type           = "http"
  description    = "Watchbloom Cluster /healthz Monitor"
  method         = "GET"
  path           = "/healthz"
  port           = 443
  interval       = 10
  timeout        = 3
  retries        = 2
  expected_codes = "200"
  expected_body  = "\"status\":\"ok\""
  follow_redirects = false
  allow_insecure = false
}

# ── 2. REGIONAL ORIGIN POOLS ──
# US East Kubernetes Cluster Pool
resource "cloudflare_load_balancer_pool" "us_east_pool" {
  account_id         = var.cloudflare_zone_id
  name               = "watchbloom-us-east-pool"
  monitor            = cloudflare_load_balancer_monitor.watchbloom_health.id
  minimum_origins    = 1
  check_regions      = ["WNAM", "ENAM"]

  origins {
    name    = "k8s-us-east-ingress"
    address = "useast-ingress.watchbloom.com"
    enabled = true
    weight  = 1.0
  }
}

# Europe Central Kubernetes Cluster Pool
resource "cloudflare_load_balancer_pool" "eu_central_pool" {
  account_id         = var.cloudflare_zone_id
  name               = "watchbloom-eu-central-pool"
  monitor            = cloudflare_load_balancer_monitor.watchbloom_health.id
  minimum_origins    = 1
  check_regions      = ["WEU", "EEU"]

  origins {
    name    = "k8s-eu-central-ingress"
    address = "eucentral-ingress.watchbloom.com"
    enabled = true
    weight  = 1.0
  }
}

# Asia Pacific Kubernetes Cluster Pool
resource "cloudflare_load_balancer_pool" "ap_south_pool" {
  account_id         = var.cloudflare_zone_id
  name               = "watchbloom-ap-south-pool"
  monitor            = cloudflare_load_balancer_monitor.watchbloom_health.id
  minimum_origins    = 1
  check_regions      = ["SEAS", "NEAS", "SAS"]

  origins {
    name    = "k8s-ap-south-ingress"
    address = "apsouth-ingress.watchbloom.com"
    enabled = true
    weight  = 1.0
  }
}

# ── 3. GLOBAL LOAD BALANCER WITH GEO-STEERING ──
resource "cloudflare_load_balancer" "watchbloom_glb" {
  zone_id          = var.cloudflare_zone_id
  name             = "api.watchbloom.com"
  fallback_pool_id = cloudflare_load_balancer_pool.us_east_pool.id
  default_pool_ids = [
    cloudflare_load_balancer_pool.us_east_pool.id,
    cloudflare_load_balancer_pool.eu_central_pool.id,
    cloudflare_load_balancer_pool.ap_south_pool.id
  ]
  description      = "Watchbloom Global Geo-Steering Load Balancer"
  proxied          = true
  steering_policy  = "geo"

  # Steering routing by geographic region
  region_pools {
    region   = "WNAM"
    pool_ids = [cloudflare_load_balancer_pool.us_east_pool.id]
  }
  region_pools {
    region   = "ENAM"
    pool_ids = [cloudflare_load_balancer_pool.us_east_pool.id]
  }
  region_pools {
    region   = "WEU"
    pool_ids = [cloudflare_load_balancer_pool.eu_central_pool.id]
  }
  region_pools {
    region   = "EEU"
    pool_ids = [cloudflare_load_balancer_pool.eu_central_pool.id]
  }
  region_pools {
    region   = "SAS"
    pool_ids = [cloudflare_load_balancer_pool.ap_south_pool.id]
  }
  region_pools {
    region   = "SEAS"
    pool_ids = [cloudflare_load_balancer_pool.ap_south_pool.id]
  }

  # Session stickiness
  session_affinity     = "cookie"
  session_affinity_ttl = 1800
}

