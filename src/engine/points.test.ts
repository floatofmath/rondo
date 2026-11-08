import { describe, expect, it } from 'vitest';
import type { Routine, RoutineRun } from '../model/types';
import { morning } from '../model/seed';
import { isOnTime, isRewarded, runPoints, stepPoints } from './points';
import { abandon, completeStep, createRun, goBack, pause, resume, skipStep } from './run';

const T0 = new Date(2026, 10, 8, 7, 0, 0).getTime();
const sec = (s: number) => T0 + s * 1000;

const routine: Routine = {
  ...morning,
  pointsOnComplete: 20,
  onTimeBonus: 7,
  steps: [
    { ...morning.steps[0]!, id: 'check', order: 0, points: 5 },
    { ...morning.steps[1]!, id: 'a', order: 1, plannedSeconds: 100, earliestDoneSeconds: 0, points: 10 },
    { ...morning.steps[2]!, id: 'b', order: 2, plannedSeconds: 100, earliestDoneSeconds: 0, points: 3 },
  ],
};

function finishedWithin(): RoutineRun {
  let run = createRun(routine, T0);
  run = completeStep(run, sec(1));
  run = completeStep(run, sec(50));
  return completeStep(run, sec(100));
}

describe('step points', () => {
  it('pays on complete', () => {
    expect(stepPoints(finishedWithin().stepRuns[1]!)).toBe(10);
  });

  it('pays nothing on skip', () => {
    expect(stepPoints(skipStep(createRun(routine, T0), sec(1)).stepRuns[0]!)).toBe(0);
  });

  it('pays nothing for an unfinished step', () => {
    expect(stepPoints(createRun(routine, T0).stepRuns[0]!)).toBe(0);
  });

  it('pays nothing for a reopened step until it is completed again', () => {
    const back = goBack(completeStep(createRun(routine, T0), sec(1)), sec(2));
    expect(stepPoints(back.stepRuns[0]!)).toBe(0);
  });
});

describe('routine points', () => {
  it('pays on done', () => {
    expect(runPoints(finishedWithin()).routine).toBe(20);
  });

  it('pays nothing when every step was skipped, though the run is done', () => {
    let run = createRun(routine, T0);
    run = skipStep(skipStep(skipStep(run, sec(1)), sec(2)), sec(3));
    expect(run.status).toBe('done');
    expect(runPoints(run)).toEqual({ steps: 0, routine: 0, bonus: 0, total: 0 });
  });

  it('pays routine points when at least one step was completed', () => {
    let run = createRun(routine, T0);
    run = completeStep(run, sec(1));
    run = skipStep(skipStep(run, sec(2)), sec(3));
    expect(runPoints(run)).toEqual({ steps: 5, routine: 20, bonus: 0, total: 25 });
  });

  it('pays no routine points before done', () => {
    const run = completeStep(createRun(routine, T0), sec(1));
    expect(runPoints(run)).toEqual({ steps: 5, routine: 0, bonus: 0, total: 5 });
  });

  it('pays nothing for an abandoned run, even for completed steps', () => {
    const run = abandon(completeStep(createRun(routine, T0), sec(1)), sec(2));
    expect(runPoints(run).total).toBe(0);
  });

  it('totals steps, routine and bonus', () => {
    expect(runPoints(finishedWithin())).toEqual({ steps: 18, routine: 20, bonus: 7, total: 45 });
  });
});

describe('on-time bonus', () => {
  it('pays when no step is skipped and every step is within plan', () => {
    expect(isOnTime(finishedWithin())).toBe(true);
  });

  it('pays at exactly the planned time', () => {
    let run = createRun(routine, T0);
    run = completeStep(run, sec(1));
    run = completeStep(run, sec(101));
    run = completeStep(run, sec(201));
    expect(isOnTime(run)).toBe(true);
  });

  it('is lost when any step is skipped', () => {
    let run = createRun(routine, T0);
    run = completeStep(run, sec(1));
    run = skipStep(run, sec(2));
    run = completeStep(run, sec(3));
    expect(isOnTime(run)).toBe(false);
    expect(runPoints(run).bonus).toBe(0);
    expect(runPoints(run).routine).toBe(20);
    expect(runPoints(run).steps).toBe(8);
  });

  it('is lost when any step runs over plan', () => {
    let run = createRun(routine, T0);
    run = completeStep(run, sec(1));
    run = completeStep(run, sec(102));
    run = completeStep(run, sec(103));
    expect(isOnTime(run)).toBe(false);
  });

  it('excludes paused time from the plan check', () => {
    let run = createRun(routine, T0);
    run = completeStep(run, sec(1));
    run = resume(pause(run, sec(50)), sec(500));
    run = completeStep(run, sec(510));
    run = completeStep(run, sec(520));
    expect(isOnTime(run)).toBe(true);
  });

  it('does not hold a slow checkbox step against the run', () => {
    let run = createRun(routine, T0);
    run = completeStep(run, sec(500));
    run = completeStep(run, sec(510));
    run = completeStep(run, sec(520));
    expect(isOnTime(run)).toBe(true);
  });

  it('is not paid before the run is done', () => {
    expect(isOnTime(completeStep(createRun(routine, T0), sec(1)))).toBe(false);
  });
});

describe('daily reward cap', () => {
  const rewardedDone = (at: number, overrides: Partial<RoutineRun> = {}): RoutineRun => ({
    ...createRun(routine, at),
    status: 'done',
    endedAt: at + 1000,
    ...overrides,
  });

  it('rewards the first run of the day', () => {
    expect(isRewarded('morning', 1, T0, [])).toBe(true);
  });

  it('does not reward once the cap is reached that local day', () => {
    expect(isRewarded('morning', 1, sec(3600), [rewardedDone(T0)])).toBe(false);
  });

  it('allows runs up to a higher cap', () => {
    const first = rewardedDone(T0);
    expect(isRewarded('morning', 2, sec(100), [first])).toBe(true);
    expect(isRewarded('morning', 2, sec(100), [first, rewardedDone(sec(50))])).toBe(false);
  });

  it('resets at local midnight', () => {
    const lateEvening = new Date(2026, 10, 8, 23, 59, 0).getTime();
    const earlyMorning = new Date(2026, 10, 9, 0, 1, 0).getTime();
    expect(isRewarded('morning', 1, earlyMorning, [rewardedDone(lateEvening)])).toBe(true);
  });

  it('counts each routine separately', () => {
    expect(isRewarded('evening', 1, sec(100), [rewardedDone(T0)])).toBe(true);
  });

  it('ignores abandoned and unrewarded runs', () => {
    const prior = [
      rewardedDone(T0, { status: 'abandoned', rewarded: false }),
      rewardedDone(T0, { rewarded: false }),
    ];
    expect(isRewarded('morning', 1, sec(100), prior)).toBe(true);
  });

  it('pays nothing on a run marked rewarded=false, but the run still counts as done', () => {
    const run = { ...finishedWithin(), rewarded: false };
    expect(run.status).toBe('done');
    expect(runPoints(run)).toEqual({ steps: 0, routine: 0, bonus: 0, total: 0 });
  });
});
