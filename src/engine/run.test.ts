import { describe, expect, it } from 'vitest';
import { evening, morning, routines, study } from '../model/seed';
import type { Routine } from '../model/types';
import { formatDuration, formatRemaining } from './format';
import {
  abandon,
  completeStep,
  createRun,
  cueEvents,
  goBack,
  pause,
  postponeStep,
  resume,
  routinePlannedSeconds,
  skipStep,
  stepActualSeconds,
  tick,
  type CueEvent,
  type RunState,
} from './run';

const T0 = 1_700_000_000_000;
const sec = (s: number) => T0 + s * 1000;

function step(id: string, plannedSeconds: number, earliestDoneSeconds = 0): Routine['steps'][number] {
  return {
    id,
    order: 0,
    name: id,
    icon: { kind: 'emoji', value: '•' },
    type: 'timed',
    plannedSeconds,
    earliestDoneSeconds,
    points: 10,
  };
}

function routineOf(...steps: Routine['steps']): Routine {
  return { ...morning, steps: steps.map((s, order) => ({ ...s, order })) };
}

const threeSteps = routineOf(step('a', 180, 90), step('b', 120, 30), step('c', 300));

describe('remaining time', () => {
  it('equals planned at start', () => {
    const view = tick(createRun(threeSteps, T0), T0);
    expect(view.remainingSeconds).toBe(180);
    expect(view.fractionRemaining).toBe(1);
  });

  it('decreases with the clock', () => {
    const view = tick(createRun(threeSteps, T0), sec(45));
    expect(view.remainingSeconds).toBe(135);
    expect(view.fractionRemaining).toBe(0.75);
  });

  it('goes negative past planned and is never clamped', () => {
    expect(tick(createRun(threeSteps, T0), sec(260)).remainingSeconds).toBe(-80);
  });

  it('clamps fractionRemaining to 0 when over', () => {
    expect(tick(createRun(threeSteps, T0), sec(260)).fractionRemaining).toBe(0);
  });

  it('is derived from timestamps, so tick does not change state', () => {
    const run = createRun(threeSteps, T0);
    const before = structuredClone(run);
    tick(run, sec(50));
    tick(run, sec(10));
    expect(run).toEqual(before);
    expect(tick(run, sec(10)).remainingSeconds).toBe(170);
  });

  it('survives a long gap between ticks, as when the phone is locked', () => {
    const run = createRun(threeSteps, T0);
    tick(run, sec(1));
    expect(tick(run, sec(181)).remainingSeconds).toBe(-1);
  });

  it('freezes planned durations at run start', () => {
    const editable = routineOf(step('a', 180));
    const run = createRun(editable, T0);
    editable.steps[0]!.plannedSeconds = 10;
    expect(tick(run, T0).remainingSeconds).toBe(180);
  });
});

describe('pause and resume', () => {
  it('pause freezes remaining', () => {
    const paused = pause(createRun(threeSteps, T0), sec(30));
    expect(tick(paused, sec(30)).remainingSeconds).toBe(150);
    expect(tick(paused, sec(500)).remainingSeconds).toBe(150);
    expect(tick(paused, sec(500)).status).toBe('paused');
  });

  it('resume continues from the frozen value', () => {
    const run = resume(pause(createRun(threeSteps, T0), sec(30)), sec(90));
    expect(tick(run, sec(90)).remainingSeconds).toBe(150);
    expect(tick(run, sec(100)).remainingSeconds).toBe(140);
    expect(tick(run, sec(100)).status).toBe('running');
  });

  it('multiple pauses accumulate', () => {
    let run = createRun(threeSteps, T0);
    run = resume(pause(run, sec(10)), sec(20));
    run = resume(pause(run, sec(30)), sec(50));
    expect(run.stepRuns[0]!.pausedSecondsAccum).toBe(30);
    expect(tick(run, sec(60)).remainingSeconds).toBe(150);
  });

  it('pausing twice keeps the first pause time', () => {
    const run = pause(pause(createRun(threeSteps, T0), sec(10)), sec(20));
    expect(tick(run, sec(30)).remainingSeconds).toBe(170);
  });

  it('resume without a pause changes nothing', () => {
    const run = createRun(threeSteps, T0);
    expect(resume(run, sec(10))).toBe(run);
  });
});

