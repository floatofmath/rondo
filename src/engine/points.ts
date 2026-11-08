import type { RoutineRun, StepRun } from '../model/types';
import { stepActualSeconds } from './run';

export interface RunPoints {
  steps: number;
  routine: number;
  bonus: number;
  total: number;
}

const NO_POINTS: RunPoints = { steps: 0, routine: 0, bonus: 0, total: 0 };

function isCompleted(step: StepRun): boolean {
  return step.endedAt !== undefined && !step.skipped;
}

export function stepPoints(step: StepRun): number {
  return isCompleted(step) ? step.points : 0;
}

/** All steps completed, none skipped, and every timed step within its plan. */
export function isOnTime(run: RoutineRun): boolean {
  return (
    run.status === 'done' &&
    run.stepRuns.every(
      (step) =>
        isCompleted(step) &&
        (step.type === 'checkbox' || stepActualSeconds(step) <= step.plannedSeconds),
    )
  );
}

export function runPoints(run: RoutineRun): RunPoints {
  if (!run.rewarded) return NO_POINTS;
  const steps = run.stepRuns.reduce((sum, step) => sum + stepPoints(step), 0);
  const routine = run.status === 'done' ? run.pointsOnComplete : 0;
  const bonus = isOnTime(run) ? run.onTimeBonus : 0;
  return { steps, routine, bonus, total: steps + routine + bonus };
}

function sameLocalDay(a: number, b: number): boolean {
  const dayA = new Date(a);
  const dayB = new Date(b);
  return (
    dayA.getFullYear() === dayB.getFullYear() &&
    dayA.getMonth() === dayB.getMonth() &&
    dayA.getDate() === dayB.getDate()
  );
}

/** Whether a run started at `at` still earns points, given the routine's earlier runs. */
export function isRewarded(
  routineId: string,
  maxRewardedRunsPerDay: number,
  at: number,
  priorRuns: readonly RoutineRun[],
): boolean {
  const rewardedToday = priorRuns.filter(
    (run) =>
      run.routineId === routineId &&
      run.status === 'done' &&
      run.rewarded &&
      sameLocalDay(run.startedAt, at),
  ).length;
  return rewardedToday < maxRewardedRunsPerDay;
}
