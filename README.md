# ai-agent-demo

Demo funcional em TypeScript de **orquestração multi-agente** com:

- 1 **coordenador** (`MultiAgentOrchestrator`)
- 2 **workers** (`worker-research` e `worker-build`)

> Repositório local privado (`"private": true` no `package.json`).

## Como funciona

1. Coordenador recebe o objetivo (`Task`)
2. Coordenador dispara os 2 workers em paralelo (`Promise.all`)
3. Coordenador consolida os outputs e retorna resposta final

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
npm install
```

## Executar localmente

```bash
npm run demo
# ou
./scripts/run-demo.sh
```

## Testes básicos

```bash
npm test
```

## Estrutura

```text
src/
  agents.ts        # 2 workers simulados
  orchestrator.ts  # coordenador
  index.ts         # entrada executável
tests/
  orchestrator.test.ts
scripts/
  run-demo.sh
```
