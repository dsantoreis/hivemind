import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ReliableMultiAgentOrchestrator } from "./orchestrator.js";
import type { TaskInput } from "./types.js";

export interface AppServer {
  server: Server;
  close: () => Promise<void>;
}

function resolveCommitHash(): string {
  const fromEnv = process.env.COMMIT_HASH?.trim();
  if (fromEnv) return fromEnv;

  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function resolveBuildTime(): string {
  const fromEnv = process.env.BUILD_TIME?.trim();
  if (fromEnv) return fromEnv;
  return new Date().toISOString();
}

function resolveVersion(): string {
  const fromEnv = process.env.APP_VERSION?.trim() ?? process.env.npm_package_version?.trim();
  if (fromEnv) return fromEnv;

  try {
    const packageJsonPath = new URL("../package.json", import.meta.url);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as { version?: string };
    if (packageJson.version?.trim()) return packageJson.version.trim();
  } catch {
    // ignore and fallback
  }

  return "unknown";
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

class InvalidJsonBodyError extends Error {
  constructor() {
    super("invalid_json_body");
    this.name = "InvalidJsonBodyError";
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf-8").trim();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

function isTaskInput(payload: unknown): payload is TaskInput {
  if (!payload || typeof payload !== "object") return false;

  const candidate = payload as Partial<TaskInput>;
  if (typeof candidate.goal !== "string" || candidate.goal.trim().length === 0) return false;

  if (candidate.id !== undefined && typeof candidate.id !== "string") return false;
  if (candidate.context !== undefined && (typeof candidate.context !== "object" || candidate.context === null)) return false;

  return true;
}

const OPENAPI_LITE_ENDPOINTS = [
  { method: "GET", path: "/health", summary: "Status do processo" },
  { method: "GET", path: "/alivez", summary: "Status mínimo de vida do processo" },
  { method: "GET", path: "/healthz-lite", summary: "Health mínimo com status + uptimeSec" },
  { method: "GET", path: "/echoz", summary: "Echo mínimo com status + service" },
  { method: "GET", path: "/pingz", summary: "Latência local do request + timestamp" },
  { method: "GET", path: "/stats", summary: "Requests agregados por endpoint + uptime" },
  { method: "GET", path: "/timez", summary: "Hora UTC do servidor + uptime" },
  { method: "GET", path: "/readyz", summary: "Prontidão do orchestrator e dependências" },
  { method: "GET", path: "/readyz-lite", summary: "Prontidão compacta: ready + uptimeSec" },
  { method: "GET", path: "/statusz", summary: "Resumo compacto: ready, uptimeSec, version" },
  { method: "GET", path: "/meta-lite", summary: "Metadados mínimos: name, version, uptimeSec" },
  { method: "GET", path: "/metrics", summary: "Snapshot de métricas" },
  { method: "GET", path: "/diag", summary: "Resumo de diagnóstico sem segredos" },
  { method: "GET", path: "/diag-lite", summary: "Diagnóstico mínimo: ready, queueDepth, agentCount" },
  { method: "GET", path: "/build-info", summary: "Metadados de build" },
  { method: "GET", path: "/build-lite", summary: "Build mínimo: version + commit" },
  { method: "GET", path: "/routes-hash", summary: "Hash SHA-256 estável de métodos+rotas expostos" },
  { method: "GET", path: "/openapi-lite", summary: "Lista resumida dos endpoints HTTP" },
  { method: "POST", path: "/run", summary: "Executa workflow mínimo e retorna traceId" }
] as const;

const ROUTES_SIGNATURE_ENTRIES = OPENAPI_LITE_ENDPOINTS.map(({ method, path }) => `${method} ${path}`).sort();
const ROUTES_SIGNATURE_TEXT = ROUTES_SIGNATURE_ENTRIES.join("\n");
const ROUTES_SIGNATURE_SHA256 = createHash("sha256").update(ROUTES_SIGNATURE_TEXT).digest("hex");

async function route(
  req: IncomingMessage,
  res: ServerResponse,
  orchestrator: ReliableMultiAgentOrchestrator,
  startedAt: number,
  buildInfo: { version: string; commit: string; buildTime: string; nodeVersion: string },
  requestsByEndpoint: Map<string, number>
) {
  const endpoint = (req.url ?? "/").split("?")[0] || "/";
  const startedAtNs = process.hrtime.bigint();
  requestsByEndpoint.set(endpoint, (requestsByEndpoint.get(endpoint) ?? 0) + 1);

  if (req.method === "GET" && endpoint === "/health") {
    sendJson(res, 200, {
      status: "ok",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/alivez") {
    sendJson(res, 200, {
      status: "alive"
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/healthz-lite") {
    sendJson(res, 200, {
      status: "ok",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000)
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/echoz") {
    sendJson(res, 200, {
      status: "ok",
      service: "ai-agent-demo"
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/pingz") {
    const localLatencyMs = Number(process.hrtime.bigint() - startedAtNs) / 1_000_000;
    sendJson(res, 200, {
      status: "ok",
      localLatencyMs: Number(localLatencyMs.toFixed(3)),
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/stats") {
    sendJson(res, 200, {
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      totalRequests: Array.from(requestsByEndpoint.values()).reduce((acc, current) => acc + current, 0),
      requestsByEndpoint: Object.fromEntries(requestsByEndpoint)
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/timez") {
    sendJson(res, 200, {
      serverTimeUtc: new Date().toISOString(),
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000)
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/readyz") {
    const readiness = orchestrator.getReadiness();
    sendJson(res, readiness.ready ? 200 : 503, {
      status: readiness.ready ? "ready" : "not_ready",
      ...readiness,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/readyz-lite") {
    const readiness = orchestrator.getReadiness();
    sendJson(res, readiness.ready ? 200 : 503, {
      ready: readiness.ready,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000)
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/statusz") {
    const readiness = orchestrator.getReadiness();
    sendJson(res, 200, {
      ready: readiness.ready,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      version: buildInfo.version
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/meta-lite") {
    sendJson(res, 200, {
      name: "ai-agent-demo",
      version: buildInfo.version,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000)
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/metrics") {
    sendJson(res, 200, orchestrator.getMetricsSnapshot());
    return;
  }

  if (req.method === "GET" && endpoint === "/diag") {
    sendJson(res, 200, orchestrator.getDiagnosticSummary());
    return;
  }

  if (req.method === "GET" && endpoint === "/diag-lite") {
    const diag = orchestrator.getDiagnosticSummary();
    sendJson(res, 200, {
      ready: diag.runtime.readiness.ready,
      queueDepth: diag.runtime.queueDepth,
      agentCount: diag.orchestrator.agentCount
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/build-info") {
    sendJson(res, 200, buildInfo);
    return;
  }

  if (req.method === "GET" && endpoint === "/build-lite") {
    sendJson(res, 200, {
      version: buildInfo.version,
      commit: buildInfo.commit
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/routes-hash") {
    sendJson(res, 200, {
      algorithm: "sha256",
      hash: ROUTES_SIGNATURE_SHA256
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/openapi-lite") {
    sendJson(res, 200, {
      openapi: "3.1.0-lite",
      info: {
        title: "ai-agent-demo HTTP API",
        version: buildInfo.version
      },
      endpoints: OPENAPI_LITE_ENDPOINTS
    });
    return;
  }

  if (req.method === "POST" && endpoint === "/run") {
    const traceId = randomUUID();

    try {
      const payload = await readJsonBody(req);
      if (!isTaskInput(payload)) {
        sendJson(res, 400, {
          status: "error",
          message: "invalid_payload",
          traceId
        });
        return;
      }

      const result = await orchestrator.run(payload);
      sendJson(res, 200, {
        traceId,
        result
      });
      return;
    } catch (error) {
      if (error instanceof InvalidJsonBodyError) {
        sendJson(res, 400, {
          status: "error",
          message: "invalid_json_body",
          traceId
        });
        return;
      }

      sendJson(res, 500, {
        status: "error",
        message: "run_failed",
        traceId,
        error: (error as Error).message
      });
      return;
    }
  }

  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { status: "error", message: "method_not_allowed" });
    return;
  }

  sendJson(res, 404, { status: "error", message: "not_found" });
}

export function createAppServer(orchestrator: ReliableMultiAgentOrchestrator): AppServer {
  const startedAt = Date.now();
  const buildInfo = {
    version: resolveVersion(),
    commit: resolveCommitHash(),
    buildTime: resolveBuildTime(),
    nodeVersion: process.version
  };

  const requestsByEndpoint = new Map<string, number>();

  const server = createHttpServer((req, res) => {
    route(req, res, orchestrator, startedAt, buildInfo, requestsByEndpoint).catch((error) => {
      sendJson(res, 500, {
        status: "error",
        message: "internal_server_error",
        error: (error as Error).message
      });
    });
  });

  return {
    server,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      })
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();
  const { server } = createAppServer(orchestrator);
  const port = Number(process.env.PORT ?? 3000);

  server.listen(port, () => {
    console.log(`HTTP server listening on http://localhost:${port}`);
    console.log(
      "Endpoints: GET /health | GET /alivez | GET /healthz-lite | GET /echoz | GET /pingz | GET /stats | GET /timez | GET /readyz | GET /readyz-lite | GET /statusz | GET /meta-lite | GET /metrics | GET /diag | GET /diag-lite | GET /build-info | GET /build-lite | GET /routes-hash | GET /openapi-lite | POST /run"
    );
  });
}
