import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/** A fresh QueryClient per test — no retries, cache kept forever. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

/** Wrapper factory for renderHook / render tests that need TanStack Query. */
export function createWrapper() {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
}

/** A ready-made CrossingStatus fixture matching the domain payload. */
export const statusFixture = {
  crossing: 123,
  train: '12625',
  distance_km: 2.4,
  eta_seconds: 142,
  predicted_closure: '22:42:00',
  predicted_opening: '22:46:00',
  confidence: 0.82,
  updated_at: '2026-10-07T17:10:00Z',
} as const;