import { describe, expect, it } from 'vitest';
import { gateStateLabel, isPassingState, orderCrossingsForDisplay } from './passing';
import type { Crossing, CrossingStatus } from '../types/crossing';

const base: CrossingStatus = {
  crossing: 1,
  train: '12625',
  distance_km: 2.4,
  eta_seconds: 142,
  predicted_closure: '22:42:00',
  predicted_opening: '22:46:00',
  confidence: 0.82,
  updated_at: '2026-10-07T17:10:00Z',
};

const crossings: Crossing[] = [
  { id: 1, name: 'Gate A', lat: 12.9, lng: 77.5 },
  { id: 2, name: 'Gate B', lat: 12.91, lng: 77.51 },
  { id: 3, name: 'Gate C', lat: 12.92, lng: 77.52 },
  { id: 4, name: 'Gate D', lat: 12.93, lng: 77.53 },
];

describe('gateStateLabel', () => {
  it('maps every gate state to a label', () => {
    expect(gateStateLabel('open')).toBe('Open');
    expect(gateStateLabel('closing_soon')).toBe('Closing soon');
    expect(gateStateLabel('closed')).toBe('Closed');
    expect(gateStateLabel('unknown')).toBe('Unknown');
  });
});

describe('isPassingState', () => {
  it('is true for closed and closing_soon', () => {
    expect(isPassingState('closed')).toBe(true);
    expect(isPassingState('closing_soon')).toBe(true);
  });

  it('is false for open and unknown', () => {
    expect(isPassingState('open')).toBe(false);
    expect(isPassingState('unknown')).toBe(false);
  });
});

describe('orderCrossingsForDisplay', () => {
  it('sorts passing gates (closed / closing soon) before the rest', () => {
    const statuses: Record<number, CrossingStatus> = {
      1: { ...base, crossing: 1, eta_seconds: 300 }, // open
      2: { ...base, crossing: 2, eta_seconds: 0 }, // closed
      3: { ...base, crossing: 3, eta_seconds: 45 }, // closing soon
      4: { ...base, crossing: 4, eta_seconds: 600 }, // open
    };

    const result = orderCrossingsForDisplay(crossings, statuses);
    // Passing first (closed before closing-soon), then open gates in input order.
    expect(result.map((r) => r.crossing.id)).toEqual([2, 3, 1, 4]);
  });

  it('orders passing gates soonest-first by ETA', () => {
    const statuses: Record<number, CrossingStatus> = {
      1: { ...base, crossing: 1, eta_seconds: 50 }, // closing soon
      2: { ...base, crossing: 2, eta_seconds: 30 }, // closing soon
      3: { ...base, crossing: 3, eta_seconds: 20 }, // closing soon
    };

    const result = orderCrossingsForDisplay(crossings, statuses);
    expect(result.slice(0, 3).map((r) => r.status?.eta_seconds)).toEqual([20, 30, 50]);
  });

  it('keeps non-passing gates in their original order', () => {
    const statuses: Record<number, CrossingStatus> = {
      1: { ...base, crossing: 1, eta_seconds: 300 },
      2: { ...base, crossing: 2, eta_seconds: 600 },
    };

    const result = orderCrossingsForDisplay(crossings, statuses);
    expect(result.map((r) => r.crossing.id)).toEqual([1, 2, 3, 4]);
  });

  it('treats crossings without a live status as open', () => {
    const result = orderCrossingsForDisplay(crossings, {});
    expect(result).toHaveLength(4);
    expect(result.every((r) => r.state === 'open')).toBe(true);
    expect(result.every((r) => r.status === undefined)).toBe(true);
  });

  it('exposes the derived gate state on each row', () => {
    const statuses: Record<number, CrossingStatus> = {
      2: { ...base, crossing: 2, eta_seconds: 0 },
    };

    const result = orderCrossingsForDisplay(crossings, statuses);
    const rowB = result.find((r) => r.crossing.id === 2);
    expect(rowB?.state).toBe('closed');
  });

  it('returns an empty list for no crossings', () => {
    expect(orderCrossingsForDisplay([], {})).toEqual([]);
  });
});

