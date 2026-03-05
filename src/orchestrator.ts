import { BuildAgent, ResearchAgent, type Agent } from "./agents/agents.js";
import type { AppConfig } from "./config.js";
import { loadConfig } from "./config.js";
import { withRetry } from "./core/retry.js";
import { withTimeout } from "./core/timeout.js";
import { StructuredLogger } from "./observability/logger.js";
import { MetricsRegistry } from "./observability/metrics.js";
import { InMemoryQueue } from "./queue/in-memory-queue.js";
import { FileStateStore } from "./state/file-state-store.js";
import type { StateStore } from "./state/state-store.js";
import type { AgentResult, OrchestratedTask, TaskInput, WorkflowResult } from "./types.js";
import { buildIdempotencyKey } from "./utils/idempotency.js";

interface Dependencies {
  config: AppConfig;
  logger: StructuredLogger;
  metrics: MetricsRegistry;
  stateStore: StateStore;
  queue: InMemoryQueue<OrchestratedTask>;
  agents: Agent[];
}

export class ReliableMultiAgentOrchestrator {
  private readonly coordinatorName = "coordinator";

  constructor(private readonly deps: Dependencies) {}

  static fromEnv(overrides: Partial<Dependencies> = {}) {
    const config = overrides.config ?? loadConfig();

    return new ReliableMultiAgentOrchestrator({
      config,
      logger: overrides.logger ?? new StructuredLogger(config.logLevel),
      metrics: overrides.metrics ?? new MetricsRegistry(),
      stateStore: overrides.stateStore ?? new FileStateStore(config.stateFile),
      queue: overrides.queue ?? new InMemoryQueue<OrchestratedTask>(),
      agents: overrides.agents ?? [new ResearchAgent(), new BuildAgent()]
    });
  }

  getMetricsSnapshot() {
    return this.deps.metrics.snapshot();
  }

  async run(taskInput: TaskInput): Promise<WorkflowResult> {
    const taskId = taskInput.id ?? `task-${Date.now()}`;
    const idempotencyKey = buildIdempotencyKey(taskId, taskInput.goal);
    const task: OrchestratedTask = {
      id: taskId,
      goal: taskInput.goal,
      context: taskInput.context ?? {},
      idempotencyKey
    };

    const cached = await this.deps.stateStore.get(idempotencyKey);
    if (cached?.status === "completed" && cached.result) {
      this.deps.logger.info("Returning cached result", { taskId, idempotencyKey });
      this.deps.metrics.increment("idempotency_hits_total");
      return { ...cached.result, cached: true };
    }

    this.deps.queue.enqueue(task);
    this.deps.metrics.increment("queue_enqueued_total");

    const dequeued = this.deps.queue.dequeue();
    if (!dequeued) throw new Error("Queue unexpectedly empty");

    return this.processTask(dequeued);
  }

  private async processTask(task: OrchestratedTask): Promise<WorkflowResult> {
    const startedAt = Date.now();

    await this.deps.stateStore.upsert({
      idempotencyKey: task.idempotencyKey,
      taskId: task.id,
      status: "processing",
      updatedAt: new Date().toISOString()
    });

    this.deps.logger.info("Task processing started", { taskId: task.id, idempotencyKey: task.idempotencyKey });

    try {
      const results = await Promise.all(this.deps.agents.map((agent) => this.executeAgent(agent, task)));

      const finalAnswer = [
        `${this.coordinatorName}: objetivo recebido -> ${task.goal}`,
        ...results.map((r) => `${r.agent}: ${r.output}`),
        `${this.coordinatorName}: decisão -> executar roadmap em fases com rollback automático.`
      ].join("\n");

      const workflow: WorkflowResult = {
        taskId: task.id,
        coordinator: this.coordinatorName,
        steps: results,
        finalAnswer,
        cached: false
      };

      await this.deps.stateStore.upsert({
        idempotencyKey: task.idempotencyKey,
        taskId: task.id,
        status: "completed",
        result: workflow,
        updatedAt: new Date().toISOString()
      });

      const duration = Date.now() - startedAt;
      this.deps.metrics.increment("tasks_completed_total");
      this.deps.metrics.observeDuration("task_duration_ms", duration);

      this.deps.logger.info("Task processing completed", {
        taskId: task.id,
        durationMs: duration,
        agents: results.map((x) => x.agent)
      });

      return workflow;
    } catch (error) {
      this.deps.metrics.increment("tasks_failed_total");
      await this.deps.stateStore.upsert({
        idempotencyKey: task.idempotencyKey,
        taskId: task.id,
        status: "failed",
        error: (error as Error).message,
        updatedAt: new Date().toISOString()
      });

      this.deps.logger.error("Task processing failed", {
        taskId: task.id,
        error: (error as Error).message
      });

      throw error;
    }
  }

  private async executeAgent(agent: Agent, task: OrchestratedTask): Promise<AgentResult> {
    const startedAt = Date.now();

    const { value, attempts } = await withRetry(
      () => withTimeout(agent.run(task), this.deps.config.agentTimeoutMs, agent.name),
      {
        attempts: this.deps.config.retryAttempts,
        delayMs: this.deps.config.retryDelayMs
      }
    );

    const duration = Date.now() - startedAt;

    this.deps.metrics.increment("agent_success_total");
    this.deps.metrics.observeDuration(`agent_duration_${agent.name}_ms`, duration);

    return {
      agent: agent.name,
      output: value,
      attempts,
      durationMs: duration
    };
  }
}
