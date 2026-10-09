import { useQuery } from '@tanstack/react-query';
import { fetchCrossings } from '../api/crossings';
import { crossingKeys } from '../lib/queryKeys';
import type { GeoPoint } from '../types/crossing';

export function useCrossings(center?: GeoPoint | null) {
  return useQuery({
    queryKey: crossingKeys.list(center ?? 'all'),
    queryFn: () => fetchCrossings(center ?? undefined),
    refetchInterval: 30_000,
  });
}