import { useQuery } from '@tanstack/react-query';
import { fetchCrossings } from '../api/crossings';
import { crossingKeys } from '../lib/queryKeys';

export function useCrossings() {
  return useQuery({
    queryKey: crossingKeys.list('all'),
    queryFn: fetchCrossings,
    refetchInterval: 30_000,
  });
}