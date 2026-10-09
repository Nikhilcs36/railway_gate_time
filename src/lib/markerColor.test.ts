import { describe, expect, it } from 'vitest';
import { MARKER_COLORS, markerColor } from './markerColor';

describe('markerColor', () => {
  it('maps every gate state to a distinct color', () => {
    expect(markerColor('open')).toBe('#16a34a');
    expect(markerColor('closing_soon')).toBe('#f59e0b');
    expect(markerColor('closed')).toBe('#dc2626');
    expect(markerColor('unknown')).toBe('#6b7280');
  });

  it('covers all gate states in the palette', () => {
    const states = ['open', 'closing_soon', 'closed', 'unknown'] as const;
    for (const state of states) {
      expect(MARKER_COLORS[state]).toBeTruthy();
    }
  });
});