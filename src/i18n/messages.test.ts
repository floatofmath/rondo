import { describe, expect, it } from 'vitest';
import { t } from './messages';

describe('German messages', () => {
  it('formats planned durations', () => {
    expect(t.home.planned(1200)).toBe('20 Min.');
    expect(t.home.planned(45)).toBe('45 Sek.');
  });

  it('fills in values', () => {
    expect(t.runner.readyBy('7:50')).toBe('Fertig um 7:50 Uhr');
    expect(t.celebration.title('Morgen')).toBe('Morgen-Routine geschafft');
    expect(t.history.skipped(2)).toBe('2 übersprungen');
  });
});
