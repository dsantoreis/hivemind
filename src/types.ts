export type AgentName = "worker-research" | "worker-build";

export interface TaskInput {
  id?: string;
  goal: string;
  context?: Record<string, string>;
}

export interface OrchestratedTask {
  id: string;
  goal: string;
  idempotencyKey: string;
  context: Record<string, string>;
}

export interface AgentResult {
  agent: AgentName;
  output: string;
  attempts: number;
  durationMs: number;
}

export interface WorkflowResult {
  taskId: string;
  coordinator: string;
  steps: AgentResult[];
  finalAnswer: string;
  cached: boolean;
}

export type TaskStatus = "queued" | "processing" | "completed" | "failed";

export interface PersistedTaskRecord {
  idempotencyKey: string;
  taskId: string;
  status: TaskStatus;
  result?: WorkflowResult;
  error?: string;
  updatedAt: string;
}
