import type { HealthStatus } from '$lib/config/health';
import type { Headway } from '$lib/engine/headway';
import type { Direction } from '$lib/network/types';

export type { Headway, HealthStatus, Direction };

export interface OfficialStatus {
  severity: number;
  description: string;
  reason: string | null;
}

export interface Gap {
  seconds: number;
  ratio: number | null;
  from: string;
  to: string;
  direction: Direction;
}

export interface StationView {
  id: string;
  name: string;
  x: number;
  row: number;
  interchange: string[];
}

export interface CallView {
  vehicleId: string;
  towards: string;
  eta: number;
}

export interface SegmentView {
  key: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  x1: number;
  x2: number;
  row1: number;
  row2: number;
  runTime: number;
  patterns: string[];
  headway: Headway;
  calls: CallView[];
  corridor: { lines: string[]; headway: Headway } | null;
}

export interface TrainView {
  id: string;
  vehicleId: string;
  x: number;
  row: number;
  towards: string;
  eta: number;
  nextName: string;
  location: string;
}

export type StatusCounts = Record<HealthStatus, number>;

export interface DirectionView {
  direction: Direction;
  label: string;
  span: number;
  rows: number;
  stations: StationView[];
  segments: SegmentView[];
  trains: TrainView[];
  patterns: { id: string; name: string }[];
  headway: Headway;
  status: HealthStatus;
  counts: StatusCounts;
  worstGap: Gap | null;
}

export interface LineSummary {
  id: string;
  name: string;
  slug: string;
  colour: string;
  ink: string;
  official: OfficialStatus;
  status: HealthStatus;
  observed: number | null;
  expected: number | null;
  ratio: number | null;
  worstGap: Gap | null;
  trains: number;
  counts: StatusCounts;
  /** Train positions on the busiest direction, 0-1 across the line, for the summary strip. */
  spark: { x: number; row: number }[];
  sparkRows: number;
}

export interface LineView extends LineSummary {
  blurb: string;
  opened: number;
  directions: DirectionView[];
}

export interface Meta {
  fetchedAt: number;
  stale: boolean;
  error: string | null;
  pollSeconds: number;
  generated: string;
}

export interface NetworkView {
  meta: Meta;
  lines: LineSummary[];
  counts: StatusCounts;
  trains: number;
}

export interface LinePayload {
  meta: Meta;
  line: LineView;
}
