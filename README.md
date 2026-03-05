# ai-agent-demo

Demo funcional de **orquestração multi-agente** em TypeScript.

> Repositório local inicializado como privado (`"private": true` no `package.json`).

## O que o demo faz

Pipeline de 4 agentes simulados:

1. `planner` cria o plano
2. `researcher` enriquece o contexto
3. `coder` propõe implementação
4. `reviewer` revisa e consolida

A classe `MultiAgentOrchestrator` coordena a execução sequencial e retorna resposta final consolidada.

## Requisitos

- Node.js 20+
- npm 10+

## Instalação

```bash
npm install
```

## Executar demo

```bash
npm run demo
# ou
./scripts/run-demo.sh
```

## Rodar testes

```bash
npm test
```

## Estrutura

```text
src/
  agents.ts        # agentes simulados
  orchestrator.ts  # orquestrador principal
  index.ts         # ponto de entrada executável
tests/
  orchestrator.test.ts
scripts/
  run-demo.sh
```

## Próximos passos sugeridos

- Paralelizar agentes independentes
- Adicionar retries/timeouts por agente
- Persistir traces de execução para observabilidade
