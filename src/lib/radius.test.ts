import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  RADIUS_PRESETS_KM,
  zoomForRadius,
} from './radius';

describe('radius constants', () => {
  it('offers 5, 10 and 15 km presets with 5 km as the default', () => {
    expect(RADIUS_PRESETS_KM).toEqual([5, 10, 15]);
    expect(RADIUS_PRESETS_KM).toContain(DEFAULT_RADIUS_KM);
  });

  it('keeps the custom range wider than every preset', () => {
    expect(MIN_RADIUS_KM).toBeGreaterThanOrEqual(1);
    expect(MAX_RADIUS_KM).toBeGreaterThan(Math.max(...RADIUS_PRESETS_KM));
  });
});

describe('zoomForRadius', () => {
  it('keeps the historical 5 km zoom of 13', () => {
    expect(zoomForRadius(5)).toBe(13);
  });

  it('zooms out as the radius grows', () => {
    expect(zoomForRadius(10)).toBe(12);
    expect(zoomForRadius(15)).toBe(11);
    expect(zoomForRadius(30)).toBeLessThan(zoomForRadius(15));
  });

  it('clamps to valid Google Maps zoom levels', () => {
    expect(zoomForRadius(0.0001)).toBeLessThanOrEqual(18);
    expect(zoomForRadius(100000)).toBeGreaterThanOrEqual(3);
  });
});