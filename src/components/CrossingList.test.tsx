import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CrossingList } from './CrossingList';
import { statusFixture } from '../test/utils';

const crossing = { id: 123, name: 'MG Road Gate', lat: 12.9716, lng: 77.5946 };

describe('CrossingList', () => {
  it('renders each crossing with its countdown', () => {
    render(<CrossingList crossings={[crossing]} statuses={{ 123: statusFixture }} onReport={() => {}} />);

    expect(screen.getByText('MG Road Gate')).toBeInTheDocument();
    expect(screen.getByText('2m 22s')).toBeInTheDocument();
  });

  it('reports a train sighting through the onReport callback', async () => {
    const onReport = vi.fn();
    const user = userEvent.setup();

    render(<CrossingList crossings={[crossing]} statuses={{ 123: statusFixture }} onReport={onReport} />);

    await user.click(screen.getByRole('button', { name: /report train/i }));
    expect(onReport).toHaveBeenCalledWith({ crossing: 123, train: '12625' });
  });

  it('shows the empty state when there are no crossings', () => {
    render(<CrossingList crossings={[]} statuses={{}} onReport={() => {}} />);
    expect(screen.getByText(/No crossings found/)).toBeInTheDocument();
  });
});