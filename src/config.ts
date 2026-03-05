export interface AppConfig {
  retryAttempts: number;
  retryDelayMs: number;
  agentTimeoutMs: number;
  queueConcurrency: number;
  stateFile: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readLevel(): AppConfig["logLevel"] {
  const raw = process.env.LOG_LEVEL;
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

export function loadConfig(): AppConfig {
  return {
    retryAttempts: readInt("RETRY_ATTEMPTS", 2),
    retryDelayMs: readInt("RETRY_DELAY_MS", 30),
    agentTimeoutMs: readInt("AGENT_TIMEOUT_MS", 1_000),
    queueConcurrency: readInt("QUEUE_CONCURRENCY", 2),
    stateFile: process.env.STATE_FILE ?? ".data/orchestrator-state.json",
    logLevel: readLevel()
  };
}
