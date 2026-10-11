import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '../types/crossing';

interface UseGeolocationResult {
  coords: GeoPoint | null;
  /** When the most recent position fix arrived — proves liveness in the UI. */
  updatedAt: Date | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 5_000,
};

/**
 * Browser geolocation with LIVE updates.
 *
 * - Mounts a `watchPosition` subscription so the returned `coords` keep
 *   tracking the user as they move (not a one-shot snapshot).
 * - Kicks off a fast `getCurrentPosition` first so something shows up
 *   immediately, then the watch keeps it fresh.
 * - `refresh()` re-runs the one-shot fix (e.g. when the user clicks
 *   "Near me") without tearing down the ongoing watch.
 * - Cleans up the watch id on unmount.
 */
export function useGeolocation(): UseGeolocationResult {
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
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

  return { coords, updatedAt, error, loading, refresh: locate };
}
