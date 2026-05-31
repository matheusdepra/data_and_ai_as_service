#!/usr/bin/env bash
set -euo pipefail

# Build + push all Dativerso containers using Google Cloud Build.
# No local Docker daemon required.
#
# Usage:
#   ./scripts/build_push_cloudbuild.sh [tag] [--only svc1,svc2] [--update-tfvars]
#
# It reads project/region/env from infra/terraform/terraform.tfvars by default.
# You can override with env vars: PROJECT_ID, REGION, ENV

TAG=""
ONLY=""
UPDATE_TFVARS="false"

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
    --update-tfvars)
      UPDATE_TFVARS="true"
      shift 1
      ;;
    --*)
      echo "Unknown flag: $1" >&2
      exit 2
      ;;
    *)
      if [[ -z "${TAG}" ]]; then
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
AR_PATH="${AR_HOST}/${PROJECT_ID}/${AR_REPO}"

resolve_next_semver_tag() {
  local image_path="$1"
  local latest
  latest="$(
    gcloud artifacts docker tags list "${image_path}" \
      --project "${PROJECT_ID}" \
      --sort-by="~TAG" \
      --format="value(TAG)" 2>/dev/null \
      | grep -E '^[0-9]+(\.[0-9]+)*$' \
      | sort -V \
      | tail -n1
  )"

  if [[ -z "${latest}" ]]; then
    echo "0.1.0"
    return
  fi

  awk -F. '
    {
      $NF = $NF + 1
      printf "%s", $1
      for (i = 2; i <= NF; i++) {
        printf ".%s", $i
      }
      printf "\n"
    }
  ' <<<"${latest}"
}

echo "Using:"
echo "  PROJECT_ID=${PROJECT_ID}"
echo "  REGION=${REGION}"
echo "  ENV=${ENV}"
echo "  Artifact Registry: ${AR_PATH}"
if [[ -n "${TAG}" ]]; then
  echo "  TAG=${TAG}"
else
  echo "  TAG=auto (per service)"
fi

build_and_push() {
  local name="$1"
  local context_rel="$2"
  local tag="$3"
  local image="${AR_PATH}/${name}:${tag}"
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
    overviewify) echo "jobs/overviewify" ;;
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
    overviewify) echo "overviewify_image" ;;
    identity-api) echo "identity_api_image" ;;
    *) echo "" ;;
  esac
}

update_tfvars_image() {
  local key="$1"
  local image="$2"

  [[ -f "${TFVARS}" ]] || {
    echo "terraform.tfvars not found at ${TFVARS}" >&2
    exit 1
  }

  local tmp_file
  tmp_file="$(mktemp "${TMPDIR:-/tmp}/dativerso-tfvars.XXXXXX")"

  awk -v key="${key}" -v image="${image}" '
    BEGIN { updated = 0 }
    $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
      print key " = \"" image "\""
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) exit 1
    }
  ' "${TFVARS}" > "${tmp_file}" || {
    rm -f "${tmp_file}"
    echo "Could not update key ${key} in ${TFVARS}" >&2
    exit 1
  }

  mv "${tmp_file}" "${TFVARS}"
}

SERVICES=()
if [[ -z "${ONLY}" ]]; then
  SERVICES=("ingestion-api" "ingestion-router" "bronzeify" "silverize" "overviewify" "identity-api")
else
  IFS=',' read -r -a SERVICES <<<"${ONLY}"
fi

BUILT=()
BUILT_TAGS=()
for svc in "${SERVICES[@]}"; do
  svc="$(echo "${svc}" | xargs)"
  [[ -n "${svc}" ]] || continue
  ctx="$(ctx_for "$svc")"
  if [[ -z "${ctx}" ]]; then
    echo "Unknown service in --only: ${svc}" >&2
    echo "Valid: ingestion-api, ingestion-router, bronzeify, silverize, overviewify, identity-api" >&2
    exit 2
  fi
  svc_tag="${TAG:-$(resolve_next_semver_tag "${AR_PATH}/${svc}")}"
  build_and_push "${svc}" "${ctx}" "${svc_tag}"
  BUILT+=("${svc}")
  BUILT_TAGS+=("${svc_tag}")
done

cat <<EOF

Done.

EOF

for idx in "${!BUILT[@]}"; do
  svc="${BUILT[$idx]}"
  svc_tag="${BUILT_TAGS[$idx]}"
  key="$(tfvars_key_for "$svc")"
  image="${AR_PATH}/${svc}:${svc_tag}"
  if [[ "${UPDATE_TFVARS}" == "true" ]]; then
    update_tfvars_image "${key}" "${image}"
  fi
  echo "${key} = \"${image}\""
done

cat <<EOF

EOF

if [[ "${UPDATE_TFVARS}" == "true" ]]; then
  cat <<EOF
Updated ${TFVARS} automatically.

EOF
else
  cat <<EOF
Paste the lines above into infra/terraform/terraform.tfvars, or rerun with --update-tfvars.

EOF
fi
