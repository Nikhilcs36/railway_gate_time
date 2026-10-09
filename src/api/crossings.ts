import type { Crossing, CrossingStatus, GeoBounds, TrainReport } from '../types/crossing';

const BASE = '/api';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON but received ${res.headers.get('content-type') ?? 'unknown content-type'} for ${path}`);
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${path}`);
  }
  return data as T;
}

export function fetchCrossings(): Promise<Crossing[]> {
  return getJson<Crossing[]>('/crossings');
}

export function fetchCrossingStatus(id: number): Promise<CrossingStatus> {
  return getJson<CrossingStatus>(`/crossings/${id}/status`);
}

export function fetchNearbyCrossings(bounds: GeoBounds): Promise<Crossing[]> {
  const params = new URLSearchParams({
    north: String(bounds.north),
    south: String(bounds.south),
    east: String(bounds.east),
    west: String(bounds.west),
  });
  return getJson<Crossing[]>(`/crossings/nearby?${params.toString()}`);
}

export function postTrainReport(report: TrainReport): Promise<{ ok: boolean }> {
  return fetch(`${BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  }).then((res) => {
    if (!res.ok) throw new Error(`Report failed (${res.status})`);
    return res.json() as Promise<{ ok: boolean }>;
  });
}