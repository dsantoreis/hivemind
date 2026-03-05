import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadConfig", () => {
  it("deve ignorar valores inválidos negativos e manter fallback seguro", () => {
    vi.stubEnv("RETRY_ATTEMPTS", "-2");
    vi.stubEnv("AGENT_TIMEOUT_MS", "-10");
    vi.stubEnv("QUEUE_CONCURRENCY", "0");

    const config = loadConfig();

    expect(config.retryAttempts).toBe(2);
    expect(config.agentTimeoutMs).toBe(1000);
    expect(config.queueConcurrency).toBe(2);
  });

  it("deve aceitar RETRY_DELAY_MS igual a zero", () => {
    vi.stubEnv("RETRY_DELAY_MS", "0");

    const config = loadConfig();

    expect(config.retryDelayMs).toBe(0);
  });
});
