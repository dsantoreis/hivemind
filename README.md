# AI Agent Demo — Enterprise Multi-Agent Workflow Platform

[![CI](./.github/workflows/ci.yml)](./.github/workflows/ci.yml)

Production-style FastAPI orchestration + Next.js real-time dashboard for multi-agent workflows.

## Highlights

- **Real-time dashboard (Next.js/React)**: `frontend-next/` polling workflow stream every 2s.
- **Auth**: API Key and JWT (`POST /auth/token`).
- **Rate limiting**: in-memory sliding window guard (`429`).
- **Structured logging JSON**: startup, workflow creation, shutdown events.
- **Observability**:
  - Prometheus metrics at `GET /metrics`
  - OpenTelemetry tracing (OTLP exporter, env-driven)
- **Graceful shutdown**: FastAPI lifespan hook with explicit shutdown logs.
- **CI pipeline**: lint + unit + integration + e2e + coverage gate `>80%`.
- **Containers/K8s**: Docker multi-stage + manifests (Deployment/Service/HPA).
- **Performance/Resilience testing**:
  - k6 load test (`1000 rps`, `5m`) in `load-tests/k6-workflows.js`
  - chaos simulation in `chaos/fault_injection_test.py`
  - soak script (`1h`) in `soak/soak_test.sh`

## Architecture

- Backend: FastAPI (`src/ai_agent_demo`)
- Dashboard: Next.js (`frontend-next`)
- Tests: pytest + vitest

## Quickstart

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e .[dev]
uvicorn ai_agent_demo.main:app --reload
```

### Dashboard

```bash
cd frontend-next
npm install
npm run dev
```

## API

- `POST /auth/token` (header: `x-api-key`)
- `GET /health`
- `GET /metrics`
- `POST /v1/research/workflows` (auth required)
- `GET /v1/research/workflows`
- `GET /v1/research/workflows/{workflow_id}`
- `GET /v1/research/stream`

## Benchmark Table (placeholder results)

| Scenario | Target | Result | Notes |
|---|---:|---:|---|
| k6 create workflow | 1000 rps / 5 min | _pending run_ | `load-tests/k6-workflows.js` |
| Chaos fault injection | 50% flaky search | pass/fail tolerant | `chaos/fault_injection_test.py` |
| Soak endurance | 1h | _pending run_ | `soak/soak_test.sh` |

## Screenshot placeholders

- `docs/screenshots/dashboard-overview.png`
- `docs/screenshots/workflow-table.png`
- `docs/screenshots/metrics-panel.png`

## Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/hpa.yaml
```
