#!/usr/bin/env bash
set -euo pipefail

# Source an env file exporting its vars to the current shell:
#   source scripts/load_env.sh env/.env.dev

ENV_FILE="${1:-env/.env.dev}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  return 1 2>/dev/null || exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

echo "Loaded env vars from ${ENV_FILE}"