describe('completeStep', () => {
  it('throws before earliestDone', () => {
    const run = createRun(threeSteps, T0);
    expect(() => completeStep(run, sec(89.999))).toThrow();
    expect(tick(run, sec(89.999)).canComplete).toBe(false);
  });

  it('succeeds at and after earliestDone', () => {
    const run = createRun(threeSteps, T0);
    expect(tick(run, sec(90)).canComplete).toBe(true);
    expect(completeStep(run, sec(90)).currentStepIndex).toBe(1);
    expect(completeStep(run, sec(120)).currentStepIndex).toBe(1);
  });

  it('always allows a checkbox step', () => {
    const run = createRun(morning, T0);
    expect(run.stepRuns[0]!.type).toBe('checkbox');
    expect(tick(run, T0).canComplete).toBe(true);
    expect(completeStep(run, T0).currentStepIndex).toBe(1);
  });

  it('does not count paused time toward earliestDone', () => {
    const run = pause(createRun(threeSteps, T0), sec(10));
    const resumed = resume(run, sec(200));
    expect(tick(resumed, sec(200)).canComplete).toBe(false);
    expect(() => completeStep(resumed, sec(200))).toThrow();
    expect(tick(resumed, sec(280)).canComplete).toBe(true);
  });

  it('is not allowed while paused', () => {
    const run = pause(createRun(threeSteps, T0), sec(100));
    expect(tick(run, sec(100)).canComplete).toBe(false);
    expect(() => completeStep(run, sec(100))).toThrow();
  });

  it('records actual seconds excluding paused time', () => {
    let run = createRun(threeSteps, T0);
    run = resume(pause(run, sec(50)), sec(110));
    run = completeStep(run, sec(160));
    expect(stepActualSeconds(run.stepRuns[0]!)).toBe(100);
    expect(run.stepRuns[0]!.skipped).toBe(false);
  });

  it('starts the next step at the moment of completion', () => {
    const run = completeStep(createRun(threeSteps, T0), sec(100));
    expect(run.stepRuns[1]!.startedAt).toBe(sec(100));
    expect(tick(run, sec(110)).remainingSeconds).toBe(110);
  });

  it('allows completion when over plan and keeps the overrun', () => {
    const run = completeStep(createRun(threeSteps, T0), sec(240));
    expect(stepActualSeconds(run.stepRuns[0]!)).toBe(240);
    expect(tick(run, sec(240)).stepViews[0]!.mark).toBe('over');
  });
});

describe('step marks', () => {
  it('marks early, on time and over', () => {
    let run = createRun(routineOf(step('a', 100), step('b', 100), step('c', 100)), T0);
    run = completeStep(run, sec(50));
    run = completeStep(run, sec(145));
    run = completeStep(run, sec(250));
    expect(tick(run, sec(250)).stepViews.map((s) => s.mark)).toEqual(['early', 'onTime', 'over']);
  });

  it('marks a checkbox on time however long it took, and a skip with nothing', () => {
    let run = createRun(morning, T0);
    run = completeStep(run, sec(500));
    run = skipStep(run, sec(501));
    const views = tick(run, sec(501)).stepViews;
    expect(views[0]!.mark).toBe('onTime');
    expect(views[1]!.mark).toBeUndefined();
    expect(views[1]!.phase).toBe('skipped');
  });
});

describe('skipStep', () => {
  it('marks the step skipped and advances', () => {
    const run = skipStep(createRun(threeSteps, T0), sec(5));
    expect(run.stepRuns[0]!.skipped).toBe(true);
    expect(run.currentStepIndex).toBe(1);
  });

  it('ignores earliestDone', () => {
    expect(() => skipStep(createRun(threeSteps, T0), sec(1))).not.toThrow();
  });

  it('on the last step ends the run', () => {
    let run = createRun(threeSteps, T0);
    run = skipStep(skipStep(run, sec(1)), sec(2));
    run = skipStep(run, sec(3));
    expect(run.status).toBe('done');
    expect(run.endedAt).toBe(sec(3));
  });
});

