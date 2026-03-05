export type AgentName = "worker-research" | "worker-build";

export interface Task {
  id: string;
  goal: string;
}

export interface AgentResult {
  agent: AgentName;
  output: string;
}

export interface WorkflowResult {
  taskId: string;
  coordinator: string;
  steps: AgentResult[];
  finalAnswer: string;
}
