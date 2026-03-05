#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:8000}"
API_KEY="${API_KEY:-dev-api-key}"
END=$((SECONDS+3600))
while [ $SECONDS -lt $END ]; do
  curl -sS -X POST "$BASE_URL/v1/research/workflows" \
    -H 'Content-Type: application/json' \
    -H "x-api-key: $API_KEY" \
    -d '{"query":"soak test reliability", "max_results":1, "max_sources_to_read":1}' >/dev/null || true
  sleep 1
done
echo "soak test complete"
