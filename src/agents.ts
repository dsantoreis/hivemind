import type { AgentResult, Task } from "./types.js";

function withLatency(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function planner(task: Task): Promise<AgentResult> {
  await withLatency(40);
  return {
    agent: "planner",
    output: `Plano para '${task.goal}': pesquisar contexto, implementar solução mínima, revisar riscos.`
  };
}

export async function researcher(task: Task, plan: string): Promise<AgentResult> {
  await withLatency(30);
  return {
    agent: "researcher",
    output: `Pesquisa rápida para '${task.goal}': requisitos inferidos + restrições técnicas. Baseado em: ${plan}`
  };
}

export async function coder(task: Task, context: string): Promise<AgentResult> {
  await withLatency(25);
  return {
    agent: "coder",
    output: `Implementação proposta para '${task.goal}': módulo TypeScript com fluxo determinístico. Contexto: ${context}`
  };
}

export async function reviewer(task: Task, implementation: string): Promise<AgentResult> {
  await withLatency(20);
  return {
    agent: "reviewer",
    output: `Revisão para '${task.goal}': sem bloqueios críticos. Melhorias futuras: métricas e retries. Revisado: ${implementation}`
  };
}
