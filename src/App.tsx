import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCrossings } from './hooks/useCrossings';
import { useCrossingStatuses } from './hooks/useCrossingStatuses';
import { useNearbyCrossings } from './hooks/useNearbyCrossings';
import { useReportTrain } from './hooks/useReportTrain';
import { useGeolocation } from './hooks/useGeolocation';
import { useCrossingsInRadius } from './hooks/useCrossingsInRadius';
import { CrossingMap } from './components/CrossingMap';
import { CrossingList } from './components/CrossingList';
import { subscribeToTrainEvents } from './lib/realtime';
import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  RADIUS_PRESETS_KM,
} from './lib/radius';
import type { GeoBounds, TrainReport } from './types/crossing';

const apiKey: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

export default function App() {
  const queryClient = useQueryClient();
  const { data: allCrossings = [], isLoading, error } = useCrossings();

  const {
    coords,
    updatedAt,
    error: geoError,
    loading: geoLoading,
    refresh,
    simulate,
    simulating,
    hasLiveFix,
  } = useGeolocation();

  // Search radius: toolbar presets (5 / 10 / 15 km) plus a custom value.
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [isCustomRadius, setIsCustomRadius] = useState(false);
  const [customRadiusText, setCustomRadiusText] = useState(String(DEFAULT_RADIUS_KM));

  const inRadius = useCrossingsInRadius(coords, radiusKm);

  const [bounds, setBounds] = useState<GeoBounds | null>(null);
  // Query by map viewport only when not geolocated (the radius set takes over otherwise).
  const nearby = useNearbyCrossings(coords ? null : bounds);
  const viewportCrossings = nearby.data ?? allCrossings;

  // The gates shown (on both map & list) depend on whether "Near me" is active.
  const displayed = coords
    ? inRadius.length > 0
      ? inRadius
      : viewportCrossings
    : viewportCrossings;

  // Fetch live statuses for exactly the gates we render, so every marker has data.
  const { statuses } = useCrossingStatuses(displayed.map((crossing) => crossing.id));

  const reportTrain = useReportTrain();

  const handleRadiusSelect = (value: string) => {
    if (value === 'custom') {
      // Seed the input with the radius currently in effect so the field never
      // disagrees with the map/list while the user is mid-decision.
      setCustomRadiusText(String(radiusKm));
      setIsCustomRadius(true);
      return;
    }
    setIsCustomRadius(false);
    setRadiusKm(Number(value));
  };

  const handleCustomRadiusChange = (text: string) => {
    setCustomRadiusText(text);
    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed >= MIN_RADIUS_KM && parsed <= MAX_RADIUS_KM) {
      setRadiusKm(parsed);
    }
  };

  const handleCustomRadiusBlur = () => {
    // Half-typed or out-of-range values are dropped: snap back to the applied radius.
    setCustomRadiusText(String(radiusKm));
  };

  useEffect(() => {
    const wsUrl: string | undefined = import.meta.env.VITE_WS_URL;
    if (!wsUrl) return;
    return subscribeToTrainEvents(queryClient, wsUrl);
  }, [queryClient]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>🚂 Railway Gate Tracker</h1>
        <p className="subtitle">Live crossing times &amp; predicted closures — avoid the wait at the gate.</p>
      </header>

      <div className="toolbar">
        <button type="button" className="btn-nearme" onClick={refresh} disabled={geoLoading}>
          {geoLoading ? 'Locating…' : `📍 Near me (${radiusKm} km)`}
        </button>

        <div className="radius-picker" data-testid="radius-picker">
          <label className="radius-picker__label" htmlFor="radius-select">
            Radius
          </label>
          <select
            id="radius-select"
            className="radius-picker__select"
            data-testid="radius-select"
            value={isCustomRadius ? 'custom' : String(radiusKm)}
            onChange={(event) => handleRadiusSelect(event.target.value)}
            disabled={!coords}
            title={
              coords
                ? 'How far from you to look for railway gates'
                : 'Turn on 📍 Near me first — the radius filters gates around your location'
            }
          >
            {RADIUS_PRESETS_KM.map((km) => (
              <option key={km} value={String(km)}>
                {km} km
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {isCustomRadius && (
            <>
              <input
                id="radius-custom"
                className="radius-picker__input"
                data-testid="radius-custom-input"
                type="number"
                min={MIN_RADIUS_KM}
                max={MAX_RADIUS_KM}
                step={1}
                value={customRadiusText}
                onChange={(event) => handleCustomRadiusChange(event.target.value)}
                onBlur={handleCustomRadiusBlur}
                disabled={!coords}
                aria-label="Custom radius in kilometres"
              />
              <span className="radius-picker__unit">km</span>
            </>
          )}
        </div>

        {import.meta.env.DEV && (
          <button type="button" className="btn-nearme btn-simulate" onClick={simulate}>
            {simulating ? '⏸ Stop simulation' : '▶ Simulate movement'}
          </button>
        )}
        {coords ? (
          <span className="nearby-hint coord-readout" data-testid="coord-readout">
            📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · updated{' '}
            {updatedAt ? updatedAt.toLocaleTimeString() : '—'}
            {simulating && !hasLiveFix && ' · simulated'}
          </span>
        ) : (
          !geoError && (
            <span className="nearby-hint">
              Waiting for GPS fix… showing default region until the browser resolves a position.
            </span>
          )
        )}
        {coords && !geoError && (
          <span className="nearby-hint">
            {inRadius.length} gate(s) within {radiusKm} km
          </span>
        )}
        {coords && !geoError && inRadius.length === 0 && (
          <span className="nearby-hint">No gates within {radiusKm} km — showing all gates.</span>
        )}
      </div>

      {/* Loud, impossible-to-miss explanation of WHY the map is on the default
          region — a small ⚠️ hint in the toolbar was too easy to miss. */}
      {!coords && geoError && (
        <p className="banner banner--error" data-testid="geo-error-banner">
          📍 Live location unavailable: <strong>{geoError}</strong> — the map is showing the
          <strong> default region</strong>, not your position. Check the browser&apos;s location
          permission (the 📍 icon in the address bar), make sure you are on{' '}
          <code>localhost</code> or <code>https://</code>, and that OS location services are
          enabled. Then click &quot;Near me ({radiusKm} km)&quot; to retry.
        </p>
      )}
      {simulating && !hasLiveFix && (
        <p className="banner" data-testid="geo-sim-banner">
          🧪 Movement simulation is ON — coordinates are a fake demo point, not your live location.
          Click &quot;⏸ Stop simulation&quot; to use real GPS.
        </p>
      )}
      {simulating && hasLiveFix && (
        <p className="banner" data-testid="geo-sim-ignored-banner">
          🧪 Movement simulation is ON but ignored — a real GPS fix is active, so the live location
          keeps winning.
        </p>
      )}

      {error && <p className="banner banner--error">Failed to load crossings: {String(error)}</p>}
      {isLoading && <p className="banner">Loading crossings…</p>}

      <CrossingMap
        apiKey={apiKey}
        crossings={displayed}
        statuses={statuses}
        centerOverride={coords ?? undefined}
        radiusKm={coords ? radiusKm : undefined}
        userLocation={coords ?? undefined}
        onBoundsChange={setBounds}
        onSelect={() => {}}
      />

      <CrossingList crossings={displayed} statuses={statuses} onReport={(report: TrainReport) => reportTrain.mutate(report)} />
    </div>
  );
}