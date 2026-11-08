import type { Routine, Step, StepType } from './types';

// Durations, minimum times and points are placeholders until they are agreed before first use.
const PROFILE_ID = 'default';

const minutes = (count: number) => count * 60;

type StepPlan = {
  id: string;
  name: string;
  emoji: string;
  plannedSeconds: number;
  earliestDoneSeconds: number;
  points: number;
  type?: StepType;
};

function steps(plans: StepPlan[]): Step[] {
  return plans.map(({ emoji, type = 'timed', ...plan }, order) => ({
    ...plan,
    order,
    type,
    icon: { kind: 'emoji', value: emoji },
  }));
}

// Shared by morning and evening.
const toothBrushing: StepPlan = {
  id: 'tooth-brushing',
  name: 'Zähneputzen',
  emoji: '🪥',
  plannedSeconds: minutes(3),
  earliestDoneSeconds: 90,
  points: 10,
};

const combing: StepPlan = {
  id: 'combing',
  name: 'Kämmen',
  emoji: '🪮',
  plannedSeconds: minutes(2),
  earliestDoneSeconds: 30,
  points: 5,
};

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
  steps: steps([
    {
      id: 'medication',
      name: 'Medikamente',
      emoji: '💊',
      type: 'checkbox',
      plannedSeconds: 0,
      earliestDoneSeconds: 0,
      points: 5,
    },
    {
      id: 'breakfast',
      name: 'Frühstücken',
      emoji: '🥣',
      plannedSeconds: minutes(15),
      earliestDoneSeconds: minutes(5),
      points: 10,
    },
    {
      id: 'get-dressed',
      name: 'Anziehen',
      emoji: '👕',
      plannedSeconds: minutes(5),
      earliestDoneSeconds: minutes(1),
      points: 5,
    },
    {
      id: 'fetch-school-bag',
      name: 'Schultasche holen',
      emoji: '🎒',
      plannedSeconds: minutes(2),
      earliestDoneSeconds: 30,
      points: 5,
    },
    toothBrushing,
    combing,
  ]),
};

export const evening: Routine = {
  id: 'evening',
  profileId: PROFILE_ID,
  name: 'Abend',
  icon: { kind: 'emoji', value: '🌙' },
  colour: '#8080ff',
  order: 1,
  pointsOnComplete: 10,
  onTimeBonus: 5,
  maxRewardedRunsPerDay: 1,
  steps: steps([
    toothBrushing,
    combing,
    {
      id: 'pyjamas',
      name: 'Pyjama anziehen',
      emoji: '🛌',
      plannedSeconds: minutes(3),
      earliestDoneSeconds: 30,
      points: 5,
    },
    {
      id: 'lay-out-clothes',
      name: 'Kleidung für den nächsten Tag richten',
      emoji: '🧦',
      plannedSeconds: minutes(3),
      earliestDoneSeconds: 30,
      points: 5,
    },
    {
      id: 'pack-school-bag',
      name: 'Schultasche vorbereiten',
      emoji: '🎒',
      plannedSeconds: minutes(5),
      earliestDoneSeconds: minutes(1),
      points: 5,
    },
    {
      id: 'put-away-laundry',
      name: 'Schmutzwäsche wegräumen',
      emoji: '🧺',
      plannedSeconds: minutes(2),
      earliestDoneSeconds: 30,
      points: 5,
    },
  ]),
};

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
  steps: steps([
    {
      id: 'prepare-materials',
      name: 'Material vorbereiten',
      emoji: '🎒',
      plannedSeconds: minutes(5),
      earliestDoneSeconds: minutes(1),
      points: 5,
    },
    {
      id: 'study-1',
      name: 'Lernen',
      emoji: '📚',
      plannedSeconds: minutes(15),
      earliestDoneSeconds: minutes(10),
      points: 10,
    },
    {
      id: 'break',
      name: 'Pause',
      emoji: '🧃',
      plannedSeconds: minutes(5),
      earliestDoneSeconds: 0,
      points: 0,
    },
    {
      id: 'study-2',
      name: 'Lernen',
      emoji: '📚',
      plannedSeconds: minutes(15),
      earliestDoneSeconds: minutes(10),
      points: 10,
    },
    {
      id: 'clean-up',
      name: 'Aufräumen',
      emoji: '🧹',
      plannedSeconds: minutes(5),
      earliestDoneSeconds: minutes(1),
      points: 5,
    },
  ]),
};

export const routines: Routine[] = [morning, evening, study];
