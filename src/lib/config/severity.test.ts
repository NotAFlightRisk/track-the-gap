import { describe, expect, it } from 'vitest';
import { toneOf } from './severity';

describe('toneOf', () => {
  it('reads closures as at least as bad as severe delays', () => {
    expect([6, 11, 16, 20].map(toneOf)).toEqual(['major', 'major', 'major', 'major']);
    expect([9, 10, 18].map(toneOf)).toEqual(['minor', 'good', 'good']);
  });

  it('gives a line with no status a tone of its own', () => {
    expect(toneOf(null)).toBe('unknown');
  });
});
