import { describe, expect, it } from "vitest";
import { ReliableMultiAgentOrchestrator } from "../src/orchestrator.js";

describe("Failure scenarios", () => {
  it("falha quando worker research estoura retries", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv({
      config: {
        retryAttempts: 2,
        retryDelayMs: 5,
        agentTimeoutMs: 100,
        queueConcurrency: 2,
        stateFile: ".data/test-failure-state.json",
        logLevel: "error"
      }
    });

    await expect(
      orchestrator.run({ id: "f-1", goal: "FORCE_RESEARCH_FAIL validar resiliência" })
    ).rejects.toThrow("Research upstream unavailable");
  });

  it("falha por timeout no worker build", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv({
      config: {
        retryAttempts: 1,
        retryDelayMs: 5,
        agentTimeoutMs: 50,
        queueConcurrency: 2,
        stateFile: ".data/test-timeout-state.json",
        logLevel: "error"
      }
    });

    await expect(
      orchestrator.run({ id: "f-2", goal: "FORCE_BUILD_TIMEOUT garantir timeout" })
    ).rejects.toThrow("worker-build timed out");
  });
});
