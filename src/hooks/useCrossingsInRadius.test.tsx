import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createWrapper } from '../test/utils';
import { haversineKm } from '../lib/geo';
import { useCrossingsInRadius } from './useCrossingsInRadius';

describe('useCrossingsInRadius', () => {
  it('returns only crossings within the configured radius', async () => {
    const { Wrapper } = createWrapper();
    // The mock generates gates around the center; the nearest sits ~0.4 km out,
    // so a 1 km radius keeps just that one.
    const { result } = renderHook(() => useCrossingsInRadius({ lat: 12.9716, lng: 77.5946 }, 1), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.length).toBe(1));
    expect(result.current[0].id).toBe(1);
  });

  it('includes farther crossings when the radius is large enough', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCrossingsInRadius({ lat: 12.9716, lng: 77.5946 }, 10), {
      wrapper: Wrapper,
    });
    // A 10 km ring set reaches the 0.4/1.5/3/5.5/8 km rings → 13 gates (ids 1..13).
    await waitFor(() => expect(result.current.length).toBe(13));
    expect(result.current.map((c) => c.id)).toEqual(
      expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
    );
  });

  it('adds more crossings as the radius grows (monotonic, all within radius)', async () => {
    const center = { lat: 12.9716, lng: 77.5946 };
    const countAt = async (radiusKm: number) => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCrossingsInRadius(center, radiusKm), {
        wrapper: Wrapper,
      });
      await waitFor(() => expect(result.current.length).toBeGreaterThan(0));
      // Every returned gate must genuinely lie inside the requested radius.
      result.current.forEach((c) => expect(haversineKm(center, c)).toBeLessThanOrEqual(radiusKm));
      return result.current.length;
    };

    const at5 = await countAt(5);
    const at10 = await countAt(10);
    const at15 = await countAt(15);
    const at25 = await countAt(25);
    const at100 = await countAt(100);

    // Growing the radius must reveal strictly more gates, up to the full set.
    expect(at10).toBeGreaterThan(at5);
    expect(at15).toBeGreaterThan(at10);
    expect(at25).toBeGreaterThan(at15);
    expect(at100).toBeGreaterThan(at25);
  });

  it('returns an empty list when there is no center', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCrossingsInRadius(null, 5), { wrapper: Wrapper });
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('refetches gates around the new center when the user moves (live location)', async () => {
    const { Wrapper } = createWrapper();
    const first = { lat: 12.9716, lng: 77.5946 };
    const moved = { lat: 28.6139, lng: 77.209 }; // Delhi — far from Bangalore

    const { result, rerender } = renderHook(
      ({ center }) => useCrossingsInRadius(center, 10),
      { wrapper: Wrapper, initialProps: { center: first } },
    );
    await waitFor(() => expect(result.current.length).toBe(13));
    const before = result.current.map((c) => ({ lat: c.lat, lng: c.lng }));

    rerender({ center: moved });
    await waitFor(() => {
      expect(result.current.length).toBe(13);
      // Gates regenerated around the NEW position — all within ~0.1° of Delhi.
      expect(result.current.every((c) => Math.abs(c.lat - moved.lat) < 0.1)).toBe(true);
      expect(result.current.every((c) => Math.abs(c.lng - moved.lng) < 0.1)).toBe(true);
    });

    // Sanity: the old positions (Bangalore) are gone.
    expect(result.current.map((c) => ({ lat: c.lat, lng: c.lng }))).not.toEqual(before);
  });
});
