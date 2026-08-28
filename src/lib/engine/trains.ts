import { HEALTH } from '$lib/config/health';
import type { DirectionModel, Direction } from '$lib/network/types';

export interface Prediction {
  vehicleId: string;
  naptanId: string;
  lineId: string;
  platformName: string;
  direction?: string;
  destinationNaptanId?: string;
  destinationName?: string;
  towards: string;
  expectedArrival: string;
  timeToStation: number;
  currentLocation: string;
}

export interface Call {
  stop: string;
  eta: number;
  at: number;
}

export interface Train {
  id: string;
  lineId: string;
  vehicleId: string;
  direction: Direction;
  towards: string;
  destination: string | null;
  calls: Call[];
  next: string;
  eta: number;
  from: string | null;
  /** Minutes along the direction's time axis, so spacing on screen is spacing in minutes. */
  x: number;
  row: number;
  location: string;
  inferred: boolean;
}

const UNKNOWN_VEHICLE = /^0*$/;
/** Two predictions for one train land on the same point of the time axis, give or take jitter. */
const CLUSTER_MINUTES = 0.75;

export interface TrainOptions {
  stationName: (id: string) => string;
  horizonSeconds?: number;
}

/** Which direction's stop order the train's calls actually follow. */
function matchDirection(
  calls: Call[],
  models: DirectionModel[],
  hinted: string | undefined
): DirectionModel | null {
  let best: DirectionModel | null = null;
  let bestScore = 0;
  for (const model of models) {
    const keys = new Set(model.segments.map((s) => `${s.from}>${s.to}`));
    let score = 0;
    for (let i = 1; i < calls.length; i++) {
      if (keys.has(`${calls[i - 1].stop}>${calls[i].stop}`)) score++;
    }
    if (score > bestScore) {
      best = model;
      bestScore = score;
    }
  }
  if (bestScore) return best;

  // One prediction left tells us nothing about order, so trust TfL's own direction.
  const serving = models.filter((model) => model.layout[calls[0].stop]);
  return (
    serving.find((model) => model.direction === hinted) ??
    (serving.length === 1 ? serving[0] : null)
  );
}

/** TfL writes "Between Foo and Bar", "At Foo" or "Approaching Foo". */
const originFromLocation = (
  location: string,
  candidates: string[],
  name: (id: string) => string
) => {
  const between = /^Between (.+?) and /.exec(location);
  if (!between) return null;
  const from = between[1].toLowerCase();
  return candidates.find((id) => name(id).toLowerCase() === from) ?? null;
};

function toCalls(ordered: Prediction[], horizonSeconds: number): Call[] {
  const seen = new Set<string>();
  const calls: Call[] = [];
  for (const p of ordered) {
    if (seen.has(p.naptanId) || p.timeToStation > horizonSeconds) continue;
    seen.add(p.naptanId);
    calls.push({ stop: p.naptanId, eta: p.timeToStation, at: Date.parse(p.expectedArrival) });
  }
  return calls;
}

function assemble(
  id: string,
  ordered: Prediction[],
  model: DirectionModel,
  calls: Call[],
  stationName: (id: string) => string,
  inferred: boolean
): Train | null {
  // Calls run forward along the time axis; anything that goes backwards is the return leg.
  const onRoute: Call[] = [];
  for (const call of calls) {
    const place = model.layout[call.stop];
    if (!place) continue;
    const last = onRoute.at(-1);
    if (last && place.x < (model.layout[last.stop]?.x ?? 0)) break;
    onRoute.push(call);
  }
  if (!onRoute.length) return null;

  const head = ordered[0];
  const next = onRoute[0].stop;
  const place = model.layout[next];
  const approaches = model.segments.filter((s) => s.to === next);
  const from =
    approaches.length === 1
      ? approaches[0].from
      : originFromLocation(
          head.currentLocation ?? '',
          approaches.map((s) => s.from),
          stationName
        );

  const behind = from
    ? model.layout[from]?.x
    : place.x - Math.min(...approaches.map((s) => s.runTime / 60), 5);

  return {
    id,
    lineId: head.lineId,
    vehicleId: head.vehicleId,
    direction: model.direction,
    towards: head.towards?.replace(/^Check Front of Train$/i, 'Unknown') || 'Unknown',
    destination: head.destinationNaptanId ?? null,
    calls: onRoute,
    next,
    eta: onRoute[0].eta,
    from,
    x: Math.max(behind ?? place.x, place.x - onRoute[0].eta / 60),
    row: (from ? model.layout[from]?.row : undefined) ?? place.row,
    location: head.currentLocation || '',
    inferred
  };
}