describe('goBack', () => {
  it('reopens the previous step with its elapsed preserved', () => {
    let run = completeStep(createRun(threeSteps, T0), sec(100));
    run = goBack(run, sec(150));
    expect(run.currentStepIndex).toBe(0);
    expect(run.stepRuns[0]!.endedAt).toBeUndefined();
    expect(tick(run, sec(150)).remainingSeconds).toBe(80);
    expect(tick(run, sec(160)).remainingSeconds).toBe(70);
  });

  it('clears a skip on the reopened step', () => {
    const run = goBack(skipStep(createRun(threeSteps, T0), sec(10)), sec(20));
    expect(run.stepRuns[0]!.skipped).toBe(false);
  });

  it('keeps the elapsed of the step left behind when it is reached again', () => {
    let run = completeStep(createRun(threeSteps, T0), sec(100));
    run = goBack(run, sec(120));
    run = completeStep(run, sec(130));
    expect(run.currentStepIndex).toBe(1);
    expect(tick(run, sec(130)).remainingSeconds).toBe(100);
  });

  it('counts the reopened step in its final actual time', () => {
    let run = completeStep(createRun(threeSteps, T0), sec(100));
    run = goBack(run, sec(150));
    run = completeStep(run, sec(170));
    expect(stepActualSeconds(run.stepRuns[0]!)).toBe(120);
  });

  it('does nothing on the first step', () => {
    const run = createRun(threeSteps, T0);
    expect(goBack(run, sec(10))).toBe(run);
  });

  it('works from a paused step, leaving the reopened step running', () => {
    let run = completeStep(createRun(threeSteps, T0), sec(100));
    run = pause(run, sec(110));
    run = goBack(run, sec(150));
    expect(run.status).toBe('running');
    expect(tick(run, sec(150)).remainingSeconds).toBe(80);
    run = completeStep(run, sec(150));
    expect(tick(run, sec(150)).remainingSeconds).toBe(110);
  });
});

describe('postponeStep', () => {
  const ids = (run: RunState) => run.stepRuns.map((s) => s.stepId);

  it('moves the current step to the end and starts the next one', () => {
    const run = postponeStep(createRun(threeSteps, T0), sec(10));
    expect(ids(run)).toEqual(['b', 'c', 'a']);
    expect(run.currentStepIndex).toBe(0);
    expect(run.stepRuns[0]!.startedAt).toBe(sec(10));
    expect(tick(run, sec(20)).remainingSeconds).toBe(110);
  });

  it('moves a later step behind the remaining steps only', () => {
    let run = completeStep(createRun(threeSteps, T0), sec(100));
    run = postponeStep(run, sec(110));
    expect(ids(run)).toEqual(['a', 'c', 'b']);
    expect(run.currentStepIndex).toBe(1);
  });

  it('continues the postponed step with its elapsed preserved', () => {
    let run = postponeStep(createRun(threeSteps, T0), sec(40));
    run = completeStep(run, sec(100));
    run = completeStep(run, sec(150));
    expect(run.stepRuns[2]!.stepId).toBe('a');
    expect(tick(run, sec(150)).remainingSeconds).toBe(140);
    expect(tick(run, sec(160)).remainingSeconds).toBe(130);
  });

  it('counts only time actually spent on the step toward earliestDone and actual time', () => {
    let run = postponeStep(createRun(threeSteps, T0), sec(40));
    run = completeStep(run, sec(100));
    run = completeStep(run, sec(150));
    expect(() => completeStep(run, sec(160))).toThrow();
    run = completeStep(run, sec(200));
    expect(run.status).toBe('done');
    expect(stepActualSeconds(run.stepRuns[2]!)).toBe(90);
  });

  it('does nothing on the last step', () => {
    const last = completeStep(createRun(routineOf(step('a', 10), step('b', 10)), T0), sec(10));
    expect(postponeStep(last, sec(11))).toBe(last);
  });

  it('can be used again, and returns to the first step when all are postponed', () => {
    let run = createRun(routineOf(step('a', 100), step('b', 100)), T0);
    run = postponeStep(run, sec(10));
    run = postponeStep(run, sec(30));
    expect(ids(run)).toEqual(['a', 'b']);
    expect(tick(run, sec(30)).remainingSeconds).toBe(90);
    expect(tick(run, sec(30)).stepViews[1]!.remainingSeconds).toBe(80);
  });

  it('works from a paused step and leaves the next step running', () => {
    let run = pause(createRun(threeSteps, T0), sec(10));
    run = postponeStep(run, sec(50));
    expect(run.status).toBe('running');
    expect(tick(run, sec(50)).stepViews[2]!.elapsedSeconds).toBe(10);
  });

  it('keeps the postponed step pending and works with goBack', () => {
    let run = completeStep(createRun(threeSteps, T0), sec(100));
    run = postponeStep(run, sec(110));
    expect(tick(run, sec(110)).stepViews[2]!.phase).toBe('pending');
    run = goBack(run, sec(120));
    expect(run.stepRuns[0]!.stepId).toBe('a');
    expect(tick(run, sec(120)).stepViews.map((s) => s.phase)).toEqual(['current', 'pending', 'pending']);
  });

  it('does not change the routine it came from', () => {
    const before = threeSteps.steps.map((s) => s.id);
    postponeStep(createRun(threeSteps, T0), sec(1));
    expect(threeSteps.steps.map((s) => s.id)).toEqual(before);
  });

  it('is rejected after the run has ended', () => {
    expect(() => postponeStep(abandon(createRun(threeSteps, T0), sec(1)), sec(2))).toThrow();
  });

  it('fires no false cue when a different step takes the same index', () => {
    const run = createRun(routineOf(step('a', 180), step('b', 60)), T0);
    const before = tick(run, sec(10));
    const moved = postponeStep(run, sec(10));
    expect(cueEvents(before, tick(moved, sec(10)))).toEqual([]);
  });

  it('fires each cue once per step across a postpone and return', () => {
    let run = createRun(routineOf(step('a', 100), step('b', 100)), T0);
    const events: CueEvent[] = [];
    let prev = tick(run, T0);
    const advance = (t: number) => {
      const next = tick(run, sec(t));
      events.push(...cueEvents(prev, next));
      prev = next;
    };
    advance(45); // a: one minute
    run = postponeStep(run, sec(45));
    advance(45);
    run = postponeStep(run, sec(45)); // b moves back behind a, untouched
    advance(45);
    advance(60); // a: half time
    run = postponeStep(run, sec(60));
    advance(60);
    run = postponeStep(run, sec(60));
    advance(60);
    advance(100); // a: step end
    expect(events).toEqual(['oneMinute', 'halfTime', 'stepEnd']);
  });
});

