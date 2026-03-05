import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
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

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf-8").trim();
  if (!rawBody) return {};

  return JSON.parse(rawBody) as unknown;
}

function isTaskInput(payload: unknown): payload is TaskInput {
  if (!payload || typeof payload !== "object") return false;

  const candidate = payload as Partial<TaskInput>;
  if (typeof candidate.goal !== "string" || candidate.goal.trim().length === 0) return false;

  if (candidate.id !== undefined && typeof candidate.id !== "string") return false;
  if (candidate.context !== undefined && (typeof candidate.context !== "object" || candidate.context === null)) return false;

  return true;
}

async function route(
  req: IncomingMessage,
  res: ServerResponse,
  orchestrator: ReliableMultiAgentOrchestrator,
  startedAt: number,
  buildInfo: { commitHash: string; buildTime: string }
) {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      status: "ok",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === "GET" && req.url === "/readyz") {
    const readiness = orchestrator.getReadiness();
    sendJson(res, readiness.ready ? 200 : 503, {
      status: readiness.ready ? "ready" : "not_ready",
      ...readiness,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === "GET" && req.url === "/metrics") {
    sendJson(res, 200, orchestrator.getMetricsSnapshot());
    return;
  }

  if (req.method === "GET" && req.url === "/diag") {
    sendJson(res, 200, orchestrator.getDiagnosticSummary());
    return;
  }

  if (req.method === "GET" && req.url === "/version") {
    sendJson(res, 200, {
      commitHash: buildInfo.commitHash,
      buildTime: buildInfo.buildTime
    });
    return;
  }

  if (req.method === "POST" && req.url === "/run") {
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
    commitHash: resolveCommitHash(),
    buildTime: resolveBuildTime()
  };

  const server = createHttpServer((req, res) => {
    route(req, res, orchestrator, startedAt, buildInfo).catch((error) => {
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
    console.log("Endpoints: GET /health | GET /readyz | GET /metrics | GET /diag | GET /version | POST /run");
  });
}
