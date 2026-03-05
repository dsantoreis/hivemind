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

class PayloadTooLargeError extends Error {
  constructor() {
    super("payload_too_large");
    this.name = "PayloadTooLargeError";
  }
}

function isJsonContentType(contentTypeHeader: string | string[] | undefined): boolean {
  if (!contentTypeHeader) return false;
  const value = Array.isArray(contentTypeHeader) ? contentTypeHeader.join(",") : contentTypeHeader;
  const normalized = value.toLowerCase();
  return normalized.includes("application/json") || normalized.includes("+json");
}

function resolveRunBodyMaxBytes(): number {
  const raw = process.env.RUN_BODY_MAX_BYTES?.trim();
  if (!raw) return 1_000_000;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1_000_000;

  return Math.floor(parsed);
}

async function readJsonBody(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > maxBytes) {
      throw new PayloadTooLargeError();
    }

    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks).toString("utf-8").trim();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

function validateTaskInput(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["payload must be a JSON object"] };
  }

  const candidate = payload as Partial<TaskInput>;

  if (typeof candidate.goal !== "string" || candidate.goal.trim().length === 0) {
    errors.push("goal must be a non-empty string");
  }

  if (candidate.id !== undefined && typeof candidate.id !== "string") {
    errors.push("id must be a string when provided");
  }

  if (
    candidate.context !== undefined &&
    (typeof candidate.context !== "object" || candidate.context === null || Array.isArray(candidate.context))
  ) {
    errors.push("context must be a non-array object when provided");
  }

  if (candidate.context && typeof candidate.context === "object" && !Array.isArray(candidate.context)) {
    for (const [key, value] of Object.entries(candidate.context)) {
      if (key.trim().length === 0) {
        errors.push("context keys must be non-empty strings");
      }

      if (typeof value !== "string") {
        errors.push(`context.${key || "<empty>"} must be a string`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function parsePositiveIntQueryParam(
  requestUrl: URL,
  paramName: string
): { value: number | null; error: string | null } {
  const rawValue = requestUrl.searchParams.get(paramName);
  if (rawValue === null || rawValue.trim() === "") {
    return { value: null, error: null };
  }

  if (!/^\d+$/.test(rawValue.trim())) {
    return { value: null, error: `${paramName} must be a positive integer` };
  }

  const parsed = Number(rawValue);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { value: null, error: `${paramName} must be a positive integer` };
  }

  return { value: parsed, error: null };
}

function parseBooleanQueryParam(
  requestUrl: URL,
  paramName: string
): { value: boolean | null; error: string | null } {
  const rawValue = requestUrl.searchParams.get(paramName);
  if (rawValue === null || rawValue.trim() === "") {
    return { value: null, error: null };
  }

  const normalized = rawValue.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return { value: true, error: null };
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return { value: false, error: null };
  }

  return { value: null, error: `${paramName} must be a boolean (true/false/1/0)` };
}

function parseSortOrderQueryParam(
  requestUrl: URL,
  paramName: string
): { value: "asc" | "desc" | null; error: string | null } {
  const rawValue = requestUrl.searchParams.get(paramName);
  if (rawValue === null || rawValue.trim() === "") {
    return { value: null, error: null };
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "asc" || normalized === "desc") {
    return { value: normalized, error: null };
  }

  return { value: null, error: `${paramName} must be asc or desc` };
}

const OPENAPI_LITE_ENDPOINTS = [
  { method: "GET", path: "/health", summary: "Status do processo" },
  { method: "GET", path: "/healthz", summary: "Alias Kubernetes-friendly para /health" },
  { method: "GET", path: "/alivez", summary: "Status mínimo de vida do processo" },
  { method: "GET", path: "/livez", summary: "Alias Kubernetes-friendly para /alivez" },
  { method: "GET", path: "/healthz-lite", summary: "Health mínimo com status + uptimeSec" },
  { method: "GET", path: "/echoz", summary: "Echo mínimo com status + service" },
  { method: "GET", path: "/pingz", summary: "Latência local do request + timestamp" },
  { method: "GET", path: "/stats", summary: "Requests agregados por endpoint + uptime" },
  { method: "GET", path: "/timez", summary: "Hora UTC do servidor + uptime" },
  { method: "GET", path: "/uptimez", summary: "Uptime compacto com startedAtUtc" },
  { method: "GET", path: "/readyz", summary: "Prontidão do orchestrator e dependências" },
  { method: "GET", path: "/readyz-lite", summary: "Prontidão compacta: ready + uptimeSec" },
  { method: "GET", path: "/statusz", summary: "Resumo compacto: ready, uptimeSec, version" },
  { method: "GET", path: "/versionz", summary: "Versão runtime: version, commit, nodeVersion" },
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
  requestsByEndpoint: Map<string, number>,
  runBodyMaxBytes: number
) {
  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  const endpoint = requestUrl.pathname || "/";
  const startedAtNs = process.hrtime.bigint();
  requestsByEndpoint.set(endpoint, (requestsByEndpoint.get(endpoint) ?? 0) + 1);

  if ((req.method === "GET" || req.method === "HEAD") && (endpoint === "/health" || endpoint === "/healthz")) {
    if (req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

    sendJson(res, 200, {
      status: "ok",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString()
    });
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && (endpoint === "/alivez" || endpoint === "/livez")) {
    if (req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

    sendJson(res, 200, {
      status: "alive"
    });
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && endpoint === "/healthz-lite") {
    if (req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

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

  if ((req.method === "GET" || req.method === "HEAD") && endpoint === "/pingz") {
    if (req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

    const localLatencyMs = Number(process.hrtime.bigint() - startedAtNs) / 1_000_000;
    sendJson(res, 200, {
      status: "ok",
      localLatencyMs: Number(localLatencyMs.toFixed(3)),
      timestamp: new Date().toISOString()
    });
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && endpoint === "/stats") {
    if (req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

    const resetParse = parseBooleanQueryParam(requestUrl, "reset");
    const excludeSelfParse = parseBooleanQueryParam(requestUrl, "excludeSelf");
    const endpointPrefix = requestUrl.searchParams.get("prefix")?.trim() ?? "";
    const endpointExact = requestUrl.searchParams.get("endpoint")?.trim() ?? "";
    const minCountParse = parsePositiveIntQueryParam(requestUrl, "minCount");
    const topParse = parsePositiveIntQueryParam(requestUrl, "top");
    const sortParse = parseSortOrderQueryParam(requestUrl, "sort");

    if (resetParse.error || excludeSelfParse.error || minCountParse.error || topParse.error || sortParse.error) {
      sendJson(res, 400, {
        error: "invalid_query_params",
        details: [resetParse.error, excludeSelfParse.error, minCountParse.error, topParse.error, sortParse.error].filter(
          (value): value is string => Boolean(value)
        )
      });
      return;
    }

    const resetCounters = resetParse.value === true;
    const excludeSelf = excludeSelfParse.value === true;

    const minCount = minCountParse.value;
    const topLimit = topParse.value;
    const sortOrder = sortParse.value ?? "desc";

    const effectiveRequestsByEndpoint = new Map(requestsByEndpoint);
    if (excludeSelf) {
      const currentStatsCount = (effectiveRequestsByEndpoint.get("/stats") ?? 0) - 1;
      if (currentStatsCount > 0) effectiveRequestsByEndpoint.set("/stats", currentStatsCount);
      else effectiveRequestsByEndpoint.delete("/stats");
    }

    const prefixedRequestsByEndpoint = endpointPrefix.length > 0
      ? new Map(Array.from(effectiveRequestsByEndpoint.entries()).filter(([path]) => path.startsWith(endpointPrefix)))
      : effectiveRequestsByEndpoint;

    const exactRequestsByEndpoint = endpointExact.length > 0
      ? new Map(Array.from(prefixedRequestsByEndpoint.entries()).filter(([path]) => path === endpointExact))
      : prefixedRequestsByEndpoint;

    const filteredRequestsByEndpoint = minCount
      ? new Map(Array.from(exactRequestsByEndpoint.entries()).filter(([, count]) => count >= minCount))
      : exactRequestsByEndpoint;

    const sortedEndpoints = Array.from(filteredRequestsByEndpoint.entries()).sort((a, b) => {
      const countDelta = sortOrder === "asc" ? a[1] - b[1] : b[1] - a[1];
      if (countDelta !== 0) return countDelta;
      return a[0].localeCompare(b[0]);
    });
    const endpoints = sortedEndpoints.map(([path, count]) => ({ path, count }));
    const topEndpoints = topLimit ? endpoints.slice(0, topLimit) : [];

    sendJson(res, 200, {
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      totalRequests: Array.from(filteredRequestsByEndpoint.values()).reduce((acc, current) => acc + current, 0),
      uniqueEndpoints: filteredRequestsByEndpoint.size,
      filteredOutEndpoints: effectiveRequestsByEndpoint.size - filteredRequestsByEndpoint.size,
      requestsByEndpoint: Object.fromEntries(filteredRequestsByEndpoint),
      endpoints,
      topEndpoints,
      resetApplied: resetCounters,
      excludeSelfApplied: excludeSelf,
      prefixApplied: endpointPrefix.length > 0 ? endpointPrefix : null,
      endpointApplied: endpointExact.length > 0 ? endpointExact : null,
      minCountApplied: minCount,
      sortApplied: sortOrder
    });

    if (resetCounters) {
      requestsByEndpoint.clear();
    }

    return;
  }

  if (req.method === "GET" && endpoint === "/timez") {
    sendJson(res, 200, {
      serverTimeUtc: new Date().toISOString(),
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000)
    });
    return;
  }

  if (req.method === "GET" && endpoint === "/uptimez") {
    sendJson(res, 200, {
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      startedAtUtc: new Date(startedAt).toISOString()
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

  if ((req.method === "GET" || req.method === "HEAD") && endpoint === "/readyz-lite") {
    const readiness = orchestrator.getReadiness();

    if (req.method === "HEAD") {
      res.writeHead(readiness.ready ? 200 : 503, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

    sendJson(res, readiness.ready ? 200 : 503, {
      ready: readiness.ready,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000)
    });
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && endpoint === "/statusz") {
    const verboseParam = parseBooleanQueryParam(requestUrl, "verbose");
    if (verboseParam.error) {
      sendJson(res, 400, { status: "error", message: "invalid_query_param", detail: verboseParam.error });
      return;
    }

    if (req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

    const readiness = orchestrator.getReadiness();
    const payload: Record<string, unknown> = {
      ready: readiness.ready,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      version: buildInfo.version
    };

    if (verboseParam.value === true) {
      const dependencyEntries = Object.entries(readiness.dependencies);
      payload.status = readiness.ready ? "ready" : "not_ready";
      payload.timestamp = new Date().toISOString();
      payload.dependencyCount = dependencyEntries.length;
      payload.unhealthyDependencies = dependencyEntries.filter(([, healthy]) => !healthy).map(([name]) => name);
    }

    sendJson(res, 200, payload);
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && endpoint === "/versionz") {
    if (req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

    sendJson(res, 200, {
      version: buildInfo.version,
      commit: buildInfo.commit,
      nodeVersion: buildInfo.nodeVersion
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

  if ((req.method === "GET" || req.method === "HEAD") && endpoint === "/build-lite") {
    if (req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

    sendJson(res, 200, {
      version: buildInfo.version,
      commit: buildInfo.commit
    });
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && endpoint === "/routes-hash") {
    const includeRoutesParam = parseBooleanQueryParam(requestUrl, "includeRoutes");
    if (includeRoutesParam.error) {
      sendJson(res, 400, { status: "error", message: "invalid_query_param", detail: includeRoutesParam.error });
      return;
    }

    if (req.method === "HEAD") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end();
      return;
    }

    const payload: {
      algorithm: "sha256";
      hash: string;
      routeCount?: number;
      routes?: string[];
    } = {
      algorithm: "sha256",
      hash: ROUTES_SIGNATURE_SHA256
    };

    if (includeRoutesParam.value === true) {
      payload.routeCount = ROUTES_SIGNATURE_ENTRIES.length;
      payload.routes = ROUTES_SIGNATURE_ENTRIES;
    }

    sendJson(res, 200, payload);
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && endpoint === "/openapi-lite") {
    const methodFilter = requestUrl.searchParams.get("method")?.trim().toUpperCase() ?? "";
    const pathPrefixFilter = requestUrl.searchParams.get("pathPrefix")?.trim() ?? "";
    const sortParse = parseSortOrderQueryParam(requestUrl, "sort");

    if (methodFilter.length > 0 && !["GET", "POST"].includes(methodFilter)) {
      sendJson(res, 400, {
        status: "error",
        message: "invalid_query_param",
        detail: "method must be GET or POST"
      });
      return;
    }

    if (sortParse.error) {
      sendJson(res, 400, {
        status: "error",
        message: "invalid_query_param",
        detail: sortParse.error
      });
      return;
    }

    const filteredEndpoints = OPENAPI_LITE_ENDPOINTS.filter((item) => {
      if (methodFilter.length > 0 && item.method !== methodFilter) return false;
      if (pathPrefixFilter.length > 0 && !item.path.startsWith(pathPrefixFilter)) return false;
      return true;
    });

    const sortOrder = sortParse.value;
    const endpoints = sortOrder
      ? [...filteredEndpoints].sort((a, b) => {
        const methodComparison = a.method.localeCompare(b.method);
        const pathComparison = a.path.localeCompare(b.path);
        if (sortOrder === "asc") {
          if (methodComparison !== 0) return methodComparison;
          return pathComparison;
        }
        if (methodComparison !== 0) return -methodComparison;
        return -pathComparison;
      })
      : filteredEndpoints;

    sendJson(res, 200, {
      openapi: "3.1.0-lite",
      info: {
        title: "ai-agent-demo HTTP API",
        version: buildInfo.version
      },
      filters: {
        method: methodFilter.length > 0 ? methodFilter : null,
        pathPrefix: pathPrefixFilter.length > 0 ? pathPrefixFilter : null,
        sort: sortOrder
      },
      endpointCount: endpoints.length,
      endpoints
    });
    return;
  }

  if (req.method === "POST" && endpoint === "/run") {
    const traceId = randomUUID();

    if (!isJsonContentType(req.headers["content-type"])) {
      sendJson(res, 415, {
        status: "error",
        message: "unsupported_media_type",
        traceId
      });
      return;
    }

    try {
      const payload = await readJsonBody(req, runBodyMaxBytes);
      const validation = validateTaskInput(payload);
      if (!validation.valid) {
        sendJson(res, 400, {
          status: "error",
          message: "invalid_payload",
          validationErrors: validation.errors,
          traceId
        });
        return;
      }

      const result = await orchestrator.run(payload as TaskInput);
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

      if (error instanceof PayloadTooLargeError) {
        sendJson(res, 413, {
          status: "error",
          message: "payload_too_large",
          maxBytes: runBodyMaxBytes,
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
  const runBodyMaxBytes = resolveRunBodyMaxBytes();

  const server = createHttpServer((req, res) => {
    route(req, res, orchestrator, startedAt, buildInfo, requestsByEndpoint, runBodyMaxBytes).catch((error) => {
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
      "Endpoints: GET /health | GET /healthz | GET /alivez | GET /livez | GET /healthz-lite | GET /echoz | GET /pingz | GET /stats | GET /timez | GET /uptimez | GET /readyz | GET /readyz-lite | GET /statusz | GET /versionz | GET /meta-lite | GET /metrics | GET /diag | GET /diag-lite | GET /build-info | GET /build-lite | GET /routes-hash | GET /openapi-lite | POST /run"
    );
  });
}
