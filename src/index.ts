import { MultiAgentOrchestrator } from "./orchestrator.js";

async function main() {
  const orchestrator = new MultiAgentOrchestrator();

  const result = await orchestrator.run({
    id: "task-001",
    goal: "Criar um micro-serviço para sumarização de tickets"
  });

  console.log("=== DEMO MULTI-AGENTE ===");
  console.log(`Task: ${result.taskId}`);
  console.log("\nOrdem dos agentes:", result.steps.map((s) => s.agent).join(" -> "));
  console.log("\nResposta final:\n");
  console.log(result.finalAnswer);
}

main().catch((error) => {
  console.error("Falha na demo:", error);
  process.exit(1);
});
