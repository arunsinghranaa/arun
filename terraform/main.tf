terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  backend "s3" {
    bucket         = "watchbloom-terraform-state"
    key            = "production/infrastructure.tfstate"
    region         = "us-east-1"
    dynamodb_table = "watchbloom-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.primary_region
  default_tags {
    tags = {
      Project     = "Watchbloom"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── 1. CLOUDFLARE EDGE WAF, DDOS & ANYCAST ROUTING ──
resource "cloudflare_record" "api_anycast" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  content = "origin-primary.watchbloom.com"
  type    = "CNAME"
  proxied = true
}

resource "cloudflare_record" "stream_cdn" {
  zone_id = var.cloudflare_zone_id
  name    = "stream"
  content = "pub-origin.r2.cloudflarestorage.com"
  type    = "CNAME"
  proxied = true
}

# ── 2. MULTI-REGION AURORA POSTGRESQL (READ-WRITE SPLITTING) ──
resource "aws_rds_global_cluster" "watchbloom_global_db" {
  global_cluster_identifier = "watchbloom-global-cluster"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = "watchbloom"
  storage_encrypted         = true
}

resource "aws_rds_cluster" "primary_cluster" {
  cluster_identifier        = "watchbloom-primary-aurora"
  engine                    = aws_rds_global_cluster.watchbloom_global_db.engine
  engine_version            = aws_rds_global_cluster.watchbloom_global_db.engine_version
  global_cluster_identifier = aws_rds_global_cluster.watchbloom_global_db.id
  master_username           = "watchbloom_admin"
  manage_master_user_password = true
  backup_retention_period   = 30
  preferred_backup_window   = "03:00-04:00"
  skip_final_snapshot       = false
  final_snapshot_identifier = "watchbloom-primary-final-snapshot"
}

# ── 3. ELASTICACHE REDIS CLUSTER (PUBSUB & DISTRIBUTED LOCKS) ──
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id          = "watchbloom-redis-cluster"
  description                   = "High-throughput Redis cluster for pub/sub, SSE, and ratelimiting"
  node_type                     = "cache.r6g.xlarge"
  num_cache_clusters            = 3
  parameter_group_name          = "default.redis7"
  port                          = 6379
  automatic_failover_enabled    = true
  multi_az_enabled              = true
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
  auth_token_update_strategy    = "ROTATE"
}

# ── 4. CLOUDFLARE R2 / S3 DUAL-STORAGE VIDEO ORIGIN BUCKET ──
resource "aws_s3_bucket" "video_origin" {
  bucket = "watchbloom-production-video-origin"
}

resource "aws_s3_bucket_lifecycle_configuration" "video_lifecycle" {
  bucket = aws_s3_bucket.video_origin.id

  rule {
    id     = "expire-raw-uploads-after-transcode"
    status = "Enabled"

    filter {
      prefix = "raw_uploads/"
    }

    expiration {
      days = 7
    }
  }

  rule {
    id     = "archive-rarely-watched-vod-glacier"
    status = "Enabled"

    filter {
      prefix = "hls/"
    }

    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
  }
}

