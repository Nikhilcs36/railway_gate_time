import type { CrossingStatus } from '../types/crossing';

/**
 * Adaptive polling cadence based on how close the train is.
 * Pure → unit-testable.
 */
export function statusRefetchInterval(etaSeconds?: number): number {
  if (etaSeconds == null) return 15_000;
  if (etaSeconds <= 120) return 5_000;
  if (etaSeconds <= 300) return 10_000;
  return 30_000;
}

/** Extract the ETA from a TanStack Query's state to compute the polling interval. */
export function statusPollFromEta(data: unknown): number {
  return statusRefetchInterval((data as CrossingStatus | undefined)?.eta_seconds);
}