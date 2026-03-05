# ai-agent-demo (Enterprise Edition)

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

## Instalação

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

## Executar demo

```bash
npm run demo
```

### Exemplo de execução

```bash
RETRY_ATTEMPTS=3 AGENT_TIMEOUT_MS=500 npm run demo
```

## Testes e build

```bash
npm test
npm run build
```

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
  index.ts          # entrypoint
tests/
  orchestrator.test.ts
  cli.smoke.test.ts
  failure-scenarios.test.ts
```

## Próximo passo para produção

- trocar fila in-memory por Redis/SQS
- exportar métricas para Prometheus/DataDog
- persistência em Postgres para auditoria completa
- adicionar circuit breaker por integração externa
