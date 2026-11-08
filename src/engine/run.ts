import type { Routine, RoutineRun, StepRun } from '../model/types';

export type RunState = RoutineRun;

/** A paused or forgotten run older than this is reported as stale. */
export const STALE_AFTER_SECONDS = 12 * 60 * 60;

/** A step finished this far under plan counts as early rather than on time. */
const EARLY_FRACTION = 0.9;

export type ViewStatus = RoutineRun['status'] | 'stale';
export type StepPhase = 'pending' | 'current' | 'completed' | 'skipped';
export type StepMark = 'early' | 'onTime' | 'over';

export interface StepView {
  stepId: string;
  name: string;
  icon: StepRun['icon'];
  timed: boolean;
  phase: StepPhase;
  plannedSeconds: number;
  elapsedSeconds: number;
  /** Negative when over plan, never clamped. Always 0 for a checkbox, which has no timer. */
  remainingSeconds: number;
  /** Clamped to 0..1, for drawing only. */
  fractionRemaining: number;
  /** Set once the step is completed. */
  mark?: StepMark;
}

export interface RunView {
  stepIndex: number;
  remainingSeconds: number;
  fractionRemaining: number;
  routineElapsed: number;
  routinePlanned: number;
  canComplete: boolean;
  status: ViewStatus;
  stepViews: StepView[];
}

export type CueEvent = 'halfTime' | 'oneMinute' | 'stepEnd' | 'routineEnd';

export function routinePlannedSeconds(routine: Routine): number {
  return routine.steps.reduce((sum, step) => sum + step.plannedSeconds, 0);
}

export function createRun(routine: Routine, now: number): RunState {
  const stepRuns = [...routine.steps]
    .sort((a, b) => a.order - b.order)
    .map(
      (step): StepRun => ({
        stepId: step.id,
        name: step.name,
        icon: step.icon,
        type: step.type,
        plannedSeconds: step.plannedSeconds,
        earliestDoneSeconds: step.earliestDoneSeconds,
        points: step.points,
        pausedSecondsAccum: 0,
        skipped: false,
      }),
    );
  if (stepRuns.length === 0) throw new Error('Routine has no steps');

  return {
    id: `${routine.id}-${now}`,
    routineId: routine.id,
    routineName: routine.name,
    routineIcon: routine.icon,
    routineColour: routine.colour,
    targetEndTime: routine.targetEndTime,
    pointsOnComplete: routine.pointsOnComplete,
    onTimeBonus: routine.onTimeBonus,
    maxRewardedRunsPerDay: routine.maxRewardedRunsPerDay,
    startedAt: now,
    status: 'running',
    rewarded: true,
    currentStepIndex: 0,
    stepRuns: replaceAt(stepRuns, 0, enter(stepRuns[0]!, now)),
  };
}

export function tick(state: RunState, now: number): RunView {
  const stepViews = state.stepRuns.map((step, i) => viewStep(step, i, state, now));
  const current = stepViews[state.currentStepIndex]!;
  const step = state.stepRuns[state.currentStepIndex]!;
  const status = viewStatus(state, step, now);

  return {
    stepIndex: state.currentStepIndex,
    remainingSeconds: current.remainingSeconds,
    fractionRemaining: current.fractionRemaining,
    routineElapsed: roundMs(stepViews.reduce((sum, s) => sum + s.elapsedSeconds, 0)),
    routinePlanned: state.stepRuns.reduce((sum, s) => sum + s.plannedSeconds, 0),
    canComplete: status === 'running' && meetsEarliestDone(step, current.elapsedSeconds),
    status,
    stepViews,
  };
}

export function completeStep(state: RunState, now: number): RunState {
  assertActive(state);
  const step = currentStep(state);
  if (state.status === 'paused') throw new Error('Cannot complete a step while paused');
  if (!meetsEarliestDone(step, stepElapsedSeconds(step, now))) {
    throw new Error(`Step "${step.name}" cannot be completed yet`);
  }
  return advance(state, { ...close(step, now), skipped: false }, now);
}

export function skipStep(state: RunState, now: number): RunState {
  assertActive(state);
  return advance(state, { ...close(currentStep(state), now), skipped: true }, now);
}

export function pause(state: RunState, now: number): RunState {
  assertActive(state);
  if (state.status === 'paused') return state;
  const step = currentStep(state);
  return {
    ...state,
    status: 'paused',
    stepRuns: replaceAt(state.stepRuns, state.currentStepIndex, { ...step, pausedAt: now }),
  };
}

export function resume(state: RunState, now: number): RunState {
  assertActive(state);
  if (state.status !== 'paused') return state;
  return {
    ...state,
    status: 'running',
    stepRuns: replaceAt(state.stepRuns, state.currentStepIndex, enter(currentStep(state), now)),
  };
}

/**
 * Returns to the previous step. Its elapsed time is preserved: the gap since it ended counts as
 * paused. The step being left stops its clock and continues from there when reached again.
 */
export function goBack(state: RunState, now: number): RunState {
  assertActive(state);
  const index = state.currentStepIndex;
  if (index === 0) return state;

  const left = currentStep(state);
  const previous = state.stepRuns[index - 1]!;
  const gapSeconds = previous.endedAt === undefined ? 0 : (now - previous.endedAt) / 1000;
  const reopened: StepRun = {
    ...previous,
    endedAt: undefined,
    skipped: false,
    pausedSecondsAccum: previous.pausedSecondsAccum + gapSeconds,
  };

  const stepRuns = replaceAt(state.stepRuns, index, { ...left, pausedAt: left.pausedAt ?? now });
  return {
    ...state,
    status: 'running',
    currentStepIndex: index - 1,
    stepRuns: replaceAt(stepRuns, index - 1, reopened),
  };
}

