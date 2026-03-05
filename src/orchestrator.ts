import { workerBuild, workerResearch } from "./agents.js";
import type { Task, WorkflowResult } from "./types.js";

export class MultiAgentOrchestrator {
  private readonly coordinatorName = "coordinator";

  async run(task: Task): Promise<WorkflowResult> {
    const [research, build] = await Promise.all([
      workerResearch(task),
      workerBuild(task)
    ]);

    const finalAnswer = [
      `${this.coordinatorName}: objetivo recebido -> ${task.goal}`,
      `${research.agent}: ${research.output}`,
      `${build.agent}: ${build.output}`,
      `${this.coordinatorName}: decisão -> executar MVP com observabilidade simples.`
    ].join("\n");

    return {
      taskId: task.id,
      coordinator: this.coordinatorName,
      steps: [research, build],
      finalAnswer
    };
  }
}
