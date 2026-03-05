import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("CLI smoke", () => {
  it("executa a demo enterprise e imprime métricas", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ai-agent-demo-"));
    const stateFile = join(tempDir, "state.json");

    const stdout = execFileSync("npm", ["run", "demo", "--silent"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        STATE_FILE: stateFile
      }
    });

    expect(stdout).toContain("=== DEMO ENTERPRISE MULTI-AGENTE ===");
    expect(stdout).toContain("Coordenador: coordinator");
    expect(stdout).toContain("Workers: worker-research + worker-build");
    expect(stdout).toContain("Métricas:");
    expect(stdout).toContain("tasks_completed_total");
  });
});
