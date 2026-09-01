import { describe, expect, it } from 'vitest';
import { lostDayTypes } from './coverage.mjs';

const line = (id, days) => ({
  id,
  directions: [{ expected: { 'A>B': Object.fromEntries(days.map((day) => [day, [120]])) } }]
});

describe('lostDayTypes', () => {
  it('names the days a line has stopped publishing', () => {
    const before = [line('northern', ['mon-thu', 'fri', 'sat', 'sun'])];
    expect(lostDayTypes(before, [line('northern', ['mon-thu'])])).toEqual([
      'northern lost fri, sat, sun'
    ]);
  });

  it('is happy about a line that gains one', () => {
    const before = [line('piccadilly', ['fri', 'sat', 'sun'])];
    expect(lostDayTypes(before, [line('piccadilly', ['mon-thu', 'fri', 'sat', 'sun'])])).toEqual(
      []
    );
  });

  it('leaves a line that never ran at weekends alone', () => {
    const weekdaysOnly = [line('waterloo-city', ['mon-thu', 'fri'])];
    expect(lostDayTypes(weekdaysOnly, weekdaysOnly)).toEqual([]);
  });

  it('has nothing to say about a line it has not seen before', () => {
    expect(lostDayTypes([], [line('elizabeth', ['mon-thu'])])).toEqual([]);
  });
});
