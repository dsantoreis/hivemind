import type { AgentResult, Task } from "./types.js";

function withLatency(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function workerResearch(task: Task): Promise<AgentResult> {
  await withLatency(25);
  return {
    agent: "worker-research",
    output: `Contexto para '${task.goal}': requisitos mínimos, restrições de prazo e trade-offs.`
  };
}

export async function workerBuild(task: Task): Promise<AgentResult> {
  await withLatency(20);
  return {
    agent: "worker-build",
    output: `Plano de implementação para '${task.goal}': estrutura TS, fluxo previsível e testes básicos.`
  };
}
