# ai-agent-demo (Enterprise Edition)

> Primary stack now: **Python + FastAPI** (`python_app/`).
> TypeScript implementation is kept as legacy reference.

## Quickstart (Python/FastAPI)
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
pytest -q tests/test_fastapi_demo.py
uvicorn python_app.main:app --reload
```


Demo comercial de **automação multi-agente confiável** focada em dores reais de clientes Upwork:

- falhas intermitentes de integrações
- jobs duplicados e retrabalho
- falta de visibilidade operacional
- pipelines sem timeout/retry
- ausência de estado persistente para auditoria

## O que este projeto entrega

- **Arquitetura modular** (agents, core, queue, state, observability)
- **Fila** in-memory para coordenação de execução
- **Retries + timeout por agente**
- **Idempotência** via chave SHA-256 (taskId + goal)
- **Configuração por variáveis de ambiente**
- **Logs estruturados (JSON)**
- **Métricas básicas** (counters + duração média/máxima)
- **Persistência simples** em JSON local
- **Endpoints HTTP de observabilidade** (`/health`, `/alivez`, `/healthz-lite`, `/echoz`, `/pingz`, `/stats`, `/timez`, `/uptimez`, `/readyz`, `/readyz-lite`, `/statusz`, `/versionz`, `/meta-lite`, `/metrics`, `/diag`, `/build-info`, `/build-lite` e `/openapi-lite`)
- **Testes unitários, integração e cenários de falha**

## Casos de uso comerciais (Upwork-ready)

1. **Triagem de tickets enterprise**
   - Agente de pesquisa classifica prioridade e risco
   - Agente de execução monta plano com rollout/rollback
2. **Automação de onboarding de clientes B2B**
   - Checagem de compliance + plano técnico em paralelo
3. **Operação de suporte com SLA rígido**
   - Timeout e retries evitam travamento silencioso

## Requisitos

- Node.js 20+
- npm 10+

## Setup rápido (enterprise-friendly)

```bash
./scripts/setup.sh
```

Esse script valida versão do Node, instala deps com `npm ci` e roda `verify:quick`.

## Instalação manual

```bash
npm install
```

## Variáveis de ambiente

| Variável | Default | Função |
|---|---:|---|
| `RETRY_ATTEMPTS` | `2` | Total de tentativas por agente |
| `RETRY_DELAY_MS` | `30` | Delay entre tentativas |
| `AGENT_TIMEOUT_MS` | `1000` | Timeout por execução de agente |
| `QUEUE_CONCURRENCY` | `2` | Reservado para expansão de workers concorrentes |
| `STATE_FILE` | `.data/orchestrator-state.json` | Persistência do estado |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `RUN_BODY_MAX_BYTES` | `1000000` | Limite máximo do payload JSON no `POST /run` (retorna `413 payload_too_large` quando excede) |

## Executar demo

```bash
npm run demo
```

## Subir servidor HTTP (Step5)

```bash
npm run serve
# opcional: PORT=4000 npm run serve
```

Endpoints:
- `GET /health` → status do processo
- `GET /healthz` → alias Kubernetes-friendly para `/health`
- `HEAD /health` → liveness probe sem payload (health-check rápido)
- `GET /alivez` → status simples de vida (`status: alive`)
- `GET /healthz-lite` → health mínimo (`status` + `uptimeSec`)
- `HEAD /healthz-lite` → liveness probe sem payload (rápido para balanceadores)
- `GET /echoz` → echo mínimo (`status` + `service`)
- `GET /pingz` → latência local do request (`localLatencyMs`) + `timestamp`
- `GET /stats` → counters agregados de requests por endpoint + uptime (`?reset=1` reseta contadores após responder; `?top=N` retorna ranking dos N endpoints mais acessados; `?minCount=N` mantém apenas endpoints com contagem mínima N)
- `GET /timez` → horário UTC do servidor (`serverTimeUtc`) + uptime
- `GET /uptimez` → uptime compacto + timestamp de boot (`startedAtUtc`)
- `GET /readyz` → prontidão do orchestrator + validação interna de dependências
- `GET /readyz-lite` → prontidão compacta (`ready` + `uptimeSec`)
- `HEAD /readyz-lite` → readiness probe sem payload (rápido para balanceador)
- `GET /statusz` → resumo compacto (`ready`, `uptimeSec`, `version`); com `?verbose=true` inclui `status`, `timestamp`, `dependencyCount` e `unhealthyDependencies` (se `verbose` inválido retorna `400 invalid_query_param`)
- `GET /versionz` → versão runtime (`version`, `commit`, `nodeVersion`)
- `GET /meta-lite` → metadados mínimos (`name`, `version`, `uptimeSec`)
- `GET /metrics` → snapshot das métricas atuais
- `GET /diag` → diagnóstico do orchestrator (config/runtime/métricas sem segredos)
- `GET /build-info` → metadados de build (`version`, `commit`, `buildTime`, `nodeVersion`)
- `GET /build-lite` → build mínimo (`version`, `commit`)
- `GET /routes-hash` → hash SHA-256 estável da lista de métodos+rotas expostos
- `GET /openapi-lite` → catálogo resumido de endpoints e métodos HTTP
- `POST /run` → executa workflow mínimo com payload JSON e retorna `traceId` (retorna `415` se `Content-Type` não for JSON; `400 invalid_payload` inclui `validationErrors`)

Validação rápida:

```bash
curl -s http://localhost:3000/health
curl -s http://localhost:3000/healthz
curl -s http://localhost:3000/alivez
curl -s http://localhost:3000/healthz-lite
curl -s http://localhost:3000/echoz
curl -s http://localhost:3000/pingz
curl -s http://localhost:3000/stats
curl -s http://localhost:3000/timez
curl -s http://localhost:3000/uptimez
curl -s http://localhost:3000/readyz
curl -s http://localhost:3000/readyz-lite
curl -s http://localhost:3000/statusz
curl -s http://localhost:3000/versionz
curl -s http://localhost:3000/meta-lite
curl -s http://localhost:3000/metrics
curl -s http://localhost:3000/diag
curl -s http://localhost:3000/build-info
curl -s http://localhost:3000/build-lite
curl -s http://localhost:3000/routes-hash
curl -s http://localhost:3000/openapi-lite
```

Exemplo `POST /run`:

```bash
curl -s -X POST http://localhost:3000/run \
  -H 'content-type: application/json' \
  -d '{
    "id": "curl-run-001",
    "goal": "Executar workflow mínimo via API",
    "context": { "source": "readme-curl" }
  }'
