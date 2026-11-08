import type { Routine, Step } from './types';

// Durations and routine-level points are placeholders until they are agreed before first use.
const PROFILE_ID = 'default';

const morningSteps: Step[] = [
  {
    id: 'medication',
    order: 0,
    name: 'Medikament',
    icon: { kind: 'emoji', value: '💊' },
    type: 'checkbox',
    plannedSeconds: 0,
    earliestDoneSeconds: 0,
    points: 5,
  },
  {
    id: 'tooth-brushing',
    order: 1,
    name: 'Zähne putzen',
    icon: { kind: 'emoji', value: '🪥' },
    type: 'timed',
    plannedSeconds: 3 * 60,
    earliestDoneSeconds: 90,
    points: 10,
  },
  {
    id: 'combing',
    order: 2,
    name: 'Haare kämmen',
    icon: { kind: 'emoji', value: '💇' },
    type: 'timed',
    plannedSeconds: 2 * 60,
    earliestDoneSeconds: 30,
    points: 5,
  },
  {
    id: 'breakfast',
    order: 3,
    name: 'Frühstück',
    icon: { kind: 'emoji', value: '🥣' },
    type: 'timed',
    plannedSeconds: 15 * 60,
    earliestDoneSeconds: 5 * 60,
    points: 10,
  },
];

export const morning: Routine = {
  id: 'morning',
  profileId: PROFILE_ID,
  name: 'Morgen',
  icon: { kind: 'emoji', value: '☀️' },
  colour: '#ffc828',
  order: 0,
  pointsOnComplete: 10,
  onTimeBonus: 5,
  maxRewardedRunsPerDay: 1,
  steps: morningSteps,
};

export const evening: Routine = {
  ...morning,
  id: 'evening',
  name: 'Abend',
  icon: { kind: 'emoji', value: '🌙' },
  colour: '#8080ff',
  order: 1,
  steps: [...morningSteps].reverse().map((step, order) => ({ ...step, order })),
};

const minutes = (count: number) => count * 60;

export const study: Routine = {
  id: 'study',
  profileId: PROFILE_ID,
  name: 'Lernen',
  icon: { kind: 'emoji', value: '📖' },
  colour: '#3ecf8e',
  order: 2,
  pointsOnComplete: 10,
  onTimeBonus: 5,
  maxRewardedRunsPerDay: 1,
  steps: [
    {
      id: 'prepare-materials',
      order: 0,
      name: 'Material vorbereiten',
      icon: { kind: 'emoji', value: '🎒' },
      type: 'timed',
      plannedSeconds: minutes(5),
      earliestDoneSeconds: minutes(1),
      points: 5,
    },
    {
      id: 'study-1',
      order: 1,
      name: 'Lernen',
      icon: { kind: 'emoji', value: '📚' },
      type: 'timed',
      plannedSeconds: minutes(15),
      earliestDoneSeconds: minutes(10),
      points: 10,
    },
    {
      id: 'break',
      order: 2,
      name: 'Pause',
      icon: { kind: 'emoji', value: '🧃' },
      type: 'timed',
      plannedSeconds: minutes(5),
      earliestDoneSeconds: 0,
      points: 0,
    },
    {
      id: 'study-2',
      order: 3,
      name: 'Lernen',
      icon: { kind: 'emoji', value: '📚' },
      type: 'timed',
      plannedSeconds: minutes(15),
      earliestDoneSeconds: minutes(10),
      points: 10,
    },
    {
      id: 'clean-up',
      order: 4,
      name: 'Aufräumen',
      icon: { kind: 'emoji', value: '🧹' },
      type: 'timed',
      plannedSeconds: minutes(5),
      earliestDoneSeconds: minutes(1),
      points: 5,
    },
  ],
};

export const routines: Routine[] = [morning, evening, study];
