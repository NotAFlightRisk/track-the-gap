export type Direction = 'inbound' | 'outbound';
export type DayType = 'mon-thu' | 'fri' | 'sat' | 'sun';

export interface Station {
  name: string;
  lat: number;
  lon: number;
  zone: string | null;
}

export interface Pattern {
  id: string;
  name: string;
  stops: string[];
}

export interface Segment {
  from: string;
  to: string;
  runTime: number;
  patterns: string[];
}

export interface Placement {
  x: number;
  row: number;
}

export interface DirectionModel {
  direction: Direction;
  name: string;
  patterns: Pattern[];
  segments: Segment[];
  layout: Record<string, Placement>;
  /** Timetabled headways per hour, keyed `from>to` then day type. */
  expected: Record<string, Partial<Record<DayType, number[]>>>;
}

export interface LineModel {
  id: string;
  directions: DirectionModel[];
}

export interface NetworkModel {
  generated: string;
  stations: Record<string, Station>;
  lines: LineModel[];
}
