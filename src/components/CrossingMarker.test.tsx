import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CrossingMarker } from './CrossingMarker';
import { CrossingInfoWindow } from './CrossingInfoWindow';
import { statusFixture } from '../test/utils';

vi.mock('@react-google-maps/api', () => ({
  Marker: ({
    position,
    title,
    onClick,
  }: {
    position?: { lat: number; lng: number };
    title?: string;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      data-testid={`marker-${title}`}
      data-lat={position?.lat}
      data-lng={position?.lng}
      onClick={onClick}
    />
  ),
  InfoWindow: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

describe('CrossingMarker', () => {
  it('renders at the crossing position', () => {
    render(
      <CrossingMarker
        crossing={{ id: 123, name: 'MG Road Gate', lat: 12.9716, lng: 77.5946 }}
        status={statusFixture}
        onSelect={() => {}}
      />,
    );

    const marker = screen.getByTestId('marker-MG Road Gate');
    expect(marker).toHaveAttribute('data-lat', '12.9716');
    expect(marker).toHaveAttribute('data-lng', '77.5946');
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(
      <CrossingMarker
        crossing={{ id: 123, name: 'MG Road Gate', lat: 12.9716, lng: 77.5946 }}
        status={statusFixture}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByTestId('marker-MG Road Gate'));
    expect(onSelect).toHaveBeenCalledWith(123);
  });

  it('renders without an icon when there is no active status', () => {
    render(
      <CrossingMarker
        crossing={{ id: 123, name: 'MG Road Gate', lat: 12.9716, lng: 77.5946 }}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByTestId('marker-MG Road Gate')).toBeInTheDocument();
  });
});

describe('CrossingInfoWindow', () => {
  it('renders within a mocked Google InfoWindow without throwing', () => {
    render(<CrossingInfoWindow crossingName="MG Road Gate" status={statusFixture} />);
    expect(screen.getByText(/Closes: 22:42:00/)).toBeInTheDocument();
  });
});