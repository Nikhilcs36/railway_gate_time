import type { GateState } from '../types/crossing';

/** Marker colors per gate state. Pure mapping → unit-testable. */
export const MARKER_COLORS: Record<GateState, string> = {
  open: '#16a34a', // green
  closing_soon: '#f59e0b', // amber
  closed: '#dc2626', // red
  unknown: '#6b7280', // gray
};

export function markerColor(state: GateState): string {
  return MARKER_COLORS[state];
}