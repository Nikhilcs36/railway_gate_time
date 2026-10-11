import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CrossingList } from './CrossingList';
import type { Crossing, CrossingStatus } from '../types/crossing';

const crossing = { id: 123, name: 'MG Road Gate', lat: 12.9716, lng: 77.5946 };

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

const crossings: Crossing[] = [
  { id: 1, name: 'Gate A', lat: 12.9, lng: 77.5 },
  { id: 2, name: 'Gate B', lat: 12.91, lng: 77.51 },
  { id: 3, name: 'Gate C', lat: 12.92, lng: 77.52 },
];

describe('CrossingList', () => {
  it('renders each crossing with its countdown', () => {
    render(<CrossingList crossings={[crossing]} statuses={{ 123: base }} onReport={() => {}} />);

    expect(screen.getByText('MG Road Gate')).toBeInTheDocument();
    expect(screen.getByText('2m 22s')).toBeInTheDocument();
  });

  it('reports a train sighting through the onReport callback', async () => {
    const onReport = vi.fn();
    const user = userEvent.setup();

    render(<CrossingList crossings={[crossing]} statuses={{ 123: base }} onReport={onReport} />);

    await user.click(screen.getByRole('button', { name: /report train/i }));
    expect(onReport).toHaveBeenCalledWith({ crossing: 123, train: '12625' });
  });

  it('shows the empty state when there are no crossings', () => {
    render(<CrossingList crossings={[]} statuses={{}} onReport={() => {}} />);
    expect(screen.getByText(/No crossings found/)).toBeInTheDocument();
  });

  it('merges gate status and train detail onto one row, passing gates first', () => {
    const statuses: Record<number, CrossingStatus> = {
      1: { ...base, crossing: 1, eta_seconds: 45 }, // closing soon
      2: { ...base, crossing: 2, eta_seconds: 0, train: '17644' }, // closed
      3: { ...base, crossing: 3, eta_seconds: 600 }, // open (excluded from passing)
    };

    render(<CrossingList crossings={crossings} statuses={statuses} onReport={() => {}} />);

    // Summary reflects the two passing gates.
    expect(screen.getByTestId('crossing-summary')).toHaveTextContent('2 of 3 gates with a train passing');

    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows).toHaveLength(3);

    // Passing gates sorted to the top, soonest first: closed (B) then closing-soon (A).
    expect(within(rows[0]).getByText('Gate B')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Closed')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Train 17644')).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Opens 22:46:00/)).toBeInTheDocument();

    expect(within(rows[1]).getByText('Gate A')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Closing soon')).toBeInTheDocument();

    expect(within(rows[2]).getByText('Gate C')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Open')).toBeInTheDocument();
  });

  it('shows a fallback and no report button for gates without a live status', () => {
    render(<CrossingList crossings={crossings} statuses={{}} onReport={() => {}} />);

    expect(screen.getByTestId('crossing-summary')).toHaveTextContent('0 of 3 gates');
    expect(screen.getAllByText(/No active train — gate open/)).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /report train/i })).not.toBeInTheDocument();
  });

  it('uses a singular label when exactly one gate is shown', () => {
    render(<CrossingList crossings={[crossing]} statuses={{}} onReport={() => {}} />);
    expect(screen.getByTestId('crossing-summary')).toHaveTextContent('0 of 1 gate with a train passing');
  });
});
