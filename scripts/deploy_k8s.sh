#!/usr/bin/env bash
# ==============================================================================
# Watchbloom Cloud-Native Kubernetes Deployment & Verification Script
# Applies manifests via Kustomize, configures HPA & KEDA autoscaling,
# and verifies zero-downtime rolling updates.
# ==============================================================================

set -euo pipefail

NAMESPACE="watchbloom"
K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../k8s" && pwd)"

echo "=== 1. Verifying Cluster Connectivity ==="
kubectl cluster-info

echo "=== 2. Creating / Verifying Namespace: ${NAMESPACE} ==="
kubectl apply -f "${K8S_DIR}/namespace.yaml"

echo "=== 3. Validating Kustomize Manifests ==="
kubectl kustomize "${K8S_DIR}" > /dev/null
echo "Kustomize manifest syntax: OK"

echo "=== 4. Applying ConfigMaps & Secrets ==="
kubectl apply -f "${K8S_DIR}/configmap.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/secret.yaml" -n "${NAMESPACE}"

echo "=== 5. Deploying Redis & PgBouncer Stateful Tier ==="
kubectl apply -f "${K8S_DIR}/redis.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/pgbouncer.yaml" -n "${NAMESPACE}"

echo "=== 6. Deploying API & Celery Worker Scalable Pools ==="
kubectl apply -f "${K8S_DIR}/api-deployment.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/api-service.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/celery-worker-deployment.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/celery-beat-deployment.yaml" -n "${NAMESPACE}"

echo "=== 7. Applying Horizontal Pod Autoscaler (HPA) & KEDA Worker Scaling ==="
kubectl apply -f "${K8S_DIR}/hpa-api.yaml" -n "${NAMESPACE}"
if kubectl get crd scaledobjects.keda.sh > /dev/null 2>&1; then
    kubectl apply -f "${K8S_DIR}/keda-scaledobject-worker.yaml" -n "${NAMESPACE}"
    echo "KEDA ScaledObject successfully attached."
else
    echo "Notice: KEDA CRD not installed on cluster. Skipping ScaledObject (Standard HPA remains active)."
fi

echo "=== 8. Applying Ingress & ServiceMonitor ==="
kubectl apply -f "${K8S_DIR}/ingress.yaml" -n "${NAMESPACE}"
if kubectl get crd servicemonitors.monitoring.coreos.com > /dev/null 2>&1; then
    kubectl apply -f "${K8S_DIR}/servicemonitor.yaml" -n "${NAMESPACE}"
fi

echo "=== 9. Awaiting Zero-Downtime Rolling Update Rollout ==="
kubectl rollout status deployment/watchbloom-api -n "${NAMESPACE}" --timeout=120s

echo "=== Watchbloom Cloud-Native Kubernetes Deployment Complete! ==="
kubectl get pods,svc,hpa -n "${NAMESPACE}"

