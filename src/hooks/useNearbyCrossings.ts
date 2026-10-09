import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchNearbyCrossings } from '../api/crossings';
import { crossingKeys } from '../lib/queryKeys';
import type { GeoBounds } from '../types/crossing';

/**
 * Crossings inside the current map viewport. `keepPreviousData` keeps the
 * old markers visible while the user pans.
 */
export function useNearbyCrossings(bounds: GeoBounds | null) {
  const fallback: GeoBounds = { north: 0, south: 0, east: 0, west: 0 };
  return useQuery({
    queryKey: crossingKeys.nearby(bounds?.north ?? 0, bounds?.south ?? 0, 0),
    queryFn: () => fetchNearbyCrossings(bounds ?? fallback),
    enabled: bounds != null,
    placeholderData: keepPreviousData,
  });
}