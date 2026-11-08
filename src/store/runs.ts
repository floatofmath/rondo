import type { RoutineRun } from '../model/types';
import { db } from './db';

export interface RunRepository {
  save(run: RoutineRun): Promise<void>;
  /** The run still in progress, if any, for picking up after the app was closed. */
  findActive(): Promise<RoutineRun | undefined>;
  /** Ended runs, newest first. */
  listEnded(): Promise<RoutineRun[]>;
}

export const runRepository: RunRepository = {
  async save(run) {
    await db.runs.put(run);
  },
  async findActive() {
    const active = await db.runs.where('status').anyOf('running', 'paused').sortBy('startedAt');
    return active.at(-1);
  },
  async listEnded() {
    const ended = await db.runs.where('status').anyOf('done', 'abandoned').sortBy('startedAt');
    return ended.reverse();
  },
};

/** Asks Safari to keep our data. Failure is fine: home-screen apps are already exempt from eviction. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => undefined);
}
