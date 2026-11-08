const de = {
  intlLocale: 'de-DE',
  home: {
    start: 'Start',
    history: 'Verlauf',
    planned: (seconds: number) =>
      seconds < 60 ? `${seconds} Sek.` : `${Math.round(seconds / 60)} Min.`,
  },
  runner: {
    done: 'Fertig',
    locked: 'Gesperrt',
    back: 'Zurück',
    pause: 'Pause',
    resume: 'Weiter',
    skip: 'Überspringen',
    later: 'Später',
    next: 'Danach:',
    readyBy: (time: string) => `Fertig um ${time} Uhr`,
    confirmStop: 'Routine abbrechen?',
    confirmBack: 'Einen Schritt zurück?',
    yes: 'Ja',
    no: 'Nein',
  },
  celebration: {
    title: (routine: string) => `${routine}-Routine geschafft`,
    early: 'Früher',
    onTime: 'Pünktlich',
    over: 'Länger',
    skipped: 'Übersprungen',
    saveFailed: 'Dieser Durchlauf konnte nicht gespeichert werden.',
    home: 'Startseite',
  },
  history: {
    title: 'Verlauf',
    back: 'Zurück',
    empty: 'Noch keine Durchläufe',
    stopped: 'Abgebrochen',
    skipped: (count: number) => `${count} übersprungen`,
    loadFailed: 'Der Verlauf konnte nicht geladen werden.',
  },
};

export type Messages = typeof de;
export type Locale = 'de';

// To add a language: add a catalogue of type Messages here. Routine and step names are data, so
// they live in src/model/seed.ts and later in the parent's editor.
const catalogues: Record<Locale, Messages> = { de };

export const t: Messages = catalogues.de;
