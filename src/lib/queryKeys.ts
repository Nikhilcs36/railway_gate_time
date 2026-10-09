/**
 * Query key factory — keeps cache keys consistent and enables precise
 * invalidation (e.g. invalidate one crossing detail vs. everything).
 */
export const crossingKeys = {
  all: ['crossings'] as const,
  lists: () => [...crossingKeys.all, 'list'] as const,
  list: (filter: string) => [...crossingKeys.lists(), { filter }] as const,
  details: () => [...crossingKeys.all, 'detail'] as const,
  detail: (id: number | null | undefined) => [...crossingKeys.details(), id] as const,
  nearby: (lat: number, lng: number, radiusKm: number) =>
    [...crossingKeys.all, 'nearby', { lat, lng, radiusKm }] as const,
};