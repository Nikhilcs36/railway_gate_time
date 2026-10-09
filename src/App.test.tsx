import { render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { createWrapper } from './test/utils';

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: true, loadError: null }),
  GoogleMap: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  Marker: ({ title }: { title?: string }) => <div>{title}</div>,
}));

describe('App (integration smoke test)', () => {
  it('loads crossings and renders them in the list', async () => {
    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <App />
      </Wrapper>,
    );

    // The map may also render crossing names as markers, so scope the assertion
    // to the list (with a real API key set, both the map and the list render).
    const list = await screen.findByRole('list');
    await waitFor(() => {
      expect(within(list).getByText('MG Road Gate')).toBeInTheDocument();
      expect(within(list).getByText('Ring Road Gate')).toBeInTheDocument();
    });
  });
});