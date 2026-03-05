import { describe, expect, it } from "vitest";
import { MultiAgentOrchestrator } from "../src/orchestrator.js";

describe("MultiAgentOrchestrator", () => {
  it("executa pipeline completo na ordem esperada", async () => {
    const orchestrator = new MultiAgentOrchestrator();

    const result = await orchestrator.run({
      id: "t-1",
      goal: "Gerar plano para atendimento"
    });

    expect(result.taskId).toBe("t-1");
    expect(result.steps.map((s) => s.agent)).toEqual([
      "planner",
      "researcher",
      "coder",
      "reviewer"
    ]);
    expect(result.finalAnswer).toContain("Objetivo: Gerar plano para atendimento");
  });
});
