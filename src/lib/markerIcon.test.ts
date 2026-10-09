import { describe, expect, it } from 'vitest';
import { markerIconUrl } from './markerIcon';

describe('markerIconUrl', () => {
  it('produces an SVG data URL embedding the given color', () => {
    const url = markerIconUrl('#dc2626');
    expect(url.startsWith('data:image/svg+xml')).toBe(true);
    expect(decodeURIComponent(url)).toContain('#dc2626');
  });
});