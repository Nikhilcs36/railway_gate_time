import { http, HttpResponse } from 'msw';
import type { Crossing, CrossingStatus } from '../types/crossing';

/**
 * Live simulation so repeated polls return visibly changing data.
 * Each gate runs a repeating cycle:
 *   train approaching (eta counts down, gate goes closing_soon)
 *   → gate closed (eta 0)
 *   → reopens (next train).
 * The two gates are phase-shifted so they don't close at the same moment.
 */

const CYCLE_MS = 6 * 60 * 1000; // 6 min between trains
const CLOSED_MS = 90 * 1000; // gate stays closed 90s
const APPROACH_MS = CYCLE_MS - CLOSED_MS; // 4.5 min approaching window
const SPEED_KM_PER_SEC = 0.017; // ~61 km/h, for distance_km

/**
 * Demo gate layout around a center, as concentric "rings" of crossings.
 * Each ring is a distance (km) plus the compass bearings (°) its gates sit on.
 * A bigger search radius simply reaches further rings, so the client-side
 * haversine filter in useCrossingsInRadius reveals progressively more gates.
 * One near gate keeps a tiny radius non-empty; the outer rings extend past
 * MAX_RADIUS_KM (100) so even the widest search still has fresh gates to show.
 */
const GATE_RINGS: { km: number; bearings: number[] }[] = [
  { km: 0.4, bearings: [0] },
  { km: 1.5, bearings: [0, 120, 240] },
  { km: 3, bearings: [45, 165, 285] },
  { km: 5.5, bearings: [10, 130, 250] },
  { km: 8, bearings: [80, 200, 320] },
  { km: 13, bearings: [30, 150, 270] },
  { km: 20, bearings: [60, 180, 300] },
  { km: 32, bearings: [15, 135, 255] },
  { km: 49, bearings: [90, 210, 330] },
  { km: 75, bearings: [25, 145, 265] },
  { km: 95, bearings: [55, 175, 295] },
];

/** Total number of demo gates generated around a center (ids 1..N). */
const DEMO_GATE_COUNT = GATE_RINGS.reduce((n, ring) => n + ring.bearings.length, 0);

/** Locality names cycled through so generated gates read like real crossings. */
const GATE_NAME_POOL = [
  'Station Approach',
  'Link Road',
  'Market Yard',
  'Industrial Estate',
  'Canal Road',
  'Junction Road',
  'Mill Road',
  'Highway Crossing',
  'School Road',
  'Temple Street',
  'Farm Road',
  'Bazaar',
];

/**
 * Train numbers keyed by crossing id. The two fixed demo gates keep their
 * historical numbers; every generated gate (id 1..DEMO_GATE_COUNT) gets a
 * deterministic number so its status endpoint resolves (no 404 markers).
 */
const TRAINS: Record<number, string> = {
  123: '12625',
  200: '17644',
};
for (let id = 1; id <= DEMO_GATE_COUNT; id += 1) {
  TRAINS[id] = `11${String(id).padStart(3, '0')}`;
}

/** Milliseconds → "HH:mm:ss" (same shape as the original payload). */
function toHms(ms: number): string {
  return new Date(ms).toTimeString().slice(0, 8);
}

function liveStatusFor(id: number, train: string): CrossingStatus {
  const now = Date.now();
  const phase = (id * 37_000) % CYCLE_MS; // stagger the gates
  const t = (now + phase) % CYCLE_MS;
  const approachRemaining = APPROACH_MS - t;

  if (approachRemaining > 0) {
    const eta = Math.max(0, Math.round(approachRemaining / 1000));
    const closureMs = now + approachRemaining;
    const openingMs = closureMs + CLOSED_MS;
    return {
      crossing: id,
      train,
      distance_km: +(eta * SPEED_KM_PER_SEC).toFixed(1),
      eta_seconds: eta,
      predicted_closure: toHms(closureMs),
      predicted_opening: toHms(openingMs),
      confidence: eta <= 120 ? 0.9 : 0.6,
      updated_at: new Date(now).toISOString(),
    };
  }

  // Closed window (eta 0) — reopens once the cycle wraps.
  return {
    crossing: id,
    train,
    distance_km: 0,
    eta_seconds: 0,
    predicted_closure: toHms(now),
    predicted_opening: toHms(now + (CYCLE_MS - t)),
    confidence: 0.95,
    updated_at: new Date(now).toISOString(),
  };
}

export const crossings: Crossing[] = [
  { id: 123, name: 'MG Road Gate', lat: 12.9716, lng: 77.5946 },
  { id: 200, name: 'Ring Road Gate', lat: 12.9352, lng: 77.6245 },
];

/**
 * Convert a distance/bearing offset from a center into a lat/lng point.
 * Uses the standard "destination point" (direct) formula on a sphere, so the
 * km distances line up with the haversine filter used at read time.
 */
function offsetKm(center: { lat: number; lng: number }, distanceKm: number, bearingDeg: number) {
  const R = 6371; // earth radius km — matches haversineKm in lib/geo.ts
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const delta = distanceKm / R; // angular distance
  const theta = toRad(bearingDeg);
  const phi1 = toRad(center.lat);
  const lambda1 = toRad(center.lng);
  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta),
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2),
    );
  return { lat: +toDeg(phi2).toFixed(6), lng: +toDeg(lambda2).toFixed(6) };
}

/** Generate demo gates spread around a center so "Near me" always has gates. */
function makeCrossingsAround(center: { lat: number; lng: number }): Crossing[] {
  const gates: Crossing[] = [];
  let id = 1;
  for (const ring of GATE_RINGS) {
    for (const bearing of ring.bearings) {
      const { lat, lng } = offsetKm(center, ring.km, bearing);
      const name = `${GATE_NAME_POOL[(id - 1) % GATE_NAME_POOL.length]} Gate #${id}`;
      gates.push({ id, name, lat, lng });
      id += 1;
    }
  }
  return gates;
}

export const handlers = [
  http.get('/api/crossings', ({ request }) => {
    const url = new URL(request.url);
    const rawLat = url.searchParams.get('lat');
    const rawLng = url.searchParams.get('lng');
    // Only generate around a center when lat/lng are actually provided
    // (searchParams.get returns null when absent; Number(null) === 0 would
    // wrongly match this branch).
    if (rawLat !== null && rawLng !== null) {
      const lat = Number(rawLat);
      const lng = Number(rawLng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return HttpResponse.json(makeCrossingsAround({ lat, lng }));
      }
    }
    return HttpResponse.json(crossings);
  }),

  http.get('/api/crossings/:id/status', ({ params }) => {
    const id = Number(params.id);
    const train = TRAINS[id];
    if (!train) {
      return HttpResponse.json({ message: 'not found' }, { status: 404 });
    }
    return HttpResponse.json(liveStatusFor(id, train));
  }),

  http.get('/api/crossings/nearby', () => HttpResponse.json(crossings.slice(0, 1))),

  http.post('/api/reports', () => HttpResponse.json({ ok: true })),
];
