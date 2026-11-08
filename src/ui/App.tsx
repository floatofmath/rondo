import { useCallback, useEffect, useState } from 'react';
import { isRewarded } from '../engine/points';
import { abandon, createRun, tick } from '../engine/run';
import type { Routine, RoutineRun } from '../model/types';
import { requestPersistentStorage, runRepository } from '../store/runs';
import { Celebration } from './Celebration';
import { History } from './History';
import { Home } from './Home';
import { Runner } from './Runner';

type Screen = 'loading' | 'home' | 'runner' | 'celebration' | 'history';

export function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [run, setRun] = useState<RoutineRun>();
  const [saveFailed, setSaveFailed] = useState(false);

  const save = useCallback(async (next: RoutineRun) => {
    try {
      await runRepository.save(next);
      setSaveFailed(false);
    } catch (error) {
      console.error('Could not save run', error);
      setSaveFailed(true);
    }
  }, []);

  // Pick up a run left in progress, as when iOS closed the app during a step.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const active = await runRepository.findActive();
      if (cancelled) return;
      if (!active) {
        setScreen('home');
        return;
      }
      const now = Date.now();
      if (tick(active, now).status === 'stale') {
        await save(abandon(active, now));
        setScreen('home');
        return;
      }
      setRun(active);
      setScreen('runner');
    })().catch((error) => {
      console.error('Could not load runs', error);
      setScreen('home');
    });
    return () => {
      cancelled = true;
    };
  }, [save]);

  useEffect(requestPersistentStorage, []);

  const start = (routine: Routine) => {
    const next = createRun(routine, Date.now());
    setRun(next);
    setScreen('runner');
    void save(next);
  };

  const change = (next: RoutineRun) => {
    if (next.status === 'abandoned') {
      setRun(undefined);
      setScreen('home');
      void save(next);
      return;
    }
    setRun(next);
    if (next.status !== 'done') {
      void save(next);
      return;
    }
    setScreen('celebration');
    void finish(next);
  };

  const finish = async (done: RoutineRun) => {
    let settled = done;
    try {
      const prior = await runRepository.listEnded();
      settled = {
        ...done,
        rewarded: isRewarded(done.routineId, done.maxRewardedRunsPerDay, done.startedAt, prior),
      };
    } catch (error) {
      console.error('Could not read earlier runs', error);
    }
    setRun(settled);
    await save(settled);
  };

  const goHome = () => {
    setRun(undefined);
    setScreen('home');
  };

  return (
    <div className="app">
      {screen === 'home' && <Home onStart={start} onHistory={() => setScreen('history')} />}
      {screen === 'runner' && run && <Runner run={run} onChange={change} />}
      {screen === 'celebration' && run && (
        <Celebration run={run} saveFailed={saveFailed} onHome={goHome} />
      )}
      {screen === 'history' && <History onBack={goHome} />}
      <div className="rotate-hint" aria-hidden="true">
        🔄
      </div>
    </div>
  );
}
