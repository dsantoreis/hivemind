import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PersistedTaskRecord } from "../types.js";
import type { StateStore } from "./state-store.js";

interface StateShape {
  tasks: Record<string, PersistedTaskRecord>;
}

export class FileStateStore implements StateStore {
  constructor(private readonly filePath: string) {}

  async get(key: string): Promise<PersistedTaskRecord | undefined> {
    const state = await this.readState();
    return state.tasks[key];
  }

  async upsert(record: PersistedTaskRecord): Promise<void> {
    const state = await this.readState();
    state.tasks[record.idempotencyKey] = record;
    await this.writeState(state);
  }

  private async readState(): Promise<StateShape> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as StateShape;
    } catch {
      return { tasks: {} };
    }
  }

  private async writeState(state: StateShape): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(state, null, 2), "utf8");
  }
}
