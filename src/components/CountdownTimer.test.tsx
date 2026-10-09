import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CountdownTimer } from './CountdownTimer';

describe('CountdownTimer', () => {
  it('renders the remaining time as minutes and seconds', () => {
    render(<CountdownTimer etaSeconds={142} />);
    expect(screen.getByTestId('countdown')).toHaveTextContent('2m 22s');
  });

  it('shows zeroes when there is no time left', () => {
    render(<CountdownTimer etaSeconds={0} />);
    expect(screen.getByTestId('countdown')).toHaveTextContent('0m 00s');
  });
});