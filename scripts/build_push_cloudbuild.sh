#!/usr/bin/env bash
set -euo pipefail

# Build + push all Dativerso containers using Google Cloud Build.
# No local Docker daemon required.
#
# Usage:
#   ./scripts/build_push_cloudbuild.sh [tag] [--only svc1,svc2]
#
# It reads project/region/env from infra/terraform/terraform.tfvars by default.
# You can override with env vars: PROJECT_ID, REGION, ENV

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
  exit 1
fi

require_cmd gcloud

AR_HOST="${REGION}-docker.pkg.dev"
AR_REPO="dativerso-${ENV}"

echo "Using:"
echo "  PROJECT_ID=${PROJECT_ID}"
echo "  REGION=${REGION}"
echo "  ENV=${ENV}"
echo "  TAG=${TAG}"
echo "  Artifact Registry: ${AR_HOST}/${PROJECT_ID}/${AR_REPO}"

build_and_push() {
  local name="$1"
  local context_rel="$2"
  local image="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/${name}:${TAG}"
  local src_dir="${ROOT_DIR}/${context_rel}"
  local stage_dir

  stage_dir="$(mktemp -d "${TMPDIR:-/tmp}/dativerso-cloudbuild-${name}.XXXXXX")"
  trap 'rm -rf "${stage_dir}"' RETURN

  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude '.git' \
      --exclude '__pycache__' \
      --exclude '.DS_Store' \
      --exclude '.pytest_cache' \
      "${src_dir}/" "${stage_dir}/"
  else
    cp -R "${src_dir}/." "${stage_dir}/"
    find "${stage_dir}" -name '__pycache__' -type d -prune -exec rm -rf {} +
    find "${stage_dir}" -name '.DS_Store' -type f -delete
  fi

  echo "Cloud Build submit: ${image}"
  gcloud builds submit "${stage_dir}" \
    --project "${PROJECT_ID}" \
    --tag "${image}"

  rm -rf "${stage_dir}"
  trap - RETURN
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
