import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CrossingMap } from './CrossingMap';

// Shared fake map instance so assertions can inspect panTo/setZoom calls.
const { fakeMap } = vi.hoisted(() => ({
  fakeMap: {
    panTo: vi.fn(),
    setZoom: vi.fn(),
    addListener: vi.fn(),
    getBounds: vi.fn(() => null),
  },
}));

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: true, loadError: null }),
  GoogleMap: ({
    children,
    onLoad,
  }: {
    children?: React.ReactNode;
    onLoad?: (map: typeof fakeMap) => void;
  }) => {
    // Simulate the library loading the map once on mount.
    vi.mocked(onLoad ?? (() => {}))(fakeMap);
    return <div data-testid="google-map">{children}</div>;
  },
  Marker: ({
    position,
    title,
  }: {
    position?: { lat: number; lng: number };
    title?: string;
  }) => (
    <div
      data-testid={`marker-${title ?? 'unnamed'}`}
      data-lat={position?.lat}
      data-lng={position?.lng}
    />
  ),
  CircleF: ({
    center,
    radius,
  }: {
    center?: { lat: number; lng: number };
    radius?: number;
  }) => (
    <div
      data-testid="radius-circle"
      data-lat={center?.lat}
      data-lng={center?.lng}
      data-radius={radius}
    />
  ),
}));

const noop = () => {};
const baseProps = {
  apiKey: 'test-key',
  crossings: [],
  onBoundsChange: noop,
  onSelect: noop,
};

describe('CrossingMap live recenter', () => {
  it('pans to the override center once the map loads', () => {
    render(
      <CrossingMap
        {...baseProps}
        centerOverride={{ lat: 12.97, lng: 77.59 }}
        radiusKm={5}
        userLocation={{ lat: 12.97, lng: 77.59 }}
      />,
    );
    expect(fakeMap.panTo).toHaveBeenCalledWith({ lat: 12.97, lng: 77.59 });
    expect(fakeMap.setZoom).toHaveBeenCalledWith(13);
  });

  it('recenters and follows when the user position changes (live watch tick)', () => {
    const { rerender } = render(
      <CrossingMap
        {...baseProps}
        centerOverride={{ lat: 12.97, lng: 77.59 }}
        radiusKm={5}
        userLocation={{ lat: 12.97, lng: 77.59 }}
      />,
    );
    fakeMap.panTo.mockClear();

    rerender(
      <CrossingMap
        {...baseProps}
        centerOverride={{ lat: 13.05, lng: 77.65 }}
        radiusKm={5}
        userLocation={{ lat: 13.05, lng: 77.65 }}
      />,
    );

    expect(fakeMap.panTo).toHaveBeenCalledWith({ lat: 13.05, lng: 77.65 });
    expect(fakeMap.setZoom).toHaveBeenCalledWith(13);

    // The blue marker must move with the user, too.
    expect(screen.getByTestId('marker-You are here')).toHaveAttribute('data-lat', '13.05');
    expect(screen.getByTestId('marker-You are here')).toHaveAttribute('data-lng', '77.65');
    // The radius circle follows the new center.
    expect(screen.getByTestId('radius-circle')).toHaveAttribute('data-lat', '13.05');
  });

  it('renders the user marker and radius circle only when provided', () => {
    render(<CrossingMap {...baseProps} />);
    expect(screen.queryByTestId('marker-You are here')).not.toBeInTheDocument();
    expect(screen.queryByTestId('radius-circle')).not.toBeInTheDocument();
  });

  it('ignores sub-threshold GPS jitter but follows real movement', () => {
    const start = { lat: 12.97, lng: 77.59 };
    const { rerender } = render(
      <CrossingMap
        {...baseProps}
        centerOverride={start}
        radiusKm={5}
        userLocation={start}
      />,
    );
    expect(fakeMap.panTo).toHaveBeenCalledWith(start);
    fakeMap.panTo.mockClear();

    // ~1 m of jitter — must NOT re-pan (would fight the user's own panning).
    const jitter = { lat: 12.97001, lng: 77.59001 };
    rerender(
      <CrossingMap
        {...baseProps}
        centerOverride={jitter}
        radiusKm={5}
        userLocation={jitter}
      />,
    );
    expect(fakeMap.panTo).not.toHaveBeenCalled();

    // ~1 km move — past the 200 m threshold, must pan.
    const moved = { lat: 12.98, lng: 77.6 };
    rerender(
      <CrossingMap
        {...baseProps}
        centerOverride={moved}
        radiusKm={5}
        userLocation={moved}
      />,
    );
    expect(fakeMap.panTo).toHaveBeenCalledWith(moved);
    expect(fakeMap.setZoom).toHaveBeenCalledWith(13);
  });

  it('re-zooms without re-panning when only the radius changes', () => {
    const point = { lat: 12.97, lng: 77.59 };
    const { rerender } = render(
      <CrossingMap
        {...baseProps}
        centerOverride={point}
        radiusKm={5}
        userLocation={point}
      />,
    );
    // Clear the initial pan + zoom so we observe only the radius change.
    fakeMap.panTo.mockClear();
    fakeMap.setZoom.mockClear();

    // User picks 15 km: the circle grows, so the map must zoom out to 11…
    rerender(
      <CrossingMap
        {...baseProps}
        centerOverride={point}
        radiusKm={15}
        userLocation={point}
      />,
    );
    expect(fakeMap.setZoom).toHaveBeenCalledWith(11);
    // …but the center must NOT jump (they may be panning/browsing).
    expect(fakeMap.panTo).not.toHaveBeenCalled();
    expect(screen.getByTestId('radius-circle')).toHaveAttribute('data-radius', '15000');
  });
});