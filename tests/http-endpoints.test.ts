import { createHash } from "node:crypto";
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
  it("expõe /health, /pingz, /timez, /readyz, /statusz, /metrics, /diag, /build-info, /routes-hash e /openapi-lite", async () => {
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

    const pingzRes = await fetch(`${baseUrl}/pingz`);
    expect(pingzRes.status).toBe(200);
    const pingzBody = (await pingzRes.json()) as { status: string; localLatencyMs: number; timestamp: string };
    expect(pingzBody.status).toBe("ok");
    expect(typeof pingzBody.localLatencyMs).toBe("number");
    expect(pingzBody.localLatencyMs).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(pingzBody.timestamp))).toBe(false);

    const timezRes = await fetch(`${baseUrl}/timez`);
    expect(timezRes.status).toBe(200);
    const timezBody = (await timezRes.json()) as { serverTimeUtc: string; uptimeSec: number };
    expect(Number.isNaN(Date.parse(timezBody.serverTimeUtc))).toBe(false);
    expect(typeof timezBody.uptimeSec).toBe("number");
    expect(timezBody.uptimeSec).toBeGreaterThanOrEqual(0);

    const readyRes = await fetch(`${baseUrl}/readyz`);
    expect(readyRes.status).toBe(200);
    const readyBody = (await readyRes.json()) as {
      status: string;
      ready: boolean;
      dependencies: Record<string, boolean>;
    };
    expect(readyBody.status).toBe("ready");
    expect(readyBody.ready).toBe(true);
    expect(Object.values(readyBody.dependencies).every(Boolean)).toBe(true);


    const statuszRes = await fetch(`${baseUrl}/statusz`);
    expect(statuszRes.status).toBe(200);
    const statuszBody = (await statuszRes.json()) as { ready: boolean; uptimeSec: number; version: string };
    expect(statuszBody.ready).toBe(true);
    expect(typeof statuszBody.uptimeSec).toBe("number");
    expect(statuszBody.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(statuszBody.version).toMatch(/^\d+\.\d+\.\d+(-.+)?$|^unknown$/);

    const metricsRes = await fetch(`${baseUrl}/metrics`);
    expect(metricsRes.status).toBe(200);
    const metricsBody = (await metricsRes.json()) as { counters: Record<string, number>; durations: Record<string, unknown> };
    expect(metricsBody).toHaveProperty("counters");
    expect(metricsBody).toHaveProperty("durations");

    const diagRes = await fetch(`${baseUrl}/diag`);
    expect(diagRes.status).toBe(200);
    const diagBody = (await diagRes.json()) as {
      orchestrator: { coordinator: string; agentCount: number; agents: string[] };
      config: { retryAttempts: number; stateStoreType: string; queueType: string };
      runtime: { readiness: { ready: boolean }; queueDepth: number };
      metrics: { counters: Record<string, number>; durations: Record<string, unknown> };
    };
    expect(diagBody.orchestrator.coordinator).toBe("coordinator");
    expect(diagBody.orchestrator.agentCount).toBeGreaterThan(0);
    expect(diagBody.orchestrator.agents.length).toBe(diagBody.orchestrator.agentCount);
    expect(diagBody.config.retryAttempts).toBeGreaterThanOrEqual(1);
    expect(diagBody.config.stateStoreType).toBe("FileStateStore");
    expect(diagBody.config.queueType).toBe("InMemoryQueue");
    expect(diagBody.runtime.readiness.ready).toBe(true);
    expect(diagBody.runtime.queueDepth).toBeGreaterThanOrEqual(0);
    expect(diagBody.metrics).toHaveProperty("counters");
    expect(diagBody.metrics).toHaveProperty("durations");

    expect("STATE_FILE" in diagBody.config).toBe(false);

    const buildInfoRes = await fetch(`${baseUrl}/build-info`);
    expect(buildInfoRes.status).toBe(200);
    const buildInfoBody = (await buildInfoRes.json()) as {
      version: string;
      commit: string;
      buildTime: string;
      nodeVersion: string;
    };
    expect(buildInfoBody.version).toMatch(/^\d+\.\d+\.\d+(-.+)?$|^unknown$/);
    expect(buildInfoBody.commit).toMatch(/^[0-9a-f]{7,40}$|^unknown$/i);
    expect(Number.isNaN(Date.parse(buildInfoBody.buildTime))).toBe(false);
    expect(buildInfoBody.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);

    const routesHashRes = await fetch(`${baseUrl}/routes-hash`);
    expect(routesHashRes.status).toBe(200);
    const routesHashBody = (await routesHashRes.json()) as { algorithm: string; hash: string };
    expect(routesHashBody.algorithm).toBe("sha256");
    expect(routesHashBody.hash).toMatch(/^[0-9a-f]{64}$/i);

    const openApiLiteRes = await fetch(`${baseUrl}/openapi-lite`);
    expect(openApiLiteRes.status).toBe(200);
    const openApiLiteBody = (await openApiLiteRes.json()) as {
      openapi: string;
      info: { title: string; version: string };
      endpoints: Array<{ method: string; path: string; summary: string }>;
    };
    expect(openApiLiteBody.openapi).toBe("3.1.0-lite");
    expect(openApiLiteBody.info.title).toBe("ai-agent-demo HTTP API");
    expect(openApiLiteBody.info.version).toBe(buildInfoBody.version);
    expect(openApiLiteBody.endpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/health" }),
        expect.objectContaining({ method: "GET", path: "/pingz" }),
        expect.objectContaining({ method: "GET", path: "/timez" }),
        expect.objectContaining({ method: "GET", path: "/statusz" }),
        expect.objectContaining({ method: "GET", path: "/routes-hash" }),
        expect.objectContaining({ method: "GET", path: "/openapi-lite" }),
        expect.objectContaining({ method: "POST", path: "/run" })
      ])
    );

    const expectedRoutesHash = createHash("sha256")
      .update(openApiLiteBody.endpoints.map(({ method, path }) => `${method} ${path}`).sort().join("\n"))
      .digest("hex");
    expect(routesHashBody.hash).toBe(expectedRoutesHash);
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
