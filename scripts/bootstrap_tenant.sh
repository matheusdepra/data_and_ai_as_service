#!/usr/bin/env bash
set -euo pipefail

# Bootstraps a Dativerso SaaS tenant in Firestore (tenants + optional first admin invite).
#
# This is NOT related to GCP IAM. It only creates SaaS metadata for identity-api:
# - tenants/{tenant_id}
# - invites/{invite_id} + invite_index_by_email/{email} (optional)
#
# Requirements:
# - gcloud (Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS)
# - curl
# - jq
#
# Usage:
#   ./scripts/bootstrap_tenant.sh --tenant_id OLIST --display_name "OLIST" --admin_email mpandrade@ucs.br
#
# Optional:
#   --project_id daas-mvp-472103
#   --ttl_days 7
#
# Notes:
# - This calls the Firestore REST API using an access token from gcloud.
# - Firestore must already have a default database created in the project.

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

require_cmd gcloud
require_cmd curl
require_cmd jq
require_cmd uuidgen

PROJECT_ID="${PROJECT_ID:-$(tfvar_get project_id || true)}"
TENANT_ID=""
DISPLAY_NAME=""
ADMIN_EMAIL=""
TTL_DAYS="${TTL_DAYS:-7}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project_id)
      PROJECT_ID="$2"
      shift 2
      ;;
    --tenant_id)
      TENANT_ID="$2"
      shift 2
      ;;
    --display_name)
      DISPLAY_NAME="$2"
      shift 2
      ;;
    --admin_email)
      ADMIN_EMAIL="$2"
      shift 2
      ;;
    --ttl_days)
      TTL_DAYS="$2"
      shift 2
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${PROJECT_ID}" ]]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
fi

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Missing --project_id (or set PROJECT_ID / terraform.tfvars / gcloud config project)" >&2
  exit 2
fi

if [[ -z "${TENANT_ID}" ]]; then
  echo "Missing --tenant_id" >&2
  exit 2
fi
if [[ -z "${DISPLAY_NAME}" ]]; then
  DISPLAY_NAME="${TENANT_ID}"
fi

ACCESS_TOKEN="$(gcloud auth application-default print-access-token)"
BASE="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents"

now_rfc3339="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
now_epoch="$(date -u +"%s")"
expires_epoch="$((now_epoch + TTL_DAYS * 24 * 60 * 60))"
expires_rfc3339="$(date -u -r "${expires_epoch}" +"%Y-%m-%dT%H:%M:%SZ")"

tenant_payload="$(jq -n \
  --arg tenant_id "${TENANT_ID}" \
  --arg display_name "${DISPLAY_NAME}" \
  --arg created_at "${now_rfc3339}" \
  '{
    fields: {
      tenant_id: { stringValue: $tenant_id },
      display_name: { stringValue: $display_name },
      created_at: { timestampValue: $created_at }
    }
  }')"

echo "Creating/updating tenant: tenants/${TENANT_ID}"
curl -sfS -X PATCH \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "${tenant_payload}" \
  "${BASE}/tenants/${TENANT_ID}?updateMask.fieldPaths=tenant_id&updateMask.fieldPaths=display_name&updateMask.fieldPaths=created_at" \
  >/dev/null

if [[ -z "${ADMIN_EMAIL}" ]]; then
  echo "Done (tenant created). No admin invite requested."
  exit 0
fi

admin_email_norm="$(echo "${ADMIN_EMAIL}" | tr '[:upper:]' '[:lower:]' | xargs)"
invite_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"

invite_payload="$(jq -n \
  --arg invite_id "${invite_id}" \
  --arg tenant_id "${TENANT_ID}" \
  --arg email "${admin_email_norm}" \
  --arg role "admin" \
  --arg status "pending" \
  --arg created_by "bootstrap" \
  --arg created_at "${now_rfc3339}" \
  --arg expires_at "${expires_rfc3339}" \
  '{
    fields: {
      invite_id: { stringValue: $invite_id },
      tenant_id: { stringValue: $tenant_id },
      email: { stringValue: $email },
      role: { stringValue: $role },
      status: { stringValue: $status },
      created_by: { stringValue: $created_by },
      created_at: { timestampValue: $created_at },
      expires_at: { timestampValue: $expires_at }
    }
  }')"

echo "Creating invite: invites/${invite_id} (admin_email=${admin_email_norm})"
curl -sfS -X PATCH \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "${invite_payload}" \
  "${BASE}/invites/${invite_id}?updateMask.fieldPaths=invite_id&updateMask.fieldPaths=tenant_id&updateMask.fieldPaths=email&updateMask.fieldPaths=role&updateMask.fieldPaths=status&updateMask.fieldPaths=created_by&updateMask.fieldPaths=created_at&updateMask.fieldPaths=expires_at" \
  >/dev/null

idx_payload="$(jq -n \
  --arg invite_id "${invite_id}" \
  --arg tenant_id "${TENANT_ID}" \
  --arg role "admin" \
  --arg expires_at "${expires_rfc3339}" \
  '{
    fields: {
      invite_id: { stringValue: $invite_id },
      tenant_id: { stringValue: $tenant_id },
      role: { stringValue: $role },
      expires_at: { timestampValue: $expires_at }
    }
  }')"

echo "Creating invite index: invite_index_by_email/${admin_email_norm}"
curl -sfS -X PATCH \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "${idx_payload}" \
  "${BASE}/invite_index_by_email/${admin_email_norm}?updateMask.fieldPaths=invite_id&updateMask.fieldPaths=tenant_id&updateMask.fieldPaths=role&updateMask.fieldPaths=expires_at" \
  >/dev/null

echo
echo "Done."
echo "tenant_id=${TENANT_ID}"
echo "admin_email=${admin_email_norm}"
echo "invite_id=${invite_id}"

