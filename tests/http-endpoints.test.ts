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
});
