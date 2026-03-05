#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Exemplo de execução com parâmetros enterprise
export RETRY_ATTEMPTS="${RETRY_ATTEMPTS:-3}"
export RETRY_DELAY_MS="${RETRY_DELAY_MS:-50}"
export AGENT_TIMEOUT_MS="${AGENT_TIMEOUT_MS:-700}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

./scripts/run-demo.sh
