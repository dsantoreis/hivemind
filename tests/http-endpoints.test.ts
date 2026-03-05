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
  it("expõe /health, /alivez, /livez, /healthz-lite, /echoz, /pingz, /timez, /uptimez, /readyz, /readyz-lite, /statusz, /versionz, /meta-lite, /metrics, /diag, /diag-lite, /build-info, /build-lite, /routes-hash e /openapi-lite", async () => {
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

    const alivezRes = await fetch(`${baseUrl}/alivez`);
    expect(alivezRes.status).toBe(200);
    const alivezBody = (await alivezRes.json()) as { status: string };
    expect(alivezBody.status).toBe("alive");

    const livezRes = await fetch(`${baseUrl}/livez`);
    expect(livezRes.status).toBe(200);
    const livezBody = (await livezRes.json()) as { status: string };
    expect(livezBody.status).toBe("alive");

    const healthzLiteRes = await fetch(`${baseUrl}/healthz-lite`);
    expect(healthzLiteRes.status).toBe(200);
    const healthzLiteBody = (await healthzLiteRes.json()) as { status: string; uptimeSec: number };
    expect(healthzLiteBody.status).toBe("ok");
    expect(typeof healthzLiteBody.uptimeSec).toBe("number");
    expect(healthzLiteBody.uptimeSec).toBeGreaterThanOrEqual(0);

    const echozRes = await fetch(`${baseUrl}/echoz`);
    expect(echozRes.status).toBe(200);
    const echozBody = (await echozRes.json()) as { status: string; service: string };
    expect(echozBody.status).toBe("ok");
    expect(echozBody.service).toBe("ai-agent-demo");

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

    const uptimezRes = await fetch(`${baseUrl}/uptimez`);
    expect(uptimezRes.status).toBe(200);
    const uptimezBody = (await uptimezRes.json()) as { uptimeSec: number; startedAtUtc: string };
    expect(typeof uptimezBody.uptimeSec).toBe("number");
    expect(uptimezBody.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(uptimezBody.startedAtUtc))).toBe(false);

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


    const readyLiteRes = await fetch(`${baseUrl}/readyz-lite`);
    expect(readyLiteRes.status).toBe(200);
    const readyLiteBody = (await readyLiteRes.json()) as { ready: boolean; uptimeSec: number };
    expect(readyLiteBody.ready).toBe(true);
    expect(typeof readyLiteBody.uptimeSec).toBe("number");
    expect(readyLiteBody.uptimeSec).toBeGreaterThanOrEqual(0);

    const statuszRes = await fetch(`${baseUrl}/statusz`);
    expect(statuszRes.status).toBe(200);
    const statuszBody = (await statuszRes.json()) as { ready: boolean; uptimeSec: number; version: string };
    expect(statuszBody.ready).toBe(true);
    expect(typeof statuszBody.uptimeSec).toBe("number");
    expect(statuszBody.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(statuszBody.version).toMatch(/^\d+\.\d+\.\d+(-.+)?$|^unknown$/);

    const versionzRes = await fetch(`${baseUrl}/versionz`);
    expect(versionzRes.status).toBe(200);
    const versionzBody = (await versionzRes.json()) as { version: string; commit: string; nodeVersion: string };
    expect(versionzBody.version).toBe(statuszBody.version);
    expect(versionzBody.commit).toMatch(/^[0-9a-f]{7,40}$|^unknown$/i);
    expect(versionzBody.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);

    const metaLiteRes = await fetch(`${baseUrl}/meta-lite`);
    expect(metaLiteRes.status).toBe(200);
    const metaLiteBody = (await metaLiteRes.json()) as { name: string; version: string; uptimeSec: number };
    expect(metaLiteBody.name).toBe("ai-agent-demo");
    expect(metaLiteBody.version).toBe(statuszBody.version);
    expect(typeof metaLiteBody.uptimeSec).toBe("number");
    expect(metaLiteBody.uptimeSec).toBeGreaterThanOrEqual(0);

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

    const diagLiteRes = await fetch(`${baseUrl}/diag-lite`);
    expect(diagLiteRes.status).toBe(200);
    const diagLiteBody = (await diagLiteRes.json()) as {
      ready: boolean;
      queueDepth: number;
      agentCount: number;
    };
    expect(diagLiteBody.ready).toBe(diagBody.runtime.readiness.ready);
    expect(diagLiteBody.queueDepth).toBeGreaterThanOrEqual(0);
    expect(diagLiteBody.agentCount).toBe(diagBody.orchestrator.agentCount);
    expect("config" in diagLiteBody).toBe(false);
    expect("metrics" in diagLiteBody).toBe(false);

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

    const buildLiteRes = await fetch(`${baseUrl}/build-lite`);
    expect(buildLiteRes.status).toBe(200);
    const buildLiteBody = (await buildLiteRes.json()) as {
      version: string;
      commit: string;
    };
    expect(buildLiteBody.version).toBe(buildInfoBody.version);
    expect(buildLiteBody.commit).toBe(buildInfoBody.commit);

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
        expect.objectContaining({ method: "GET", path: "/alivez" }),
        expect.objectContaining({ method: "GET", path: "/livez" }),
        expect.objectContaining({ method: "GET", path: "/healthz-lite" }),
        expect.objectContaining({ method: "GET", path: "/echoz" }),
        expect.objectContaining({ method: "GET", path: "/pingz" }),
        expect.objectContaining({ method: "GET", path: "/timez" }),
        expect.objectContaining({ method: "GET", path: "/uptimez" }),
        expect.objectContaining({ method: "GET", path: "/readyz-lite" }),
        expect.objectContaining({ method: "GET", path: "/statusz" }),
        expect.objectContaining({ method: "GET", path: "/versionz" }),
        expect.objectContaining({ method: "GET", path: "/meta-lite" }),
        expect.objectContaining({ method: "GET", path: "/diag-lite" }),
        expect.objectContaining({ method: "GET", path: "/build-lite" }),
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

  it("aceita querystring em endpoints GET", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthRes = await fetch(`${baseUrl}/health?check=1`);
    expect(healthRes.status).toBe(200);

    const statsRes = await fetch(`${baseUrl}/stats`);
    const statsBody = (await statsRes.json()) as { requestsByEndpoint: Record<string, number> };
    expect(statsBody.requestsByEndpoint["/health"]).toBe(1);
  });

  it("aceita HEAD em /health para probes de liveness", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const headRes = await fetch(`${baseUrl}/health`, { method: "HEAD" });
    expect(headRes.status).toBe(200);
    expect(await headRes.text()).toBe("");

    const aliveHeadRes = await fetch(`${baseUrl}/alivez`, { method: "HEAD" });
    expect(aliveHeadRes.status).toBe(200);
    expect(await aliveHeadRes.text()).toBe("");

    const statsRes = await fetch(`${baseUrl}/stats`);
    const statsBody = (await statsRes.json()) as { requestsByEndpoint: Record<string, number> };
    expect(statsBody.requestsByEndpoint["/health"]).toBe(1);
  });

  it("aceita HEAD em /readyz-lite para probes de readiness sem payload", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const headRes = await fetch(`${baseUrl}/readyz-lite`, { method: "HEAD" });
    expect(headRes.status).toBe(200);
    expect(await headRes.text()).toBe("");

    const statsRes = await fetch(`${baseUrl}/stats`);
    const statsBody = (await statsRes.json()) as { requestsByEndpoint: Record<string, number> };
    expect(statsBody.requestsByEndpoint["/readyz-lite"]).toBe(1);
  });

  it("aceita HEAD em /statusz para probes sem payload", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const headRes = await fetch(`${baseUrl}/statusz`, { method: "HEAD" });
    expect(headRes.status).toBe(200);
    expect(await headRes.text()).toBe("");

    const statsRes = await fetch(`${baseUrl}/stats`);
    const statsBody = (await statsRes.json()) as { requestsByEndpoint: Record<string, number> };
    expect(statsBody.requestsByEndpoint["/statusz"]).toBe(1);
  });

  it("retorna 415 quando POST /run não recebe content-type JSON", async () => {
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
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ goal: "payload válido, media type inválido" })
    });

    expect(runRes.status).toBe(415);

    const body = (await runRes.json()) as { status: string; message: string; traceId: string };
    expect(body.status).toBe("error");
    expect(body.message).toBe("unsupported_media_type");
    expect(body.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("retorna 400 para JSON malformado no POST /run", async () => {
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
      body: '{"goal": "incompleto"'
    });

    expect(runRes.status).toBe(400);

    const body = (await runRes.json()) as { status: string; message: string; traceId: string };
    expect(body.status).toBe("error");
    expect(body.message).toBe("invalid_json_body");
    expect(body.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("retorna 413 quando POST /run excede limite de payload", async () => {
    const previousLimit = process.env.RUN_BODY_MAX_BYTES;
    process.env.RUN_BODY_MAX_BYTES = "64";

    try {
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
        body: JSON.stringify({ goal: "x".repeat(512) })
      });

      expect(runRes.status).toBe(413);

      const body = (await runRes.json()) as { status: string; message: string; maxBytes: number; traceId: string };
      expect(body.status).toBe("error");
      expect(body.message).toBe("payload_too_large");
      expect(body.maxBytes).toBe(64);
      expect(body.traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    } finally {
      if (previousLimit === undefined) delete process.env.RUN_BODY_MAX_BYTES;
      else process.env.RUN_BODY_MAX_BYTES = previousLimit;
    }
  });

  it("retorna erros de validação detalhados para payload JSON inválido", async () => {
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
        goal: "",
        id: 123,
        context: "invalid"
      })
    });

    expect(runRes.status).toBe(400);

    const body = (await runRes.json()) as {
      status: string;
      message: string;
      validationErrors: string[];
      traceId: string;
    };

    expect(body.status).toBe("error");
    expect(body.message).toBe("invalid_payload");
    expect(body.validationErrors).toEqual(
      expect.arrayContaining([
        "goal must be a non-empty string",
        "id must be a string when provided",
        "context must be a non-array object when provided"
      ])
    );
    expect(body.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("rejeita context como array no POST /run", async () => {
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
        goal: "Contexto inválido",
        context: []
      })
    });

    expect(runRes.status).toBe(400);

    const body = (await runRes.json()) as {
      status: string;
      message: string;
      validationErrors: string[];
    };

    expect(body.status).toBe("error");
    expect(body.message).toBe("invalid_payload");
    expect(body.validationErrors).toContain("context must be a non-array object when provided");
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
