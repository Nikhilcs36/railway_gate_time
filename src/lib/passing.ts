import type { Crossing, CrossingStatus, GateState } from '../types/crossing';
import { crossingState } from './countdown';

/**
 * A gate counts as "a train passing right now" when it is closed (train is over
 * the crossing) or closing soon (train is about to reach it).
 */
export const PASSING_STATES: GateState[] = ['closed', 'closing_soon'];

const GATE_STATE_LABELS: Record<GateState, string> = {
  open: 'Open',
  closing_soon: 'Closing soon',
  closed: 'Closed',
  unknown: 'Unknown',
};

/** Human-readable label for a gate state. */
export function gateStateLabel(state: GateState): string {
  return GATE_STATE_LABELS[state];
}

/** True when the gate state means a train is currently passing. */
export function isPassingState(state: GateState): boolean {
  return PASSING_STATES.includes(state);
}

export interface CrossingRow {
  crossing: Crossing;
  status?: CrossingStatus;
  state: GateState;
}

/**
 * Build one row per crossing for the unified list, ordered so the gates with a
 * train currently passing (closed / closing soon) come first, soonest ETA first;
 * every other gate keeps its input order. Crossings without a live status are
 * treated as open. Pure → unit-testable.
 */
export function orderCrossingsForDisplay(
  crossings: Crossing[],
  statuses: Record<number, CrossingStatus>,
): CrossingRow[] {
  const rows = crossings.map((crossing) => {
    const status = statuses[crossing.id];
    const state = status ? crossingState(status) : 'open';
    return { crossing, status, state };
  });

  // Decorate with a sort key so we never mutate the crossing order in place.
  return rows
    .map((row, index) => ({
      row,
      group: isPassingState(row.state) ? 0 : 1,
      eta: row.state === 'closed' ? -1 : (row.status?.eta_seconds ?? Number.POSITIVE_INFINITY),
      index,
    }))
    .sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      // Within the passing group, soonest first. Non-passing keep input order.
      if (a.group === 0 && a.eta !== b.eta) return a.eta - b.eta;
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}

