import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide QueryClient.
 * - staleTime 15s: crossing predictions go stale quickly, but not so fast that we
 *   refetch every keystroke/frame.
 * - gcTime 5min: keep unused query data around while drivers pan the map.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: 2,
      // Avoid bursts of refetches every time the tab regains focus.
      refetchOnWindowFocus: false,
    },
  },
});