#!/usr/bin/env bash
set -euo pipefail

# Deprecated wrapper. Use:
#   ./scripts/build_push_docker.sh [tag]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "DEPRECATED: use ./scripts/build_push_docker.sh instead" >&2
exec "${ROOT_DIR}/scripts/build_push_docker.sh" "${1:-dev}"
