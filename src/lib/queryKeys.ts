import type { GeoPoint } from '../types/crossing';

/**
 * Round a coordinate so tiny GPS jitter (a few metres) does not create a new
 * query key / refetch on every watchPosition tick. 3 decimals ≈ 110 m, well
 * within even the smallest search radius while keeping refetch storms away.
 */
function stabilize(point: GeoPoint): GeoPoint {
  return { lat: +point.lat.toFixed(3), lng: +point.lng.toFixed(3) };
}

/**
 * Query key factory — keeps cache keys consistent and enables precise
 * invalidation (e.g. invalidate one crossing detail vs. everything).
 */
export const crossingKeys = {
  all: ['crossings'] as const,
  lists: () => [...crossingKeys.all, 'list'] as const,
  list: (filter: string | GeoPoint) =>
    [
      ...crossingKeys.lists(),
      typeof filter === 'string' ? { filter } : { center: stabilize(filter) },
    ] as const,
  details: () => [...crossingKeys.all, 'detail'] as const,
  detail: (id: number | null | undefined) => [...crossingKeys.details(), id] as const,
  nearby: (lat: number, lng: number, radiusKm: number) =>
    [...crossingKeys.all, 'nearby', { lat, lng, radiusKm }] as const,
};