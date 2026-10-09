import { useQuery } from '@tanstack/react-query';
import { fetchCrossingStatus } from '../api/crossings';
import { crossingKeys } from '../lib/queryKeys';
import { statusPollFromEta } from './statusPolling';

/** Live status for one crossing, with adaptive polling that speeds up as the train nears. */
export function useCrossingStatus(id: number | null | undefined) {
  return useQuery({
    queryKey: crossingKeys.detail(id),
    queryFn: () => fetchCrossingStatus(id as number),
    enabled: id != null,
    refetchInterval: (query) => statusPollFromEta(query.state.data),
  });
}