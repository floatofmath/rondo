import type { CSSProperties } from 'react';
import { formatPlanned } from '../engine/format';
import { routinePlannedSeconds } from '../engine/run';
import { routines } from '../model/seed';
import type { Routine } from '../model/types';

interface Props {
  onStart: (routine: Routine) => void;
  onHistory: () => void;
}

export function Home({ onStart, onHistory }: Props) {
  return (
    <main className="screen home">
      {routines.map((routine) => (
        <button
          key={routine.id}
          type="button"
          className="routine-card"
          style={{ '--accent': routine.colour } as CSSProperties}
          onClick={() => onStart(routine)}
        >
          <span className="routine-icon" aria-hidden="true">
            {routine.icon.value}
          </span>
          <span className="routine-name">{routine.name}</span>
          <span className="routine-time">{formatPlanned(routinePlannedSeconds(routine))}</span>
          <span className="routine-start">Start</span>
        </button>
      ))}
      <button type="button" className="text-button" onClick={onHistory}>
        History
      </button>
    </main>
  );
}
