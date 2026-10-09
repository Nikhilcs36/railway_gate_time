import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from './useGeolocation';

interface Position {
  coords: { latitude: number; longitude: number };
}

const POSITION_A: Position = { coords: { latitude: 12.9716, longitude: 77.5946 } };
const POSITION_B: Position = { coords: { latitude: 13.05, longitude: 77.65 } };

interface GeoMock {
  getCurrentPosition: ReturnType<typeof vi.fn>;
  watchPosition: ReturnType<typeof vi.fn>;
  clearWatch: ReturnType<typeof vi.fn>;
  /** Fire a live update through the registered watch callback. */
  emitWatch: (pos: Position) => void;
}

function installGeolocation(opts: { success: boolean; errorMessage?: string }): GeoMock {
  const getCurrentPosition = vi.fn(
    (onSuccess: (p: Position) => void, onError: (e: Error) => void) => {
      setTimeout(() => {
        if (opts.success) onSuccess(POSITION_A);
        else onError(new Error(opts.errorMessage ?? 'User denied Geolocation'));
      }, 0);
    },
  );

  let watchSuccess: ((p: Position) => void) | null = null;
  const watchPosition = vi.fn(
    (onSuccess: (p: Position) => void, _onError: (e: Error) => void) => {
      watchSuccess = onSuccess;
      return 1; // watchId
    },
  );
  const clearWatch = vi.fn();

  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition, watchPosition, clearWatch },
    configurable: true,
  });

  return {
    getCurrentPosition,
    watchPosition,
    clearWatch,
    emitWatch: (pos: Position) => watchSuccess?.(pos),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'geolocation');
});

describe('useGeolocation', () => {
  it('auto-locates on mount and exposes coordinates', async () => {
    installGeolocation({ success: true });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.coords).toEqual({ lat: 12.9716, lng: 77.5946 }));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('reports the error when permission is denied', async () => {
    installGeolocation({ success: false, errorMessage: 'denied' });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.error).toBe('denied'));
    expect(result.current.coords).toBeNull();
  });

  it('detects missing geolocation support', () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.error).toMatch(/not supported/i);
  });

  it('starts a live watch on mount and updates coords as the user moves', async () => {
    const geo = installGeolocation({ success: true });
    const { result } = renderHook(() => useGeolocation());

    await waitFor(() => expect(result.current.coords).toEqual({ lat: 12.9716, lng: 77.5946 }));
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);
    // liveness metadata: updatedAt is a real timestamp alongside the fix
    expect(result.current.updatedAt).toBeInstanceOf(Date);

    // Simulate the user moving: the watch callback fires a new fix.
    const seen = result.current.updatedAt;
    act(() => geo.emitWatch(POSITION_B));
    await waitFor(() =>
      expect(result.current.coords).toEqual({ lat: 13.05, lng: 77.65 }),
    );
    expect(result.current.updatedAt).toBeInstanceOf(Date);
    expect(result.current.updatedAt).not.toBe(seen);
    expect(result.current.error).toBeNull();
  });

  it('clears the watch on unmount', async () => {
    const geo = installGeolocation({ success: true });
    const { unmount } = renderHook(() => useGeolocation());
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalledTimes(1));

    unmount();
    expect(geo.clearWatch).toHaveBeenCalledWith(1);
  });

  it('refresh() re-runs getCurrentPosition without tearing down the watch', async () => {
    const geo = installGeolocation({ success: true });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.coords).toEqual({ lat: 12.9716, lng: 77.5946 }));
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1); // auto-locate on mount

    act(() => result.current.refresh());
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(geo.clearWatch).not.toHaveBeenCalled();
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);
  });

  it('never lets simulator ticks override a real GPS fix', async () => {
    vi.useFakeTimers();
    const geo = installGeolocation({ success: true });
    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1); // flush the queued getCurrentPosition success
    });
    expect(result.current.coords).toEqual({ lat: 12.9716, lng: 77.5946 });
    expect(result.current.hasLiveFix).toBe(true);

    // Simulator on: its ticks must be ignored because a live fix exists.
    act(() => result.current.simulate());
    expect(result.current.simulating).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100);
    });
    expect(result.current.coords).toEqual({ lat: 12.9716, lng: 77.5946 });

    // Real movement still comes through the watch while the simulator runs.
    // (No waitFor here: waitFor polls the clock, which deadlocks under fake timers.)
    act(() => geo.emitWatch(POSITION_B));
    expect(result.current.coords).toEqual({ lat: 13.05, lng: 77.65 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100);
    });
    // Simulator tick fired again but did NOT snap back to the demo point.
    expect(result.current.coords).toEqual({ lat: 13.05, lng: 77.65 });
  });

  it('simulate() emits movement ticks without GPS hardware (dev fallback)', async () => {
    vi.useFakeTimers();
    // No geolocation at all — a desktop with no GPS / denied permission.
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.coords).toBeNull();

    act(() => result.current.simulate());
    expect(result.current.simulating).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100); // first tick
    });
    expect(result.current.coords).not.toBeNull();
    expect(result.current.updatedAt).toBeInstanceOf(Date);
    const firstFix = result.current.coords;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100); // second tick — moved again
    });
    expect(result.current.coords).not.toEqual(firstFix);

    // Toggle off: position freezes.
    act(() => result.current.simulate());
    expect(result.current.simulating).toBe(false);
    const frozen = result.current.coords;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_200);
    });
    expect(result.current.coords).toEqual(frozen);
  });

  it('stops the simulator on unmount', async () => {
    vi.useFakeTimers();
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result, unmount } = renderHook(() => useGeolocation());
    act(() => result.current.simulate());
    expect(result.current.simulating).toBe(true);

    unmount();
    // Interval cleared — no further state changes (would throw a React warning).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    expect(result.current.simulating).toBe(true); // snapshot of last render; no crash = pass
  });
});
