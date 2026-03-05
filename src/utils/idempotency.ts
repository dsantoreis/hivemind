import { createHash } from "node:crypto";

export function buildIdempotencyKey(taskId: string, goal: string): string {
  return createHash("sha256").update(`${taskId}:${goal}`).digest("hex");
}
