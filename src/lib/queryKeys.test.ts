import { describe, expect, it } from 'vitest';
import { crossingKeys } from './queryKeys';

describe('crossingKeys (query key factory)', () => {
  it('builds a namespaced detail key', () => {
    expect(crossingKeys.detail(123)).toEqual(['crossings', 'detail', 123]);
  });

  it('builds a nearby key including geo point and radius', () => {
    expect(crossingKeys.nearby(12.9716, 77.5946, 5)).toEqual([
      'crossings',
      'nearby',
      { lat: 12.9716, lng: 77.5946, radiusKm: 5 },
    ]);
  });

  it('builds a list key with filter', () => {
    expect(crossingKeys.list('all')).toEqual(['crossings', 'list', { filter: 'all' }]);
  });

  it('builds a list key for a center point', () => {
    expect(crossingKeys.list({ lat: 12.9, lng: 77.5 })).toEqual([
      'crossings',
      'list',
      { center: { lat: 12.9, lng: 77.5 } },
    ]);
  });

  it('stabilizes GPS jitter so tiny position changes reuse the same key', () => {
    // ~10 m apart — should NOT produce a new key (avoids refetch storms).
    const a = crossingKeys.list({ lat: 12.9716, lng: 77.5946 });
    const b = crossingKeys.list({ lat: 12.9717, lng: 77.5947 });
    expect(a).toEqual(b);

    // A move beyond ~110 m DOES produce a new key.
    const far = crossingKeys.list({ lat: 12.98, lng: 77.6 });
    expect(far).not.toEqual(a);
  });

  it('keeps a shared root across branches for broad invalidation', () => {
    expect(crossingKeys.detail(1)[0]).toBe('crossings');
    expect(crossingKeys.nearby(0, 0, 1)[0]).toBe('crossings');
    expect(crossingKeys.list('all')[0]).toBe('crossings');
  });
});