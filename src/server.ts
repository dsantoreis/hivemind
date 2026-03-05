import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { ReliableMultiAgentOrchestrator } from "./orchestrator.js";

export interface AppServer {
  server: Server;
  close: () => Promise<void>;
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function route(
  req: IncomingMessage,
  res: ServerResponse,
  orchestrator: ReliableMultiAgentOrchestrator,
  startedAt: number
) {
  if (req.method !== "GET") {
    sendJson(res, 405, { status: "error", message: "method_not_allowed" });
    return;
  }

  if (req.url === "/health") {
    sendJson(res, 200, {
      status: "ok",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.url === "/metrics") {
    sendJson(res, 200, orchestrator.getMetricsSnapshot());
    return;
  }

  sendJson(res, 404, { status: "error", message: "not_found" });
}

export function createAppServer(orchestrator: ReliableMultiAgentOrchestrator): AppServer {
  const startedAt = Date.now();
  const server = createHttpServer((req, res) => route(req, res, orchestrator, startedAt));

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
    console.log("Endpoints: GET /health | GET /metrics");
  });
}
