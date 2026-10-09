import type { CrossingStatus, GateState } from '../types/crossing';

const LOW_CONFIDENCE = 0.3;
const CLOSING_SOON_SECONDS = 60;

/** Derive the gate state from a live status payload. Pure → unit-testable. */
export function crossingState(s: CrossingStatus): GateState {
  if (s.confidence < LOW_CONFIDENCE) return 'unknown';
  if (s.eta_seconds <= 0) return 'closed';
  if (s.eta_seconds <= CLOSING_SOON_SECONDS) return 'closing_soon';
  return 'open';
}

/** Format an ETA in seconds as "2m 22s". */
export function formatEta(etaSeconds: number): string {
  const total = Math.max(0, Math.floor(etaSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}