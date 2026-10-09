import { http, HttpResponse } from 'msw';
import type { Crossing, CrossingStatus } from '../types/crossing';

/** In-memory "database" backing the mock API. */
export const statuses: Record<number, CrossingStatus> = {
  123: {
    crossing: 123,
    train: '12625',
    distance_km: 2.4,
    eta_seconds: 142,
    predicted_closure: '22:42:00',
    predicted_opening: '22:46:00',
    confidence: 0.82,
    updated_at: '2026-10-07T17:10:00Z',
  },
  200: {
    crossing: 200,
    train: '17644',
    distance_km: 5.1,
    eta_seconds: 900,
    predicted_closure: '23:12:00',
    predicted_opening: '23:15:00',
    confidence: 0.75,
    updated_at: '2026-10-07T17:11:00Z',
  },
};

export const crossings: Crossing[] = [
  { id: 123, name: 'MG Road Gate', lat: 12.9716, lng: 77.5946 },
  { id: 200, name: 'Ring Road Gate', lat: 12.9352, lng: 77.6245 },
];

export const handlers = [
  http.get('/api/crossings', () => HttpResponse.json(crossings)),

  http.get('/api/crossings/:id/status', ({ params }) => {
    const id = Number(params.id);
    const status = statuses[id];
    if (!status) {
      return HttpResponse.json({ message: 'not found' }, { status: 404 });
    }
    return HttpResponse.json(status);
  }),

  http.get('/api/crossings/nearby', () => HttpResponse.json(crossings.slice(0, 1))),

  http.post('/api/reports', () => HttpResponse.json({ ok: true })),
];