const servesDirection = (prediction: Prediction, model: DirectionModel): boolean => {
  if (prediction.direction) return prediction.direction === model.direction;
  const here = model.layout[prediction.naptanId];
  const end = prediction.destinationNaptanId ? model.layout[prediction.destinationNaptanId] : null;
  return Boolean(here && end && end.x > here.x);
};

/**
 * Some lines never publish a train identifier. Two predictions for one train resolve to the same
 * point on the time axis, so clustering by position rebuilds the trains anyway.
 */
function inferTrains(
  predictions: Prediction[],
  models: DirectionModel[],
  { stationName, horizonSeconds = HEALTH.horizonSeconds }: TrainOptions
): Train[] {
  const trains: Train[] = [];

  for (const model of models) {
    const groups = new Map<string, { x: number; prediction: Prediction }[]>();
    for (const prediction of predictions) {
      const place = model.layout[prediction.naptanId];
      if (!place || !servesDirection(prediction, model)) continue;
      const key = prediction.destinationNaptanId ?? prediction.towards ?? '?';
      groups.set(
        key,
        (groups.get(key) ?? []).concat({ x: place.x - prediction.timeToStation / 60, prediction })
      );
    }

    for (const [key, found] of groups) {
      let cluster: Prediction[] = [];
      let last = -Infinity;
      const flush = () => {
        if (!cluster.length) return;
        const ordered = [...cluster].sort((a, b) => a.timeToStation - b.timeToStation);
        const calls = toCalls(ordered, horizonSeconds);
        const id = `${ordered[0].lineId}|${model.direction}|${key}|${trains.length}`;
        const train = calls.length && assemble(id, ordered, model, calls, stationName, true);
        if (train) trains.push(train);
        cluster = [];
      };
      for (const { x, prediction } of found.sort((a, b) => a.x - b.x)) {
        if (x - last > CLUSTER_MINUTES) flush();
        cluster.push(prediction);
        last = x;
      }
      flush();
    }
  }

  return trains;
}

export function buildTrains(
  predictions: Prediction[],
  models: DirectionModel[],
  options: TrainOptions
): Train[] {
  const { stationName, horizonSeconds = HEALTH.horizonSeconds } = options;
  const grouped = new Map<string, Prediction[]>();
  const anonymous: Prediction[] = [];

  for (const prediction of predictions) {
    if (UNKNOWN_VEHICLE.test(prediction.vehicleId)) {
      anonymous.push(prediction);
      continue;
    }
    const key = `${prediction.lineId}|${prediction.vehicleId}`;
    grouped.set(key, (grouped.get(key) ?? []).concat(prediction));
  }

  const trains: Train[] = [];
  for (const [id, group] of grouped) {
    const ordered = [...group].sort((a, b) => a.timeToStation - b.timeToStation);
    const calls = toCalls(ordered, horizonSeconds);
    if (!calls.length) continue;
    const model = matchDirection(calls, models, ordered.find((p) => p.direction)?.direction);
    const train = model && assemble(id, ordered, model, calls, stationName, false);
    if (train) trains.push(train);
  }

  trains.push(...inferTrains(anonymous, models, options));
  return trains.sort((a, b) => a.x - b.x);
}
