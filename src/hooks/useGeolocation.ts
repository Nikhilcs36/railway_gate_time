import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '../types/crossing';

interface UseGeolocationResult {
  coords: GeoPoint | null;
  /** When the most recent position fix arrived — proves liveness in the UI. */
  updatedAt: Date | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
  /** Toggle a dev-only fake GPS that emits movement ticks (no hardware needed). */
  simulate: () => void;
  simulating: boolean;
  /** True once a real browser GPS fix has arrived (never true from the simulator). */
  hasLiveFix: boolean;
}

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 5_000,
};

const SIM_INTERVAL_MS = 2_000;
const SIM_BASE: GeoPoint = { lat: 12.9716, lng: 77.5946 };
const SIM_RADIUS_DEG = 0.012; // ≈ 1.3 km — crosses the pan threshold each tick

/**
 * Browser geolocation with LIVE updates.
 *
 * - Mounts a `watchPosition` subscription so the returned `coords` keep
 *   tracking the user as they move (not a one-shot snapshot).
 * - Kicks off a fast `getCurrentPosition` first so something shows up
 *   immediately, then the watch keeps it fresh.
 * - `refresh()` re-runs the one-shot fix (e.g. when the user clicks
 *   "Near me") without tearing down the ongoing watch.
 * - `simulate()` toggles a fake GPS (desktops have no GPS hardware, so
 *   watchPosition often fires exactly once and never again) that walks a
 *   small circle around a demo point — driving the exact same downstream
 *   pipeline (blue dot, radius circle, gate regeneration, map pan).
 *   Simulator ticks are ignored once a REAL fix has arrived, so the demo
 *   point can never mask the user's actual live location.
 * - Cleans up the watch id and simulator on unmount.
 */
export function useGeolocation(): UseGeolocationResult {
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [hasLiveFix, setHasLiveFix] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simStepRef = useRef(0);
  // Read inside the interval callback without re-creating it on every fix.
  const hasLiveFixRef = useRef(false);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    hasLiveFixRef.current = true;
    setHasLiveFix(true);
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setUpdatedAt(new Date());
    setError(null);
    setLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err.message);
    setLoading(false);
  }, []);

  // Start the live watch once on mount; tear it down on unmount.
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      WATCH_OPTIONS,
    );

    return () => {
      // Defensive: test teardown may have removed `navigator.geolocation`
      // before React unmounts, and some browsers drop it on permission loss.
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [handleSuccess, handleError]);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser');
      return;
    }
    setLoading(true);
    // Immediate fix for snappy UX; the watch handles subsequent movement.
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, WATCH_OPTIONS);
  }, [handleSuccess, handleError]);

  // Auto-locate once on mount so users don't have to click the button.
  useEffect(() => {
    locate();
  }, [locate]);

  const stopSimulate = useCallback(() => {
    if (simTimerRef.current !== null) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setSimulating(false);
  }, []);

  const simulate = useCallback(() => {
    if (simTimerRef.current !== null) {
      stopSimulate();
      return;
    }
    setSimulating(true);
    simTimerRef.current = setInterval(() => {
      // Never let the demo point override a real browser fix — the whole
      // reason the simulator exists is "no GPS hardware", which no longer
      // applies once hasLiveFix is true.
      if (hasLiveFixRef.current) return;
      simStepRef.current += 1;
      const angle = simStepRef.current * (Math.PI / 6); // 30° per tick
      setCoords({
        lat: +(SIM_BASE.lat + SIM_RADIUS_DEG * Math.sin(angle)).toFixed(6),
        lng: +(SIM_BASE.lng + SIM_RADIUS_DEG * Math.cos(angle)).toFixed(6),
      });
      setUpdatedAt(new Date());
      setError(null);
      setLoading(false);
    }, SIM_INTERVAL_MS);
  }, [stopSimulate]);

  // Stop the simulator on unmount.
  useEffect(() => stopSimulate, [stopSimulate]);

  return { coords, updatedAt, error, loading, refresh: locate, simulate, simulating, hasLiveFix };
}
