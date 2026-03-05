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

describe("HTTP /stats", () => {
  it("agrega requests por endpoint e expõe uptime", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/metrics`);

    const statsRes = await fetch(`${baseUrl}/stats`);
    expect(statsRes.status).toBe(200);

    const statsBody = (await statsRes.json()) as {
      uptimeSec: number;
      totalRequests: number;
      requestsByEndpoint: Record<string, number>;
      resetApplied: boolean;
    };

    expect(typeof statsBody.uptimeSec).toBe("number");
    expect(statsBody.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(statsBody.requestsByEndpoint["/health"]).toBe(2);
    expect(statsBody.requestsByEndpoint["/metrics"]).toBe(1);
    expect(statsBody.requestsByEndpoint["/stats"]).toBe(1);
    expect(statsBody.totalRequests).toBe(4);
    expect(statsBody.resetApplied).toBe(false);
  });

  it("retorna ranking top de endpoints quando chamado com ?top=N", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/metrics`);
    await fetch(`${baseUrl}/metrics`);
    await fetch(`${baseUrl}/metrics`);

    const statsRes = await fetch(`${baseUrl}/stats?top=2`);
    expect(statsRes.status).toBe(200);

    const statsBody = (await statsRes.json()) as {
      topEndpoints: Array<{ path: string; count: number }>;
    };

    expect(statsBody.topEndpoints).toEqual([
      { path: "/metrics", count: 3 },
      { path: "/health", count: 2 }
    ]);
  });

  it("reseta contadores quando chamado com ?reset=1", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/metrics`);

    const resetRes = await fetch(`${baseUrl}/stats?reset=1`);
    expect(resetRes.status).toBe(200);
    const resetBody = (await resetRes.json()) as {
      totalRequests: number;
      requestsByEndpoint: Record<string, number>;
      resetApplied: boolean;
    };

    expect(resetBody.resetApplied).toBe(true);
    expect(resetBody.totalRequests).toBe(3);
    expect(resetBody.requestsByEndpoint["/health"]).toBe(1);
    expect(resetBody.requestsByEndpoint["/metrics"]).toBe(1);
    expect(resetBody.requestsByEndpoint["/stats"]).toBe(1);

    const afterResetRes = await fetch(`${baseUrl}/stats`);
    expect(afterResetRes.status).toBe(200);
    const afterResetBody = (await afterResetRes.json()) as {
      totalRequests: number;
      requestsByEndpoint: Record<string, number>;
      resetApplied: boolean;
    };

    expect(afterResetBody.resetApplied).toBe(false);
    expect(afterResetBody.totalRequests).toBe(1);
    expect(afterResetBody.requestsByEndpoint["/stats"]).toBe(1);
    expect(afterResetBody.requestsByEndpoint["/health"]).toBeUndefined();
    expect(afterResetBody.requestsByEndpoint["/metrics"]).toBeUndefined();
  });
});