describe('end of run', () => {
  const finished = (): RunState => {
    let run = createRun(threeSteps, T0);
    run = completeStep(run, sec(100));
    run = completeStep(run, sec(150));
    return completeStep(run, sec(200));
  };

  it('ends when the last step completes, with status done and endedAt', () => {
    const run = finished();
    expect(run.status).toBe('done');
    expect(run.endedAt).toBe(sec(200));
    expect(tick(run, sec(999)).status).toBe('done');
  });

  it('stops all clocks once done', () => {
    const view = tick(finished(), sec(9999));
    expect(view.routineElapsed).toBe(200);
    expect(view.routinePlanned).toBe(600);
    expect(view.canComplete).toBe(false);
    expect(view.stepViews.every((s) => s.phase === 'completed')).toBe(true);
  });

  it('abandon sets status abandoned and earns nothing', () => {
    const run = abandon(createRun(threeSteps, T0), sec(10));
    expect(run.status).toBe('abandoned');
    expect(run.endedAt).toBe(sec(10));
    expect(run.rewarded).toBe(false);
  });

  it('rejects changes after the run has ended', () => {
    for (const ended of [finished(), abandon(createRun(threeSteps, T0), sec(1))]) {
      expect(() => completeStep(ended, sec(1000))).toThrow();
      expect(() => skipStep(ended, sec(1000))).toThrow();
      expect(() => pause(ended, sec(1000))).toThrow();
      expect(() => goBack(ended, sec(1000))).toThrow();
      expect(() => abandon(ended, sec(1000))).toThrow();
    }
  });

  it('sums routine elapsed excluding pauses', () => {
    let run = createRun(threeSteps, T0);
    run = resume(pause(run, sec(50)), sec(70));
    expect(tick(run, sec(100)).routineElapsed).toBe(80);
  });
});

