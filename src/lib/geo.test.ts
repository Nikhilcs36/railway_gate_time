import { describe, expect, it } from 'vitest';
import { haversineKm } from './geo';

describe('haversineKm', () => {
  it('returns ~0 for a point compared to itself', () => {
    const p = { lat: 12.9716, lng: 77.5946 };
    expect(haversineKm(p, p)).toBeLessThan(0.001);
  });

  it('matches the ~111 km per degree of latitude rule', () => {
    // 0.01 deg of latitude ≈ 1.11 km
    const d = haversineKm({ lat: 12.9716, lng: 77.5946 }, { lat: 12.9816, lng: 77.5946 });
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
  });

  it('returns the same distance regardless of argument order', () => {
    const a = { lat: 12.9716, lng: 77.5946 };
    const b = { lat: 12.9352, lng: 77.6245 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});
