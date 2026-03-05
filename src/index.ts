import { ReliableMultiAgentOrchestrator } from "./orchestrator.js";

async function main() {
  const orchestrator = ReliableMultiAgentOrchestrator.fromEnv();

  const result = await orchestrator.run({
    id: "task-001",
    goal: "Automatizar triagem de tickets enterprise com múltiplos agentes"
  });

  console.log("=== DEMO ENTERPRISE MULTI-AGENTE ===");
  console.log(`Task: ${result.taskId}`);
  console.log(`Coordenador: ${result.coordinator}`);
  console.log("Workers:", result.steps.map((s) => s.agent).join(" + "));
  console.log(`Cache hit: ${result.cached}`);
  console.log("\nResposta final:\n");
  console.log(result.finalAnswer);
  console.log("\nMétricas:\n");
  console.log(JSON.stringify(orchestrator.getMetricsSnapshot(), null, 2));
}

main().catch((error) => {
  console.error("Falha na demo:", error);
  process.exit(1);
});
