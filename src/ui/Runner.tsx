import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { playCue } from '../audio/cues';
import { formatRemaining } from '../engine/format';
import {
  abandon,
  completeStep,
  cueEvents,
  goBack,
  pause,
  postponeStep,
  resume,
  skipStep,
  tick,
  type RunView,
} from '../engine/run';
import { t } from '../i18n/messages';
import type { RoutineRun } from '../model/types';
import { holdWakeLock } from '../pwa/wakeLock';
import { Disc, type DiscTone } from './Disc';

const TICK_MS = 250;
const AMBER_FRACTION = 0.2;
/** Keeps a double tap on Done from also finishing a following step that has no minimum time. */
const DONE_GUARD_MS = 800;
/** Names beyond this no longer fit on one or two large lines on a small phone. */
const LONG_NAME_LENGTH = 18;

interface Props {
  run: RoutineRun;
  onChange: (next: RoutineRun) => void;
}

function discTone(view: RunView): DiscTone {
  if (view.remainingSeconds < 0) return 'over';
  return view.fractionRemaining <= AMBER_FRACTION ? 'amber' : 'neutral';
}

function formatTarget(target: string): string {
  return target.replace(/^0(\d)/, '$1');
}

export function Runner({ run, onChange }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [confirmingBack, setConfirmingBack] = useState(false);
  const lastStepChange = useRef(0);

  // The tick only re-renders. All time is derived from the run's timestamps and the current clock.
  useEffect(() => {
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, TICK_MS);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  useEffect(() => holdWakeLock(), []);

  const view = tick(run, now);

  // After the phone was locked several cues can be due at once, so only the latest one is played.
  const previousView = useRef<RunView>(view);
  useEffect(() => {
    const cues = cueEvents(previousView.current, view);
    previousView.current = view;
    const latest = cues.at(-1);
    if (latest) playCue(latest);
  });

  useEffect(() => {
    if (view.status === 'stale') onChange(abandon(run, Date.now()));
  }, [view.status, run, onChange]);

  const step = view.stepViews[view.stepIndex]!;
  const nextStep = view.stepViews[view.stepIndex + 1];
  const paused = view.status === 'paused';
  const over = view.remainingSeconds < 0;
  const firstStep = view.stepIndex === 0;

  const moveStep = (next: RoutineRun) => {
    lastStepChange.current = Date.now();
    setNow(Date.now());
    onChange(next);
  };

  const done = () => {
    const at = Date.now();
    if (at - lastStepChange.current < DONE_GUARD_MS) return;
    if (tick(run, at).canComplete) moveStep(completeStep(run, at));
  };

  const confirmBack = () => {
    setConfirmingBack(false);
    const at = Date.now();
    if (firstStep) onChange(abandon(run, at));
    else moveStep(goBack(run, at));
  };

  return (
    <main
      className={`screen runner${paused ? ' is-paused' : ''}`}
      style={{ '--accent': run.routineColour } as CSSProperties}
    >
      <header className="runner-top">
        <div className="segments" aria-hidden="true">
          {view.stepViews.map((segment) => (
            <div key={segment.stepId} className={`segment segment-${segment.phase}`}>
              <div
                className="segment-fill"
                style={{
                  width: `${
                    segment.phase === 'completed'
                      ? 100
                      : segment.timed && segment.phase !== 'skipped'
                        ? Math.round((1 - segment.fractionRemaining) * 100)
                        : 0
                  }%`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="step-counter">
          {view.stepIndex + 1} / {view.stepViews.length}
        </div>
      </header>

      <section className="runner-centre">
        <div className="step-icon" aria-hidden="true">
          {step.icon.value}
        </div>
        <h1 className={`step-name${step.name.length > LONG_NAME_LENGTH ? ' step-name-long' : ''}`}>
          {step.name}
        </h1>
        {step.timed && (
          <>
            <Disc fraction={view.fractionRemaining} tone={discTone(view)} />
            <div className={`digits${over ? ' digits-over' : ''}`} role="timer">
              {formatRemaining(view.remainingSeconds)}
            </div>
          </>
        )}
        {run.targetEndTime && (
          <div className="target-line">{t.runner.readyBy(formatTarget(run.targetEndTime))}</div>
        )}
      </section>

      <footer className="runner-controls">
        {nextStep && (
          <div className="next-step">
            <span className="next-step-label">{t.runner.next}</span>
            <span aria-hidden="true">{nextStep.icon.value}</span>
            <span className="next-step-name">{nextStep.name}</span>
          </div>
        )}
        <button
          type="button"
          className="done-button"
          disabled={!view.canComplete}
          onClick={done}
        >
          {!view.canComplete && !paused && (
            <span className="done-lock" aria-label={t.runner.locked}>
              🔒
            </span>
          )}
          {t.runner.done}
        </button>
        <div className="secondary-controls">
          <button
            type="button"
            className="icon-button"
            aria-label={t.runner.back}
            onClick={() => setConfirmingBack(true)}
          >
            ◀︎
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={paused ? t.runner.resume : t.runner.pause}
            onClick={() => onChange(paused ? resume(run, Date.now()) : pause(run, Date.now()))}
          >
            {paused ? '▶︎' : '❙❙'}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t.runner.skip}
            onClick={() => moveStep(skipStep(run, Date.now()))}
          >
            ▶︎❙
          </button>
          <button
            type="button"
            className="icon-button later-button"
            disabled={!nextStep}
            onClick={() => moveStep(postponeStep(run, Date.now()))}
          >
            {t.runner.later}
          </button>
        </div>
      </footer>

      {confirmingBack && (
        <div className="confirm" role="dialog" aria-modal="true">
          <p className="confirm-text">{firstStep ? t.runner.confirmStop : t.runner.confirmBack}</p>
          <button type="button" className="confirm-yes" onClick={confirmBack}>
            {t.runner.yes}
          </button>
          <button type="button" className="confirm-no" onClick={() => setConfirmingBack(false)}>
            {t.runner.no}
          </button>
        </div>
      )}
    </main>
  );
}
