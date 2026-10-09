import { useMemo } from 'react';
import { useCrossings } from './useCrossings';
import { haversineKm } from '../lib/geo';
import { DEFAULT_RADIUS_KM } from '../lib/radius';
import type { Crossing, GeoPoint } from '../types/crossing';

/**
 * Crossings within `radiusKm` of a center point, filtered client-side from the
 * (already cached) full crossings list. Reuses the `useCrossings` query cache,
 * so no extra network call.
 */
export function useCrossingsInRadius(
  center: GeoPoint | null,
  radiusKm = DEFAULT_RADIUS_KM,
): Crossing[] {
  // Fetch gates generated around the center (see mock handler) so the result is
  // never empty just because the fixed demo gates live far away.
  const { data: all = [] } = useCrossings(center);
  return useMemo(
    () => (center ? all.filter((c) => haversineKm(center, c) <= radiusKm) : []),
    [all, center, radiusKm],
  );
}