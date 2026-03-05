import type { PersistedTaskRecord } from "../types.js";

export interface StateStore {
  get(key: string): Promise<PersistedTaskRecord | undefined>;
  upsert(record: PersistedTaskRecord): Promise<void>;
}
