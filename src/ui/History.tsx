import { useEffect, useState } from 'react';
import { formatDuration } from '../engine/format';
import { tick } from '../engine/run';
import type { RoutineRun } from '../model/types';
import { runRepository } from '../store/runs';

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

interface Props {
  onBack: () => void;
}

function RunRow({ run }: { run: RoutineRun }) {
  const view = tick(run, run.endedAt ?? run.startedAt);
  const skipped = view.stepViews.filter((step) => step.phase === 'skipped').length;
  return (
    <li className="history-row">
      <span className="history-icon" aria-hidden="true">
        {run.routineIcon.value}
      </span>
      <div className="history-main">
        <div className="history-name">{run.routineName}</div>
        <div className="history-date">{DATE_FORMAT.format(run.startedAt)}</div>
      </div>
      <div className="history-stats">
        <div className="history-time">
          {formatDuration(view.routineElapsed)} / {formatDuration(view.routinePlanned)}
        </div>
        {run.status === 'abandoned' ? (
          <div className="history-note">Stopped</div>
        ) : (
          skipped > 0 && <div className="history-note">{skipped} skipped</div>
        )}
      </div>
    </li>
  );
}

export function History({ onBack }: Props) {
  const [runs, setRuns] = useState<RoutineRun[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    runRepository
      .listEnded()
      .then(setRuns)
      .catch((error) => {
        console.error('Could not load history', error);
        setFailed(true);
      });
  }, []);

  return (
    <main className="screen history">
      <header className="history-header">
        <button type="button" className="icon-button" aria-label="Back" onClick={onBack}>
          ◀︎
        </button>
        <h1>History</h1>
      </header>
      {failed && <p className="warning">History could not be loaded.</p>}
      {runs?.length === 0 && <p className="history-empty">No runs yet</p>}
      <ul className="history-list">
        {runs?.map((run) => <RunRow key={run.id} run={run} />)}
      </ul>
    </main>
  );
}
