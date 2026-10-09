import { useQueries } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { fetchCrossingStatus } from '../api/crossings';
import { crossingKeys } from '../lib/queryKeys';
import { statusPollFromEta } from './statusPolling';
import type { CrossingStatus } from '../types/crossing';

/** Typed per-crossing query options (keeps `refetchInterval` callback typed). */
function statusQueryOptions(
  id: number,
): UseQueryOptions<CrossingStatus, Error, CrossingStatus, readonly unknown[]> {
  return {
    queryKey: crossingKeys.detail(id),
    queryFn: () => fetchCrossingStatus(id),
    refetchInterval: (query) => statusPollFromEta(query.state.data),
  };
}

/** Fetch live status for many crossings at once, using `useQueries`. */
export function useCrossingStatuses(ids: number[]) {
  const results = useQueries({ queries: ids.map(statusQueryOptions) });

  const statuses = results.reduce<Record<number, CrossingStatus>>((acc, query, index) => {
    if (query.data) acc[ids[index]] = query.data;
    return acc;
  }, {});

  return {
    statuses,
    isLoading: results.some((q) => q.isLoading),
    isError: results.some((q) => q.isError),
  };
}