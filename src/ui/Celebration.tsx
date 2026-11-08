import type { CSSProperties } from 'react';
import { formatDuration } from '../engine/format';
import { tick, type StepView } from '../engine/run';
import type { RoutineRun } from '../model/types';

const MARKS: Record<NonNullable<StepView['mark']>, { label: string; className: string }> = {
  early: { label: 'Early', className: 'mark-early' },
  onTime: { label: 'On time', className: 'mark-on-time' },
  over: { label: 'Over', className: 'mark-over' },
};

interface Props {
  run: RoutineRun;
  saveFailed: boolean;
  onHome: () => void;
}

export function Celebration({ run, saveFailed, onHome }: Props) {
  const view = tick(run, run.endedAt ?? run.startedAt);
  return (
    <main
      className="screen celebration"
      style={{ '--accent': run.routineColour } as CSSProperties}
    >
      <div className="big-check" aria-hidden="true">
        ✓
      </div>
      <h1 className="celebration-title">{run.routineName} routine done</h1>
      <p className="celebration-total">
        {formatDuration(view.routineElapsed)} <span>/ {formatDuration(view.routinePlanned)}</span>
      </p>
      <ul className="step-list">
        {view.stepViews.map((step) => (
          <li key={step.stepId} className="step-row">
            <span className="step-row-icon" aria-hidden="true">
              {step.icon.value}
            </span>
            <span className="step-row-name">{step.name}</span>
            {step.mark ? (
              <span className={`mark ${MARKS[step.mark].className}`}>{MARKS[step.mark].label}</span>
            ) : (
              <span className="mark mark-skipped">Skipped</span>
            )}
          </li>
        ))}
      </ul>
      {saveFailed && <p className="warning">This run could not be saved.</p>}
      <button type="button" className="done-button" onClick={onHome}>
        Home
      </button>
    </main>
  );
}
