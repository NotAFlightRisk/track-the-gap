import { describe, expect, it } from 'vitest';
import { gapsBlurb, plural, stripLabel, verdictBasis } from './format';

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

const counts = (over = {}) => ({
  normal: 0,
  degraded: 0,
  gap: 0,
  bunching: 0,
  severe: 0,
  'no-data': 0,
  ...over
});

describe('plural', () => {
  it('keeps one of a thing singular', () => {
    expect(plural(1, 'train')).toBe('1 train');
  });

  it('pluralises everything else, none included', () => {
    expect(plural(0, 'train')).toBe('0 trains');
    expect(plural(2, 'train')).toBe('2 trains');
  });
});

describe('verdictBasis', () => {
  it('counts the sections the verdict was taken over, not every section on the line', () => {
    expect(verdictBasis('normal', counts({ normal: 29, gap: 8, 'no-data': 69 }))).toBe(
      'We can measure 37 of this line’s 106 sections right now, and this is the level more than ' +
        'a quarter of them reach.'
    );
  });

  it('says nothing was measured rather than claiming a quarter of nothing', () => {
    expect(verdictBasis('no-data', counts({ 'no-data': 70 }))).toBe(
      'None of this line’s 70 sections can be measured yet.'
    );
  });

  it('blames thin coverage when some sections read but the line still cannot be called', () => {
    expect(verdictBasis('no-data', counts({ normal: 5, 'no-data': 113 }))).toBe(
      'Only 5 of this line’s 118 sections can be measured right now, too few to call the line ' +
        'either way.'
    );
  });

  it('holds up on a two-section line, where a quarter is one section', () => {
    expect(verdictBasis('normal', counts({ normal: 1, 'no-data': 1 }))).toBe(
      'We can measure 1 of this line’s 2 sections right now, and this is the level more than a ' +
        'quarter of them reach.'
    );
  });
});

describe('gapsBlurb', () => {
  it('promises only the rows the table is about to draw', () => {
    expect(gapsBlurb(12)).toBe(
      'Worst first: the 12 sections with the biggest gap against timetable right now.'
    );
    expect(gapsBlurb(1)).toBe(
      'Worst first: the 1 section with the biggest gap against timetable right now.'
    );
  });

  it('says so plainly when there is nothing to rank', () => {
    expect(gapsBlurb(0)).toBe('No section has two predictions to measure a gap from yet.');
  });
});