describe('stale runs', () => {
  const H = 3600;

  it('reports a paused run older than 12 h as stale', () => {
    const run = pause(createRun(threeSteps, T0), sec(10));
    expect(tick(run, sec(10 + 12 * H)).status).toBe('paused');
    expect(tick(run, sec(10 + 12 * H + 1)).status).toBe('stale');
    expect(tick(run, sec(10 + 12 * H + 1)).canComplete).toBe(false);
  });

  it('reports a forgotten running run older than 12 h as stale', () => {
    const run = createRun(threeSteps, T0);
    expect(tick(run, sec(12 * H)).status).toBe('running');
    expect(tick(run, sec(12 * H + 1)).status).toBe('stale');
  });

  it('leaves the state for the UI to abandon', () => {
    const run = pause(createRun(threeSteps, T0), sec(10));
    tick(run, sec(13 * H));
    expect(run.status).toBe('paused');
  });
});

describe('cueEvents', () => {
  const collect = (run: RunState, times: number[]): CueEvent[] => {
    const events: CueEvent[] = [];
    let prev = tick(run, T0);
    for (const t of times) {
      const next = tick(run, sec(t));
      events.push(...cueEvents(prev, next));
      prev = next;
    }
    return events;
  };

  it('fires nothing while time has not reached a threshold', () => {
    expect(collect(createRun(threeSteps, T0), [1, 2, 80])).toEqual([]);
  });

  it('fires each cue once, in order, over normal ticks', () => {
    const times = Array.from({ length: 800 }, (_, i) => i * 0.25);
    expect(collect(createRun(threeSteps, T0), times)).toEqual(['halfTime', 'oneMinute', 'stepEnd']);
  });

  it('fires at the exact thresholds', () => {
    const run = createRun(threeSteps, T0);
    expect(collect(run, [89.999])).toEqual([]);
    expect(collect(run, [90])).toEqual(['halfTime']);
    expect(collect(run, [90, 119.999])).toEqual(['halfTime']);
    expect(collect(run, [90, 120])).toEqual(['halfTime', 'oneMinute']);
    expect(collect(run, [90, 120, 180])).toEqual(['halfTime', 'oneMinute', 'stepEnd']);
  });

  it('fires all crossed cues in order when a tick jumps past them', () => {
    expect(collect(createRun(threeSteps, T0), [1, 500])).toEqual(['halfTime', 'oneMinute', 'stepEnd']);
  });

  it('does not fire again on later ticks after a jump', () => {
    expect(collect(createRun(threeSteps, T0), [500, 501, 900])).toEqual([
      'halfTime',
      'oneMinute',
      'stepEnd',
    ]);
  });

  it('orders one minute before half time on a step under two minutes', () => {
    expect(collect(createRun(routineOf(step('a', 100)), T0), [45, 100])).toEqual([
      'oneMinute',
      'halfTime',
      'stepEnd',
    ]);
    expect(collect(createRun(routineOf(step('a', 100)), T0), [100])).toEqual([
      'oneMinute',
      'halfTime',
      'stepEnd',
    ]);
  });

  it('orders half time before one minute on a long step', () => {
    const run = createRun(routineOf(step('a', 60), step('b', 900)), T0);
    const next = completeStep(run, sec(1));
    let prev = tick(next, sec(1));
    const events: CueEvent[] = [];
    for (const t of [500, 900, 1000]) {
      const view = tick(next, sec(t));
      events.push(...cueEvents(prev, view));
      prev = view;
    }
    expect(events).toEqual(['halfTime', 'oneMinute', 'stepEnd']);
  });

  it('fires no one minute cue on a step of 60 s or less', () => {
    expect(collect(createRun(routineOf(step('a', 60)), T0), [10, 30, 60])).toEqual([
      'halfTime',
      'stepEnd',
    ]);
  });

  it('fires both cues when half time and one minute coincide', () => {
    expect(collect(createRun(routineOf(step('a', 120)), T0), [60])).toEqual(['halfTime', 'oneMinute']);
  });

  it('fires nothing while paused', () => {
    const paused = pause(createRun(threeSteps, T0), sec(10));
    const prev = tick(paused, sec(10));
    expect(cueEvents(prev, tick(paused, sec(500)))).toEqual([]);
  });

  it('never fires timer cues on a checkbox step', () => {
    expect(collect(createRun(morning, T0), [1, 100, 10000])).toEqual([]);
  });

  it('does not repeat cues when going back to a step past its thresholds', () => {
    const run = createRun(threeSteps, T0);
    const before = tick(run, sec(200));
    const advanced = completeStep(run, sec(200));
    const afterComplete = tick(advanced, sec(200));
    const back = goBack(advanced, sec(201));
    const afterBack = tick(back, sec(201));
    expect(cueEvents(before, afterComplete)).toEqual([]);
    expect(cueEvents(afterComplete, afterBack)).toEqual([]);
    expect(cueEvents(afterBack, tick(back, sec(300)))).toEqual([]);
  });

  it('fires routineEnd exactly once, last', () => {
    const last = createRun(routineOf(step('a', 100)), T0);
    const done = completeStep(last, sec(120));
    const prev = tick(last, sec(99));
    const next = tick(done, sec(120));
    expect(cueEvents(prev, next)).toEqual(['stepEnd', 'routineEnd']);
    expect(cueEvents(next, tick(done, sec(200)))).toEqual([]);
  });

  it('does not fire routineEnd on abandon, and stays silent for a stale run', () => {
    const run = createRun(threeSteps, T0);
    expect(cueEvents(tick(run, sec(1)), tick(abandon(run, sec(2)), sec(2)))).toEqual([]);
    expect(cueEvents(tick(run, sec(1)), tick(run, sec(13 * 3600)))).toEqual([]);
  });
});

