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

const readStatuses = (raw: unknown): LineStatus[] =>
  (Array.isArray(raw) ? (raw as RawStatus[]) : []).map((line) => {
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

/** The two feeds settle independently: losing line status must not throw away fresh predictions. */
async function fetchLive(previous: LiveData | null): Promise<LiveData> {
  const [arrivals, status] = await Promise.allSettled([
    get<unknown>(`/Line/${LINE_IDS.join(',')}/Arrivals`),
    get<unknown>('/Line/Mode/tube/Status')
  ]);

  const predictions =
    arrivals.status === 'fulfilled' && Array.isArray(arrivals.value)
      ? (arrivals.value as Prediction[])
      : previous?.predictions;
  if (!predictions)
    throw arrivals.status === 'rejected' ? arrivals.reason : new Error('No arrivals');

  const statuses =
    status.status === 'fulfilled' ? readStatuses(status.value) : (previous?.statuses ?? []);
  const failed = [
    arrivals.status === 'rejected' && 'arrivals',
    status.status === 'rejected' && 'line status'
  ].filter(Boolean);

  return {
    fetchedAt: Date.now(),
    predictions,
    statuses,
    stale: failed.length > 0,
    error: failed.length ? `TfL ${failed.join(' and ')} unavailable` : null
  };
}

let current: LiveData | null = null;
let inflight: Promise<LiveData> | null = null;
let nextAttempt = 0;

/** One shared snapshot per TTL, so traffic never multiplies calls to TfL. */
export async function live(): Promise<LiveData> {
  const now = Date.now();
  if (current && (now - current.fetchedAt < TTL || now < nextAttempt)) return current;
  inflight ??= fetchLive(current)
    .then((data) => {
      nextAttempt = data.stale ? Date.now() + TTL * 4 : 0;
      return (current = data);
    })
    .catch((err: Error) => {
      nextAttempt = Date.now() + TTL * 4;
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
