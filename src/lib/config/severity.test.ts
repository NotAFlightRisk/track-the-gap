import { describe, expect, it } from 'vitest';
import { toneOf } from './severity';

describe('toneOf', () => {
  it('reads closures and rail replacement buses as at least as bad as severe delays', () => {
    expect([6, 8, 11, 16, 20].map(toneOf)).toEqual(['major', 'major', 'major', 'major', 'major']);
    expect([0, 9, 10, 18].map(toneOf)).toEqual(['minor', 'minor', 'good', 'good']);
  });

  it('owns up to not knowing, rather than guessing a colour', () => {
    expect([null, 21].map(toneOf)).toEqual(['unknown', 'unknown']);
  });
});
