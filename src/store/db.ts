import Dexie, { type Table } from 'dexie';
import type { RoutineRun } from '../model/types';

class RondoDb extends Dexie {
  runs!: Table<RoutineRun, string>;

  constructor() {
    super('rondo');
    // Dexie versions follow SCHEMA_VERSION in src/model/types.ts.
    this.version(1).stores({ runs: 'id, routineId, startedAt, status' });
  }
}

export const db = new RondoDb();
