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
    };

    expect(typeof statsBody.uptimeSec).toBe("number");
    expect(statsBody.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(statsBody.requestsByEndpoint["/health"]).toBe(2);
    expect(statsBody.requestsByEndpoint["/metrics"]).toBe(1);
    expect(statsBody.requestsByEndpoint["/stats"]).toBe(1);
    expect(statsBody.totalRequests).toBe(4);
  });
});
