import raw from '$lib/data/network.json';
import { packRows } from '$lib/network/rows';
import type { DirectionModel, LineModel, NetworkModel, Segment } from '$lib/network/types';

export const network = raw as unknown as NetworkModel;

// Rows are how the map reads, not what TfL publishes, so they are packed here rather than baked in.
for (const line of network.lines) {
  for (const direction of line.directions) {
    const rows = packRows(direction.patterns, direction.layout);
    for (const [stop, place] of Object.entries(direction.layout)) place.row = rows.get(stop) ?? 0;
  }
}

export interface DirectionIndex {
  model: DirectionModel;
  /** Segments keyed by their destination, so a train's arrival can find where it came from. */
  approaches: Map<string, Segment[]>;
  segmentByKey: Map<string, Segment>;
  patternById: Map<string, string>;
}

export interface LineIndex {
  id: string;
  directions: DirectionIndex[];
}

const indexDirection = (model: DirectionModel): DirectionIndex => {
  const approaches = new Map<string, Segment[]>();
  const segmentByKey = new Map<string, Segment>();
  for (const segment of model.segments) {
    const key = `${segment.from}>${segment.to}`;
    segmentByKey.set(key, segment);
    approaches.set(segment.to, (approaches.get(segment.to) ?? []).concat(segment));
  }
  return {
    model,
    approaches,
    segmentByKey,
    patternById: new Map(model.patterns.map((p) => [p.id, p.name]))
  };
};

const indexLine = (line: LineModel): LineIndex => ({
  id: line.id,
  directions: line.directions.map(indexDirection)
});

const LINES = new Map(network.lines.map((line) => [line.id, indexLine(line)]));

export const lineIndex = (id: string): LineIndex | undefined => LINES.get(id);
export const allLines = (): LineIndex[] => [...LINES.values()];
export const stationName = (id: string): string => network.stations[id]?.name ?? id;
export const station = (id: string) => network.stations[id];

/** Directed segments used by more than one line - the shared-track corridors. */
export const corridors = (() => {
  const owners = new Map<string, Set<string>>();
  for (const line of network.lines) {
    for (const direction of line.directions) {
      for (const segment of direction.segments) {
        const key = `${segment.from}>${segment.to}`;
        owners.set(key, (owners.get(key) ?? new Set()).add(line.id));
      }
    }
  }
  return new Map([...owners].filter(([, lines]) => lines.size > 1));
})();
