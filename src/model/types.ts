/** Bump with a migration whenever a stored shape changes. Export files carry this value. */
export const SCHEMA_VERSION = 1;

export type Icon = { kind: 'emoji' | 'lib' | 'photo'; value: string };

export type StepType = 'timed' | 'checkbox' | 'cycle';

export interface Profile {
  id: string;
  name: string;
  avatar: Icon;
  colour: string;
  pinHash?: string;
}

export interface Step {
  id: string;
  order: number;
  name: string;
  icon: Icon;
  type: StepType;
  plannedSeconds: number;
  earliestDoneSeconds: number;
  points: number;
  cycleCount?: number;
  workSeconds?: number;
  breakSeconds?: number;
}

export interface Routine {
  id: string;
  profileId: string;
  name: string;
  icon: Icon;
  colour: string;
  order: number;
  pointsOnComplete: number;
  onTimeBonus: number;
  maxRewardedRunsPerDay: number;
  /** Local clock time, "HH:MM". Display only; it never alters durations. */
  targetEndTime?: string;
  steps: Step[];
}

/** One step inside a run. Its plan is frozen at run start, so later edits cannot change history. */
export interface StepRun {
  stepId: string;
  name: string;
  icon: Icon;
  type: StepType;
  plannedSeconds: number;
  earliestDoneSeconds: number;
  points: number;
  startedAt?: number;
  endedAt?: number;
  /** Set while the step's clock is stopped: the run is paused, or the child went back past it. */
  pausedAt?: number;
  pausedSecondsAccum: number;
  skipped: boolean;
}

export type RunStatus = 'running' | 'paused' | 'done' | 'abandoned';

export interface RoutineRun {
  id: string;
  routineId: string;
  routineName: string;
  routineIcon: Icon;
  routineColour: string;
  targetEndTime?: string;
  pointsOnComplete: number;
  onTimeBonus: number;
  maxRewardedRunsPerDay: number;
  startedAt: number;
  endedAt?: number;
  status: RunStatus;
  rewarded: boolean;
  currentStepIndex: number;
  stepRuns: StepRun[];
}

export type LedgerReason = 'step' | 'routine' | 'bonus' | 'redemption' | 'adjustment';

export interface LedgerEntry {
  id: string;
  profileId: string;
  at: number;
  delta: number;
  reason: LedgerReason;
  refId?: string;
  note?: string;
}

export interface Goal {
  id: string;
  profileId: string;
  kind: 'surprise' | 'range' | 'specific';
  threshold: number;
  label?: string;
  status: 'active' | 'pending' | 'achieved';
}
