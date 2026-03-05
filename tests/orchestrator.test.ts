import { describe, expect, it } from "vitest";
import { ReliableMultiAgentOrchestrator } from "../src/orchestrator.js";
import type { PersistedTaskRecord } from "../src/types.js";
import type { StateStore } from "../src/state/state-store.js";

class MemoryStateStore implements StateStore {
  private readonly data = new Map<string, PersistedTaskRecord>();

  async get(key: string): Promise<PersistedTaskRecord | undefined> {
    return this.data.get(key);
  }

  async upsert(record: PersistedTaskRecord): Promise<void> {
    this.data.set(record.idempotencyKey, record);
  }
}

describe("ReliableMultiAgentOrchestrator unit", () => {
  it("deve executar fluxo completo e consolidar resposta", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv({
      stateStore: new MemoryStateStore()
    });

    const result = await orchestrator.run({ id: "u-1", goal: "Pipeline de suporte B2B" });

    expect(result.cached).toBe(false);
    expect(result.coordinator).toBe("coordinator");
    expect(result.steps).toHaveLength(2);
    expect(result.finalAnswer).toContain("roadmap em fases");
  });

  it("deve retornar resultado em cache no segundo request idempotente", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv({
      stateStore: new MemoryStateStore()
    });

    await orchestrator.run({ id: "u-2", goal: "Automação de onboarding" });
    const cached = await orchestrator.run({ id: "u-2", goal: "Automação de onboarding" });

    expect(cached.cached).toBe(true);
    const metrics = orchestrator.getMetricsSnapshot();
    expect(metrics.counters.idempotency_hits_total).toBe(1);
  });
});
