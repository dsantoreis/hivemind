import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Basic executable example", () => {
  it("executa examples/run-enterprise-demo.sh com sucesso", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ai-agent-demo-example-"));
    const stateFile = join(tempDir, "state.json");

    const stdout = execFileSync("./examples/run-enterprise-demo.sh", [], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        STATE_FILE: stateFile
      }
    });

    expect(stdout).toContain("=== DEMO ENTERPRISE MULTI-AGENTE ===");
    expect(stdout).toContain("Métricas:");
  });
});
