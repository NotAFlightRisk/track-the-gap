import { describe, expect, it } from 'vitest';
import { stripLabel } from './format';

const line = (over = {}) => ({
  name: 'Central',
  spark: [
    { x: 0.2, row: 0 },
    { x: 0.6, row: 0 }
  ],
  trains: 11,
  sparkTowards: 'Towards West Ruislip & more',
  observed: 600,
  expected: 540,
  ...over
});

describe('stripLabel', () => {
  it('counts the trains the strip draws, not the ones the line is running', () => {
    expect(stripLabel(line())).toBe(
      'Train spacing on the Central line. Towards West Ruislip & more: 2 of the line’s 11 trains. ' +
        'Across the line, 10:00 between trains, against 9:00 expected.'
    );
  });

  it('names the direction being drawn, since only one of them is', () => {
    expect(stripLabel(line())).toContain('Towards West Ruislip & more');
  });

  it('keeps the headway attributed to the whole line', () => {
    expect(stripLabel(line())).toContain(
      'Across the line, 10:00 between trains, against 9:00 expected'
    );
  });

  it('drops the fraction when the strip is drawing the lot', () => {
    expect(stripLabel(line({ trains: 2, sparkTowards: 'Towards Wimbledon' }))).toContain(
      'Towards Wimbledon: the line’s 2 trains'
    );
  });

  it('counts one train as a train', () => {
    expect(stripLabel(line({ trains: 1, spark: [{ x: 0.4, row: 0 }] }))).toContain(
      'the line’s 1 train.'
    );
  });

  it('says so plainly when nothing is running', () => {
    expect(stripLabel(line({ trains: 0, spark: [], observed: null, expected: null }))).toBe(
      'Train spacing on the Central line. No trains running. Across the line, no headway measured.'
    );
  });
});
