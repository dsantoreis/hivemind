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
      uniqueEndpoints: number;
      filteredOutEndpoints: number;
      requestsByEndpoint: Record<string, number>;
      resetApplied: boolean;
    };

    expect(typeof statsBody.uptimeSec).toBe("number");
    expect(statsBody.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(statsBody.requestsByEndpoint["/health"]).toBe(2);
    expect(statsBody.requestsByEndpoint["/metrics"]).toBe(1);
    expect(statsBody.requestsByEndpoint["/stats"]).toBe(1);
    expect(statsBody.totalRequests).toBe(4);
    expect(statsBody.uniqueEndpoints).toBe(3);
    expect(statsBody.filteredOutEndpoints).toBe(0);
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

  it("ordena alfabeticamente quando contagem empata no ranking top", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    await fetch(`${baseUrl}/diag`);
    await fetch(`${baseUrl}/diag`);
    await fetch(`${baseUrl}/metrics`);
    await fetch(`${baseUrl}/metrics`);

    const statsRes = await fetch(`${baseUrl}/stats?top=2`);
    expect(statsRes.status).toBe(200);

    const statsBody = (await statsRes.json()) as {
      topEndpoints: Array<{ path: string; count: number }>;
    };

    expect(statsBody.topEndpoints).toEqual([
      { path: "/diag", count: 2 },
      { path: "/metrics", count: 2 }
    ]);
  });

  it("permite excluir o próprio /stats com ?excludeSelf=1", async () => {
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

    const statsRes = await fetch(`${baseUrl}/stats?excludeSelf=1`);
    expect(statsRes.status).toBe(200);

    const statsBody = (await statsRes.json()) as {
      totalRequests: number;
      requestsByEndpoint: Record<string, number>;
      excludeSelfApplied: boolean;
    };

    expect(statsBody.excludeSelfApplied).toBe(true);
    expect(statsBody.totalRequests).toBe(2);
    expect(statsBody.requestsByEndpoint["/health"]).toBe(2);
    expect(statsBody.requestsByEndpoint["/stats"]).toBeUndefined();
  });

  it("filtra por prefixo com ?prefix=/he", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/healthz-lite`);
    await fetch(`${baseUrl}/metrics`);

    const statsRes = await fetch(`${baseUrl}/stats?prefix=/he`);
    expect(statsRes.status).toBe(200);

    const statsBody = (await statsRes.json()) as {
      totalRequests: number;
      uniqueEndpoints: number;
      filteredOutEndpoints: number;
      requestsByEndpoint: Record<string, number>;
      prefixApplied: string | null;
    };

    expect(statsBody.prefixApplied).toBe("/he");
    expect(statsBody.totalRequests).toBe(2);
    expect(statsBody.uniqueEndpoints).toBe(2);
    expect(statsBody.filteredOutEndpoints).toBe(2);
    expect(statsBody.requestsByEndpoint).toEqual({
      "/health": 1,
      "/healthz-lite": 1
    });
  });

  it("filtra endpoint exato com ?endpoint=/health", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    await fetch(`${baseUrl}/health`);
    await fetch(`${baseUrl}/healthz`);
    await fetch(`${baseUrl}/health`);

    const statsRes = await fetch(`${baseUrl}/stats?endpoint=/health`);
    expect(statsRes.status).toBe(200);

    const statsBody = (await statsRes.json()) as {
      totalRequests: number;
      uniqueEndpoints: number;
      filteredOutEndpoints: number;
      requestsByEndpoint: Record<string, number>;
      endpointApplied: string | null;
    };

    expect(statsBody.endpointApplied).toBe("/health");
    expect(statsBody.totalRequests).toBe(2);
    expect(statsBody.uniqueEndpoints).toBe(1);
    expect(statsBody.filteredOutEndpoints).toBe(2);
    expect(statsBody.requestsByEndpoint).toEqual({
      "/health": 2
    });
  });

  it("filtra endpoints por contagem mínima com ?minCount=2", async () => {
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

    const statsRes = await fetch(`${baseUrl}/stats?minCount=2`);
    expect(statsRes.status).toBe(200);

    const statsBody = (await statsRes.json()) as {
      totalRequests: number;
      requestsByEndpoint: Record<string, number>;
      minCountApplied: number | null;
    };

    expect(statsBody.minCountApplied).toBe(2);
    expect(statsBody.totalRequests).toBe(2);
    expect(statsBody.requestsByEndpoint).toEqual({
      "/health": 2
    });
  });

  it("retorna 400 quando top/minCount são inválidos", async () => {
    const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
    const app = createAppServer(orchestrator);
    runningServers.push(app);

    app.server.listen(0);
    await once(app.server, "listening");

    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Address inválido");

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const statsRes = await fetch(`${baseUrl}/stats?top=abc&minCount=-1`);
    expect(statsRes.status).toBe(400);

    const statsBody = (await statsRes.json()) as {
      error: string;
      details: string[];
    };

    expect(statsBody.error).toBe("invalid_query_params");
    expect(statsBody.details).toEqual([
      "minCount must be a positive integer",
      "top must be a positive integer"
    ]);
  });

  it("aceita reset/excludeSelf como boolean query param e valida valores inválidos", async () => {
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

    const boolRes = await fetch(`${baseUrl}/stats?excludeSelf=true&reset=yes`);
    expect(boolRes.status).toBe(200);

    const boolBody = (await boolRes.json()) as {
      excludeSelfApplied: boolean;
      resetApplied: boolean;
      requestsByEndpoint: Record<string, number>;
    };

    expect(boolBody.excludeSelfApplied).toBe(true);
    expect(boolBody.resetApplied).toBe(true);
    expect(boolBody.requestsByEndpoint["/stats"]).toBeUndefined();

    const invalidRes = await fetch(`${baseUrl}/stats?excludeSelf=talvez`);
    expect(invalidRes.status).toBe(400);

    const invalidBody = (await invalidRes.json()) as {
      error: string;
      details: string[];
    };

    expect(invalidBody.error).toBe("invalid_query_params");
    expect(invalidBody.details).toEqual(["excludeSelf must be a boolean (true/false/1/0)"]);
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
