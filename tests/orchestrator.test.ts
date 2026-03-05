import { describe, expect, it } from "vitest";
import { MultiAgentOrchestrator } from "../src/orchestrator.js";

describe("MultiAgentOrchestrator", () => {
  it("coordena 2 workers e retorna resposta consolidada", async () => {
    const orchestrator = new MultiAgentOrchestrator();

    const result = await orchestrator.run({
      id: "t-1",
      goal: "Montar pipeline de suporte"
    });

    expect(result.taskId).toBe("t-1");
    expect(result.coordinator).toBe("coordinator");
    expect(result.steps).toHaveLength(2);
    expect(result.steps.map((s) => s.agent).sort()).toEqual([
      "worker-build",
      "worker-research"
    ]);
    expect(result.finalAnswer).toContain("coordinator: objetivo recebido");
  });
});