```

### Exemplo de execução (com script pronto)

```bash
./examples/run-enterprise-demo.sh
```

### Exemplo de execução manual

```bash
RETRY_ATTEMPTS=3 AGENT_TIMEOUT_MS=500 npm run demo
```

## Comandos

| Comando | O que faz |
|---|---|
| `./scripts/setup.sh` | Bootstrap local (checks + deps + verify) |
| `npm run demo` | Executa a demo principal |
| `npm run serve` | Sobe servidor HTTP com `/health`, `/alivez`, `/healthz-lite`, `/echoz`, `/pingz`, `/stats`, `/timez`, `/uptimez`, `/readyz`, `/readyz-lite`, `/statusz`, `/versionz`, `/meta-lite`, `/metrics`, `/diag`, `/build-info`, `/build-lite`, `/routes-hash` e `/openapi-lite` |
| `./examples/run-enterprise-demo.sh` | Exemplo executável com env enterprise |
| `npm run lint` | Validação TypeScript sem gerar artefatos |
| `npm run test` | Roda toda a suíte de testes |
| `npm run test:unit` | Roda testes unitários da orquestração |
| `npm run test:smoke` | Roda smoke test da CLI |
| `npm run test:basic` | Valida o script de exemplo executável |
| `npm run test:http` | Valida endpoints HTTP, incluindo `/echoz`, `/stats`, `/timez` e `/uptimez` (service/counters/hora UTC + boot timestamp) |
| `npm run verify:quick` | Verificação rápida: lint + unit + smoke + basic + http |
| `npm run verify:full` | Gate final pré-publicação: lint + unit + smoke + http + build |
| `npm run build` | Compila o projeto para `dist/` |

## Testes e build

```bash
npm run verify:quick
npm run verify:full
```

`verify:full` é o **gate final pré-publicação** deste repositório.

Suite inclui:
- **unit**: orquestração + idempotência
- **integration/smoke**: execução real via CLI
- **failure**: retry exhaustion + timeout

## Estrutura

```text
src/
  agents/           # workers de domínio
  core/             # retry + timeout
  observability/    # logger JSON + métricas
  queue/            # fila
  state/            # persistência
  utils/            # idempotência
  orchestrator.ts   # coordenador confiável
  config.ts         # env config
  index.ts          # entrypoint demo
  server.ts         # HTTP endpoints /health, /alivez, /healthz-lite, /echoz, /pingz, /stats, /timez, /uptimez, /readyz, /readyz-lite, /statusz, /versionz, /meta-lite, /metrics, /diag, /build-info, /build-lite e /openapi-lite
tests/
  orchestrator.test.ts
  cli.smoke.test.ts
  http-endpoints.test.ts
  http-stats.test.ts
  failure-scenarios.test.ts
```

## Próximo passo para produção

- trocar fila in-memory por Redis/SQS
- exportar métricas para Prometheus/DataDog
- persistência em Postgres para auditoria completa
- adicionar circuit breaker por integração externa
