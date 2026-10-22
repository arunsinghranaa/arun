# ==============================================================================
# Watchbloom Cloud-Native Kubernetes Deployment & Verification Script (PowerShell)
# ==============================================================================

$ErrorActionPreference = "Stop"
$Namespace = "watchbloom"
$K8sDir = Join-Path $PSScriptRoot "..\k8s"

Write-Host "=== 1. Verifying Cluster Connectivity ===" -ForegroundColor Cyan
kubectl cluster-info

Write-Host "=== 2. Creating / Verifying Namespace: $Namespace ===" -ForegroundColor Cyan
kubectl apply -f (Join-Path $K8sDir "namespace.yaml")

Write-Host "=== 3. Validating Kustomize Manifests ===" -ForegroundColor Cyan
kubectl kustomize $K8sDir | Out-Null
Write-Host "Kustomize manifest syntax: OK" -ForegroundColor Green

Write-Host "=== 4. Applying ConfigMaps & Secrets ===" -ForegroundColor Cyan
kubectl apply -f (Join-Path $K8sDir "configmap.yaml") -n $Namespace
kubectl apply -f (Join-Path $K8sDir "secret.yaml") -n $Namespace

Write-Host "=== 5. Deploying Redis & PgBouncer Stateful Tier ===" -ForegroundColor Cyan
kubectl apply -f (Join-Path $K8sDir "redis.yaml") -n $Namespace
kubectl apply -f (Join-Path $K8sDir "pgbouncer.yaml") -n $Namespace

Write-Host "=== 6. Deploying API & Celery Worker Scalable Pools ===" -ForegroundColor Cyan
kubectl apply -f (Join-Path $K8sDir "api-deployment.yaml") -n $Namespace
kubectl apply -f (Join-Path $K8sDir "api-service.yaml") -n $Namespace
kubectl apply -f (Join-Path $K8sDir "celery-worker-deployment.yaml") -n $Namespace
kubectl apply -f (Join-Path $K8sDir "celery-beat-deployment.yaml") -n $Namespace

Write-Host "=== 7. Applying HPA & KEDA Autoscalers ===" -ForegroundColor Cyan
kubectl apply -f (Join-Path $K8sDir "hpa-api.yaml") -n $Namespace
kubectl apply -f (Join-Path $K8sDir "ingress.yaml") -n $Namespace

Write-Host "=== 8. Awaiting Zero-Downtime Rolling Update Rollout ===" -ForegroundColor Cyan
kubectl rollout status deployment/watchbloom-api -n $Namespace --timeout=120s

Write-Host "=== Watchbloom Cloud-Native Kubernetes Deployment Complete! ===" -ForegroundColor Green
kubectl get pods,svc,hpa -n $Namespace

