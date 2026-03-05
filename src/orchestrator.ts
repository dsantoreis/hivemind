import { coder, planner, researcher, reviewer } from "./agents.js";
import type { Task, WorkflowResult } from "./types.js";

export class MultiAgentOrchestrator {
  async run(task: Task): Promise<WorkflowResult> {
    const steps = [];

    const plan = await planner(task);
    steps.push(plan);

    const research = await researcher(task, plan.output);
    steps.push(research);

    const implementation = await coder(task, research.output);
    steps.push(implementation);

    const review = await reviewer(task, implementation.output);
    steps.push(review);

    const finalAnswer = [
      `Objetivo: ${task.goal}`,
      `Plano: ${plan.output}`,
      `Pesquisa: ${research.output}`,
      `Código: ${implementation.output}`,
      `Revisão: ${review.output}`
    ].join("\n");

    return {
      taskId: task.id,
      steps,
      finalAnswer
    };
  }
}
