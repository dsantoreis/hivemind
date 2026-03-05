import type { AgentName, OrchestratedTask } from "../types.js";

export interface Agent {
  name: AgentName;
  run(task: OrchestratedTask): Promise<string>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ResearchAgent implements Agent {
  name: AgentName = "worker-research";

  async run(task: OrchestratedTask): Promise<string> {
    await sleep(25);
    if (task.goal.includes("FORCE_RESEARCH_FAIL")) {
      throw new Error("Research upstream unavailable");
    }

    return `Contexto para '${task.goal}': requisitos funcionais, risco técnico, compliance e cronograma.`;
  }
}

export class BuildAgent implements Agent {
  name: AgentName = "worker-build";

  async run(task: OrchestratedTask): Promise<string> {
    await sleep(20);
    if (task.goal.includes("FORCE_BUILD_TIMEOUT")) {
      await sleep(5_000);
    }

    return `Plano para '${task.goal}': arquitetura modular, testes e rollout incremental com rollback.`;
  }
}
