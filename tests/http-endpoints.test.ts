import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { ReliableMultiAgentOrchestrator } from "../src/orchestrator.js";
import { createAppServer } from "../src/server.js";

const runningServers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  while (runningServers.length) {
    const current = runningServers.pop();
    if (current) await current.close();
  }
});

describe("HTTP endpoints", () => {
  it("expõe /health e /metrics", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthRes = await fetch(`${baseUrl}/health`);
    expect(healthRes.status).toBe(200);
    const healthBody = (await healthRes.json()) as { status: string; uptimeSec: number };
    expect(healthBody.status).toBe("ok");
    expect(typeof healthBody.uptimeSec).toBe("number");

    const metricsRes = await fetch(`${baseUrl}/metrics`);
    expect(metricsRes.status).toBe(200);
    const metricsBody = (await metricsRes.json()) as { counters: Record<string, number>; durations: Record<string, unknown> };
    expect(metricsBody).toHaveProperty("counters");
    expect(metricsBody).toHaveProperty("durations");
  });

  it("executa workflow no POST /run e retorna traceId", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const runRes = await fetch(`${baseUrl}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "http-run-001",
        goal: "Executar workflow mínimo via endpoint HTTP",
        context: { origin: "integration-test" }
      })
    });

    expect(runRes.status).toBe(200);

    const body = (await runRes.json()) as {
      traceId: string;
      result: { taskId: string; coordinator: string; steps: Array<{ agent: string }>; finalAnswer: string };
    };

    expect(body.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(body.result.taskId).toBe("http-run-001");
    expect(body.result.coordinator).toBe("coordinator");
    expect(body.result.steps.length).toBeGreaterThan(0);
    expect(body.result.finalAnswer).toContain("workflow mínimo");
  });
});
