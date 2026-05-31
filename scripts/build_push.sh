#!/usr/bin/env bash
set -euo pipefail

# Build + push all Dativerso containers.
# Default: Cloud Build (no local Docker daemon required).
#
# Usage:
#   ./scripts/build_push.sh                      # auto-increments semver tag per service via Artifact Registry
#   ./scripts/build_push.sh [tag]                # explicit tag, Cloud Build (default)
#   ./scripts/build_push.sh [tag] --cloudbuild   # explicit Cloud Build
#   ./scripts/build_push.sh [tag] --docker       # local docker buildx
#   ./scripts/build_push.sh [tag] --only svc1,svc2
#   ./scripts/build_push.sh [tag] --update-tfvars
#
# Examples:
#   ./scripts/build_push.sh
#   ./scripts/build_push.sh 0.1.0
#   ./scripts/build_push.sh 0.1.0 --docker
#   ./scripts/build_push.sh --only identity-api --update-tfvars

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MODE="cloudbuild"
ONLY=""
TAG=""

for arg in "$@"; do
  case "${arg}" in
    --cloud)
      MODE="cloudbuild"
      ;;
    --cloudbuild)
      MODE="cloudbuild"
      ;;
    --docker|--local)
      MODE="docker"
      ;;
    --only|--only=*)
      # Handled by the delegated script (we forward all args).
      ;;
    *)
      # First positional non-flag is the tag.
      if [[ "${arg}" != --* ]] && [[ -z "${TAG}" ]]; then
        TAG="${arg}"
      fi
      ;;
  esac
done

if [[ "${MODE}" == "docker" ]]; then
  exec "${ROOT_DIR}/scripts/build_push_docker.sh" "$@"
fi

exec "${ROOT_DIR}/scripts/build_push_cloudbuild.sh" "$@"
