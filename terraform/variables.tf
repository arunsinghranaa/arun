variable "environment" {
  type        = string
  default     = "production"
  description = "Target environment (staging/production)"
}

variable "primary_region" {
  type        = string
  default     = "us-east-1"
  description = "Primary Cloud Region"
}

variable "secondary_regions" {
  type        = list(string)
  default     = ["eu-central-1", "ap-southeast-1"]
  description = "Secondary Edge Regions for Read Replicas and Latency Optimization"
}

variable "domain_name" {
  type        = string
  default     = "watchbloom.com"
  description = "Base domain name for Anycast DNS routing"
}

variable "cloudflare_zone_id" {
  type        = string
  default     = "zone_abc123456789"
  description = "Cloudflare Zone ID for Edge WAF and CDN routing"
}

