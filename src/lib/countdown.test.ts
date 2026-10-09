import { describe, expect, it } from 'vitest';
import { crossingState, formatEta } from './countdown';
import type { CrossingStatus } from '../types/crossing';

const base: CrossingStatus = {
  crossing: 123,
  train: '12625',
  distance_km: 2.4,
  eta_seconds: 142,
  predicted_closure: '22:42:00',
  predicted_opening: '22:46:00',
  confidence: 0.82,
  updated_at: '2026-10-07T17:10:00Z',
};

describe('crossingState', () => {
  it('is open when the train is far away', () => {
    expect(crossingState({ ...base, eta_seconds: 600 })).toBe('open');
  });

  it('is closing soon when the train is within 60 seconds', () => {
    expect(crossingState({ ...base, eta_seconds: 45 })).toBe('closing_soon');
  });

  it('is closed when the ETA reaches zero', () => {
    expect(crossingState({ ...base, eta_seconds: 0 })).toBe('closed');
  });

  it('is unknown when confidence is low', () => {
    expect(crossingState({ ...base, confidence: 0.1 })).toBe('unknown');
  });
});

describe('formatEta', () => {
  it('formats minutes and seconds', () => {
    expect(formatEta(142)).toBe('2m 22s');
  });

  it('zero-pads the seconds', () => {
    expect(formatEta(120)).toBe('2m 00s');
  });

  it('clamps negative values to zero', () => {
    expect(formatEta(-5)).toBe('0m 00s');
  });
});