export function abandon(state: RunState, now: number): RunState {
  assertActive(state);
  return {
    ...state,
    status: 'abandoned',
    endedAt: now,
    rewarded: false,
    stepRuns: replaceAt(state.stepRuns, state.currentStepIndex, close(currentStep(state), now)),
  };
}

/** Cues crossed between two views. Each fires once per step, because a step's elapsed never falls. */
export function cueEvents(prev: RunView, next: RunView): CueEvent[] {
  const events: CueEvent[] = [];
  const step = next.stepViews[next.stepIndex];

  if (step?.timed && prev.stepIndex === next.stepIndex && next.status !== 'stale') {
    const thresholds: { cue: CueEvent; remaining: number }[] = [
      { cue: 'halfTime', remaining: step.plannedSeconds / 2 },
    ];
    if (step.plannedSeconds > 60) thresholds.push({ cue: 'oneMinute', remaining: 60 });
    thresholds.push({ cue: 'stepEnd', remaining: 0 });
    thresholds.sort((a, b) => b.remaining - a.remaining);

    for (const { cue, remaining } of thresholds) {
      if (prev.remainingSeconds > remaining && next.remainingSeconds <= remaining) {
        events.push(cue);
      }
    }
  }

  if (prev.status !== 'done' && next.status === 'done') events.push('routineEnd');
  return events;
}

/** Seconds a finished step took, excluding paused time. */
export function stepActualSeconds(step: StepRun): number {
  return stepElapsedSeconds(step, step.endedAt ?? step.pausedAt ?? step.startedAt ?? 0);
}

function viewStep(step: StepRun, index: number, state: RunState, now: number): StepView {
  const timed = step.type !== 'checkbox';
  const elapsedSeconds = stepElapsedSeconds(step, now);
  const remainingSeconds = timed ? roundMs(step.plannedSeconds - elapsedSeconds) : 0;
  const fractionRemaining =
    timed && step.plannedSeconds > 0
      ? Math.min(1, Math.max(0, remainingSeconds / step.plannedSeconds))
      : timed
        ? 0
        : 1;
  const phase = stepPhase(step, index, state);
  return {
    stepId: step.stepId,
    name: step.name,
    icon: step.icon,
    timed,
    phase,
    plannedSeconds: step.plannedSeconds,
    elapsedSeconds,
    remainingSeconds,
    fractionRemaining,
    mark: phase === 'completed' ? stepMark(step, elapsedSeconds) : undefined,
  };
}

function stepPhase(step: StepRun, index: number, state: RunState): StepPhase {
  if (step.skipped) return 'skipped';
  if (step.endedAt !== undefined && index !== state.currentStepIndex) return 'completed';
  if (step.endedAt !== undefined && state.status === 'done') return 'completed';
  if (index === state.currentStepIndex) return 'current';
  return 'pending';
}

function stepMark(step: StepRun, elapsedSeconds: number): StepMark {
  if (step.type === 'checkbox') return 'onTime';
  if (elapsedSeconds > step.plannedSeconds) return 'over';
  return elapsedSeconds < step.plannedSeconds * EARLY_FRACTION ? 'early' : 'onTime';
}

function viewStatus(state: RunState, step: StepRun, now: number): ViewStatus {
  if (state.status === 'done' || state.status === 'abandoned') return state.status;
  const idleSeconds =
    state.status === 'paused' && step.pausedAt !== undefined
      ? (now - step.pausedAt) / 1000
      : stepElapsedSeconds(step, now);
  return idleSeconds > STALE_AFTER_SECONDS ? 'stale' : state.status;
}

function meetsEarliestDone(step: StepRun, elapsedSeconds: number): boolean {
  return step.earliestDoneSeconds <= 0 || elapsedSeconds >= step.earliestDoneSeconds;
}

function stepElapsedSeconds(step: StepRun, now: number): number {
  if (step.startedAt === undefined) return 0;
  const end = step.endedAt ?? step.pausedAt ?? now;
  return Math.max(0, roundMs((end - step.startedAt) / 1000 - step.pausedSecondsAccum));
}

/** Starts a step, or restarts its clock if it was stopped. */
function enter(step: StepRun, now: number): StepRun {
  if (step.startedAt === undefined) return { ...step, startedAt: now };
  return closePause(step, now);
}

function close(step: StepRun, now: number): StepRun {
  return { ...closePause(step, now), endedAt: now };
}

function closePause(step: StepRun, now: number): StepRun {
  if (step.pausedAt === undefined) return step;
  return {
    ...step,
    pausedAt: undefined,
    pausedSecondsAccum: step.pausedSecondsAccum + (now - step.pausedAt) / 1000,
  };
}

function advance(state: RunState, finished: StepRun, now: number): RunState {
  const index = state.currentStepIndex;
  const stepRuns = replaceAt(state.stepRuns, index, finished);
  if (index === stepRuns.length - 1) {
    return { ...state, status: 'done', endedAt: now, stepRuns };
  }
  return {
    ...state,
    status: 'running',
    currentStepIndex: index + 1,
    stepRuns: replaceAt(stepRuns, index + 1, enter(stepRuns[index + 1]!, now)),
  };
}

function currentStep(state: RunState): StepRun {
  return state.stepRuns[state.currentStepIndex]!;
}

function assertActive(state: RunState): void {
  if (state.status === 'done' || state.status === 'abandoned') {
    throw new Error(`Run has already ended (${state.status})`);
  }
}

function replaceAt<T>(items: T[], index: number, item: T): T[] {
  return items.map((existing, i) => (i === index ? item : existing));
}

/** Pause totals are sums of fractions; rounding to the millisecond keeps thresholds exact. */
function roundMs(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}
