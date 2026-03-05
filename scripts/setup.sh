#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "[setup] ERRO: Node.js não encontrado. Instale Node.js 20+" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[setup] ERRO: npm não encontrado." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "[setup] ERRO: Node.js 20+ obrigatório. Versão atual: $(node -v)" >&2
  exit 1
fi

echo "[setup] Node: $(node -v)"
echo "[setup] npm:  $(npm -v)"

echo "[setup] Instalando dependências..."
npm ci

echo "[setup] Validando projeto (lint + unit + smoke)..."
npm run verify:quick

echo "[setup] OK. Execute: ./scripts/run-demo.sh"
