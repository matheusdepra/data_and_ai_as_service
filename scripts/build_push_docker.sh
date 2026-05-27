#!/usr/bin/env bash
set -euo pipefail

# Build + push all Dativerso containers using local Docker buildx.
#
# Usage:
#   ./scripts/build_push_docker.sh [tag] [--only svc1,svc2]
#
# Notes:
# - Cloud Run is Linux; build for linux/amd64 by default.
# - Requires: gcloud, docker, and docker buildx enabled.

TAG="dev"
ONLY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only)
      ONLY="${2:-}"
      shift 2
      ;;
    --only=*)
      ONLY="${1#*=}"
      shift 1
      ;;
    --*)
      echo "Unknown flag: $1" >&2
      exit 2
      ;;
    *)
      if [[ "${TAG}" == "dev" ]]; then
        TAG="$1"
      fi
      shift 1
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TFVARS="${ROOT_DIR}/infra/terraform/terraform.tfvars"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

tfvar_get() {
  # Very small parser for terraform.tfvars (key = "value").
  local key="$1"
  [[ -f "${TFVARS}" ]] || return 1
  local line
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "${TFVARS}" | head -n1 || true)"
  [[ -n "${line}" ]] || return 1
  echo "${line}" | sed -E 's/^[[:space:]]*[a-zA-Z0-9_]+[[:space:]]*=[[:space:]]*"([^"]*)".*$/\1/'
}

PROJECT_ID="${PROJECT_ID:-$(tfvar_get project_id || true)}"
REGION="${REGION:-$(tfvar_get region || true)}"
ENV="${ENV:-$(tfvar_get env || true)}"

if [[ -z "${PROJECT_ID}" || -z "${REGION}" || -z "${ENV}" ]]; then
  echo "PROJECT_ID/REGION/ENV not set and could not be read from ${TFVARS}" >&2
  echo "Set env vars or create infra/terraform/terraform.tfvars." >&2
  exit 1
fi

require_cmd gcloud
require_cmd docker

AR_HOST="${REGION}-docker.pkg.dev"
AR_REPO="dativerso-${ENV}"

echo "Using:"
echo "  PROJECT_ID=${PROJECT_ID}"
echo "  REGION=${REGION}"
echo "  ENV=${ENV}"
echo "  TAG=${TAG}"
echo "  Artifact Registry: ${AR_HOST}/${PROJECT_ID}/${AR_REPO}"

echo "Configuring docker auth for ${AR_HOST}..."
gcloud auth configure-docker "${AR_HOST}" --quiet

build_and_push() {
  local name="$1"
  local context_rel="$2"
  local image="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${name}:${TAG}"

  echo "Building + pushing: ${image}"
  docker buildx build \
    --platform linux/amd64 \
    --tag "${image}" \
    --push \
    "${ROOT_DIR}/${context_rel}"
}

ctx_for() {
  case "$1" in
    ingestion-api) echo "services/ingestion_api" ;;
    ingestion-router) echo "services/ingestion_router" ;;
    bronzeify) echo "jobs/bronzeify" ;;
    silverize) echo "jobs/silverize" ;;
    identity-api) echo "services/identity_api_node" ;;
    *) echo "" ;;
  esac
}

tfvars_key_for() {
  case "$1" in
    ingestion-api) echo "ingestion_api_image" ;;
    ingestion-router) echo "ingestion_router_image" ;;
    bronzeify) echo "bronzeify_image" ;;
    silverize) echo "silverize_image" ;;
    identity-api) echo "identity_api_image" ;;
    *) echo "" ;;
  esac
}

SERVICES=()
if [[ -z "${ONLY}" ]]; then
  SERVICES=("ingestion-api" "ingestion-router" "bronzeify" "silverize" "identity-api")
else
  IFS=',' read -r -a SERVICES <<<"${ONLY}"
fi

BUILT=()
for svc in "${SERVICES[@]}"; do
  svc="$(echo "${svc}" | xargs)"
  [[ -n "${svc}" ]] || continue
  ctx="$(ctx_for "$svc")"
  if [[ -z "${ctx}" ]]; then
    echo "Unknown service in --only: ${svc}" >&2
    echo "Valid: ingestion-api, ingestion-router, bronzeify, silverize, identity-api" >&2
    exit 2
  fi
  build_and_push "${svc}" "${ctx}"
  BUILT+=("${svc}")
done

cat <<EOF

Done. Paste the built images into infra/terraform/terraform.tfvars:

EOF

for svc in "${BUILT[@]}"; do
  key="$(tfvars_key_for "$svc")"
  echo "${key}     = \"${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${svc}:${TAG}\""
done

cat <<EOF

EOF
