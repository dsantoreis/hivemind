export type AgentName = "planner" | "researcher" | "coder" | "reviewer";

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
  steps: AgentResult[];
  finalAnswer: string;
}
