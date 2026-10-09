import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createWrapper } from './test/utils';

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: true, loadError: null }),
  GoogleMap: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  Marker: ({ title }: { title?: string }) => <div>{title}</div>,
  CircleF: ({ radius }: { radius?: number }) => (
    <div data-testid="radius-circle" data-radius={radius} />
  ),
}));
/** Fake GPS that resolves instantly to the Bangalore demo point. */
function stubGeolocation(fix = { coords: { latitude: 12.9716, longitude: 77.5946 } }) {
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: (ok: (p: unknown) => void) => ok(fix),
      watchPosition: (ok: (p: unknown) => void) => {
        ok(fix);
        return 1;
      },
      clearWatch: vi.fn(),
    },
    configurable: true,
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation');
});

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
  it('shows the live coordinate readout once GPS resolves', async () => {
    stubGeolocation();

    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <App />
      </Wrapper>,
    );

    // The readout proves liveness: coordinates + the updated time render.
    const readout = await screen.findByTestId('coord-readout');
    expect(readout).toHaveTextContent('12.97160');
    expect(readout).toHaveTextContent('77.59460');
    expect(readout).toHaveTextContent(/updated/i);
    // With a live fix, the location-unavailable banner must NOT show.
    expect(screen.queryByTestId('geo-error-banner')).not.toBeInTheDocument();
  });

  it('shows a loud banner explaining the default region when GPS fails', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) =>
          fail({ message: 'User denied Geolocation' }),
        watchPosition: (_ok: unknown, fail: (e: unknown) => void) => {
          fail({ message: 'User denied Geolocation' });
          return 1;
        },
        clearWatch: vi.fn(),
      },
      configurable: true,
    });

    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <App />
      </Wrapper>,
    );

    // The banner must call out BOTH the error and the default-region fallback,
    // so a Bangalore-centered map can never be mistaken for the user's location.
    const banner = await screen.findByTestId('geo-error-banner');
    expect(banner).toHaveTextContent(/User denied Geolocation/);
    expect(banner).toHaveTextContent(/default region/i);
    // No coordinate readout - we genuinely have no position.
    expect(screen.queryByTestId('coord-readout')).not.toBeInTheDocument();
  });
});
describe('search radius options', () => {
  it('uses 5 km by default', async () => {
    stubGeolocation();
    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <App />
      </Wrapper>,
    );

    expect(await screen.findByRole('button', { name: /Near me \(5 km\)/ })).toBeInTheDocument();
    expect(await screen.findByText(/gate\(s\) within 5 km/)).toBeInTheDocument();
    expect(screen.getByTestId('radius-circle')).toHaveAttribute('data-radius', '5000');
    // The picker starts on the 5 km preset, not on Custom.
    expect(screen.getByTestId('radius-select')).toHaveValue('5');
  });

  it('applies the 10 km and 15 km presets', async () => {
    stubGeolocation();
    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <App />
      </Wrapper>,
    );

    const select = await screen.findByTestId('radius-select');
    await waitFor(() => expect(select).toBeEnabled());

    await userEvent.selectOptions(select, '10');
    expect(screen.getByText(/gate\(s\) within 10 km/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Near me \(10 km\)/ })).toBeInTheDocument();
    expect(screen.getByTestId('radius-circle')).toHaveAttribute('data-radius', '10000');

    await userEvent.selectOptions(select, '15');
    expect(screen.getByText(/gate\(s\) within 15 km/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Near me \(15 km\)/ })).toBeInTheDocument();
    expect(screen.getByTestId('radius-circle')).toHaveAttribute('data-radius', '15000');
  });
  it('accepts a custom radius and rejects values outside the allowed range', async () => {
    stubGeolocation();
    const { Wrapper } = createWrapper();
    render(
      <Wrapper>
        <App />
      </Wrapper>,
    );

    const select = await screen.findByTestId('radius-select');
    await waitFor(() => expect(select).toBeEnabled());
    await userEvent.selectOptions(select, 'custom');

    const input = await screen.findByTestId('radius-custom-input');
    // The field is seeded with the radius currently in effect (5 km).
    expect(input).toHaveValue(5);

    await userEvent.clear(input);
    await userEvent.type(input, '25');
    expect(screen.getByText(/gate\(s\) within 25 km/)).toBeInTheDocument();
    expect(screen.getByTestId('radius-circle')).toHaveAttribute('data-radius', '25000');

    // 0 km is below the 1 km minimum, so the applied radius must not change.
    await userEvent.clear(input);
    await userEvent.type(input, '0');
    expect(screen.getByText(/gate\(s\) within 25 km/)).toBeInTheDocument();

    // Leaving the field snaps it back to the value that is actually applied.
    await userEvent.tab();
    expect(input).toHaveValue(25);
  });
});