describe('seed', () => {
  it('has the morning steps in the agreed order, with the agreed rules', () => {
    expect(morning.steps.map((s) => [s.id, s.type, s.plannedSeconds, s.earliestDoneSeconds, s.points])).toEqual([
      ['medication', 'checkbox', 0, 0, 5],
      ['breakfast', 'timed', 900, 300, 10],
      ['get-dressed', 'timed', 300, 60, 5],
      ['fetch-school-bag', 'timed', 120, 30, 5],
      ['tooth-brushing', 'timed', 180, 90, 10],
      ['combing', 'timed', 120, 30, 5],
    ]);
    expect(routinePlannedSeconds(morning)).toBe(1620);
  });

  it('has its own evening steps, and runs them in that order', () => {
    const ids = [
      'tooth-brushing',
      'combing',
      'pyjamas',
      'lay-out-clothes',
      'pack-school-bag',
      'put-away-laundry',
    ];
    expect(evening.steps.map((s) => s.id)).toEqual(ids);
    expect(evening.steps.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(createRun(evening, T0).stepRuns.map((s) => s.stepId)).toEqual(ids);
    expect(routinePlannedSeconds(evening)).toBe(1080);
  });

  it('keeps the shared steps in each routine at their own position', () => {
    expect(morning.steps.find((s) => s.id === 'combing')!.order).toBe(5);
    expect(evening.steps.find((s) => s.id === 'combing')!.order).toBe(1);
  });

  it('has the study routine with the agreed durations in order', () => {
    expect(study.steps.map((s) => [s.id, s.plannedSeconds])).toEqual([
      ['prepare-materials', 300],
      ['study-1', 900],
      ['break', 300],
      ['study-2', 900],
      ['clean-up', 300],
    ]);
    expect(routinePlannedSeconds(study)).toBe(2700);
  });

  it('offers all routines, with unique ids and every minimum within its plan', () => {
    expect(routines).toEqual([morning, evening, study]);
    expect(new Set(routines.map((r) => r.id)).size).toBe(routines.length);
    for (const routine of routines) {
      expect(new Set(routine.steps.map((s) => s.id)).size).toBe(routine.steps.length);
      for (const s of routine.steps) {
        if (s.type === 'timed') expect(s.earliestDoneSeconds).toBeLessThanOrEqual(s.plannedSeconds);
      }
    }
  });
});

describe('format', () => {
  it('shows remaining time rounded up to whole seconds', () => {
    expect(formatRemaining(180)).toBe('3:00');
    expect(formatRemaining(179.2)).toBe('3:00');
    expect(formatRemaining(61)).toBe('1:01');
    expect(formatRemaining(0.1)).toBe('0:01');
    expect(formatRemaining(0)).toBe('0:00');
  });

  it('shows overrun with a plus sign and never hides it', () => {
    expect(formatRemaining(-0.5)).toBe('0:00');
    expect(formatRemaining(-1)).toBe('+0:01');
    expect(formatRemaining(-80)).toBe('+1:20');
    expect(formatRemaining(-3700)).toBe('+61:40');
  });

  it('formats durations', () => {
    expect(formatDuration(95.4)).toBe('1:35');
  });
});
