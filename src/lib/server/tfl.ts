import { env } from '$env/dynamic/private';
import { LINE_IDS } from '$lib/config/lines';

const BASE = 'https://api.tfl.gov.uk';
const TTL = Math.max(5, Number(env.TFL_POLL_SECONDS ?? 15)) * 1000;
const TIMEOUT = 12_000;

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

export interface LineStatus {
  id: string;
  severity: number;
  description: string;
  reason: string | null;
}

export interface LiveData {
  fetchedAt: number;
  predictions: Prediction[];
  statuses: LineStatus[];
  stale: boolean;
  error: string | null;
}

async function get<T>(path: string): Promise<T> {
  const url = new URL(BASE + path);
  if (env.TFL_APP_KEY) url.searchParams.set('app_key', env.TFL_APP_KEY);
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT)
  });
  if (!res.ok) throw new Error(`TfL ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

interface RawStatus {
  id: string;
  lineStatuses?: {
    statusSeverity: number;
    statusSeverityDescription: string;
    reason?: string;
  }[];
}

async function fetchLive(): Promise<LiveData> {
  const lines = LINE_IDS.join(',');
  const [predictions, raw] = await Promise.all([
    get<Prediction[]>(`/Line/${lines}/Arrivals`),
    get<RawStatus[]>('/Line/Mode/tube/Status')
  ]);

  const statuses = raw.map((line) => {
    const worst = [...(line.lineStatuses ?? [])].sort(
      (a, b) => a.statusSeverity - b.statusSeverity
    )[0];
    return {
      id: line.id,
      severity: worst?.statusSeverity ?? 10,
      description: worst?.statusSeverityDescription ?? 'Unknown',
      reason: worst?.reason?.trim() || null
    };
  });

  return { fetchedAt: Date.now(), predictions, statuses, stale: false, error: null };
}

let current: LiveData | null = null;
let inflight: Promise<LiveData> | null = null;

/** One shared snapshot per TTL, so traffic never multiplies calls to TfL. */
export async function live(): Promise<LiveData> {
  if (current && Date.now() - current.fetchedAt < TTL) return current;
  inflight ??= fetchLive()
    .then((data) => (current = data))
    .catch((err: Error) => {
      if (!current) throw err;
      current = { ...current, stale: true, error: err.message };
      return current;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export const pollSeconds = TTL / 1000;
