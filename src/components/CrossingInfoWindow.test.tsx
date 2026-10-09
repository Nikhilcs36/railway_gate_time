import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CrossingInfoWindow } from './CrossingInfoWindow';
import { statusFixture } from '../test/utils';

describe('CrossingInfoWindow', () => {
  it('shows the crossing name and predicted closure times', () => {
    render(<CrossingInfoWindow crossingName="MG Road Gate" status={statusFixture} />);

    expect(screen.getByRole('heading', { name: 'MG Road Gate' })).toBeInTheDocument();
    expect(screen.getByText(/Train: 12625/)).toBeInTheDocument();
    expect(screen.getByText(/Closes: 22:42:00/)).toBeInTheDocument();
    expect(screen.getByText(/Opens: 22:46:00/)).toBeInTheDocument();
    expect(screen.getByText(/Confidence: 82%/)).toBeInTheDocument();
  });

  it('falls back when no active train is present', () => {
    render(<CrossingInfoWindow crossingName="MG Road Gate" />);
    expect(screen.getByText(/No active train/)).toBeInTheDocument();
  });
});