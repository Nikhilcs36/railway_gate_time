import { useLoadScript, GoogleMap, CircleF, Marker } from '@react-google-maps/api';
import { useEffect, useRef } from 'react';
import type { Crossing, CrossingStatus, GeoBounds, GeoPoint } from '../types/crossing';
import { CrossingMarker } from './CrossingMarker';
import { markerIconUrl } from '../lib/markerIcon';
import { haversineKm } from '../lib/geo';
import { DEFAULT_RADIUS_KM, zoomForRadius } from '../lib/radius';

const CONTAINER_STYLE = { width: '100%', height: '420px' };
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
/** Don't re-pan for sub-threshold GPS jitter — avoids fighting the user. */
const PAN_THRESHOLD_KM = 0.2;

interface Props {
  apiKey?: string;
  crossings: Crossing[];
  statuses?: Record<number, CrossingStatus>;
  centerOverride?: GeoPoint;
  radiusKm?: number;
  userLocation?: GeoPoint;
  onBoundsChange: (bounds: GeoBounds) => void;
  onSelect: (id: number) => void;
}

export function CrossingMap({
  apiKey = '',
  crossings,
  statuses = {},
  centerOverride,
  radiusKm,
  userLocation,
  onBoundsChange,
  onSelect,
}: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastPannedRef = useRef<GeoPoint | null>(null);

  // Fit the initial view to the crossings ONCE (stable), so later data refetches
  // don't keep re-centering the map (avoids a bounds -> refetch -> recenter loop).
  const initialCenterRef = useRef<GeoPoint | null>(null);
  if (initialCenterRef.current === null && crossings.length > 0) {
    initialCenterRef.current = {
      lat: crossings.reduce((sum, c) => sum + c.lat, 0) / crossings.length,
      lng: crossings.reduce((sum, c) => sum + c.lng, 0) / crossings.length,
    };
  }

  const center = centerOverride ?? initialCenterRef.current ?? DEFAULT_CENTER;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: ['places'],
  });

  // Recenter on the user's location, but only for MEANINGFUL movement:
  // - first fix (lastPannedRef null) always pans,
  // - later ticks must move > PAN_THRESHOLD_KM or they're ignored (jitter).
  // Depend on primitive values so every watch tick is evaluated.
  const overrideLat = centerOverride?.lat;
  const overrideLng = centerOverride?.lng;
  const panToOverride = (map: google.maps.Map) => {
    if (overrideLat === undefined || overrideLng === undefined) return;
    const next = { lat: overrideLat, lng: overrideLng };
    const last = lastPannedRef.current;
    if (last && haversineKm(last, next) < PAN_THRESHOLD_KM) return;
    lastPannedRef.current = next;
    map.panTo(next);
    // Zoom so the whole search circle fits the frame (5 km -> 13, 15 km -> 11).
    map.setZoom(zoomForRadius(radiusKm ?? DEFAULT_RADIUS_KM));
  };
  useEffect(() => {
    if (mapRef.current) panToOverride(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideLat, overrideLng]);

  // When ONLY the radius changes (user picked 10 / 15 km or a custom value),
  // adjust the zoom alone — the center must not jump while they browse the map.
  const radiusZoom = radiusKm === undefined ? null : zoomForRadius(radiusKm);
  useEffect(() => {
    if (radiusZoom === null || !mapRef.current) return;
    mapRef.current.setZoom(radiusZoom);
  }, [radiusZoom]);

  if (!apiKey || loadError) {
    return (
      <div className="map-fallback">
        <p>🗺️ Google Map unavailable.</p>
        <p>
          Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your <code>.env</code> file to enable it. The list view below works
          without it.
        </p>
      </div>
    );
  }

  if (!isLoaded) return <div className="map-fallback">Loading map…</div>;

  const pushBounds = (map: unknown) => {
    const boundsGetter = map as {
      getBounds(): {
        getNorthEast(): { lat(): number; lng(): number };
        getSouthWest(): { lat(): number; lng(): number };
      } | null;
    };
    const mapBounds = boundsGetter.getBounds();
    if (!mapBounds) return;
    onBoundsChange({
      north: mapBounds.getNorthEast().lat(),
      east: mapBounds.getNorthEast().lng(),
      south: mapBounds.getSouthWest().lat(),
      west: mapBounds.getSouthWest().lng(),
    });
  };

  return (
    <GoogleMap
      mapContainerStyle={CONTAINER_STYLE}
      center={center}
      zoom={12}
      onLoad={(map) => {
        mapRef.current = map;
        // If GPS resolved before the map was ready, the effect bailed out
        // (mapRef was null). Apply the pending center now.
        panToOverride(map);
        // 'idle' fires once after the map settles — unlike 'bounds_changed',
        // which fires continuously during a drag and triggers many refetches.
        map.addListener('idle', () => pushBounds(map));
        pushBounds(map);
      }}
    >
      {userLocation && (
        <Marker
          position={userLocation}
          title="You are here"
          icon={{ url: markerIconUrl('#2563eb') }}
          zIndex={1000}
        />
      )}
      {centerOverride && radiusKm && (
        // CircleF (functional, effect-based) instead of the class Circle:
        // the class component stores its google.maps.Circle in async state and
        // can leak a duplicate instance under React StrictMode double-mount
        // (cleanup sees state.circle === null → never removes the ghost).
        // CircleF creates the instance in useEffect with a guaranteed cleanup,
        // so exactly one circle exists at runtime.
        <CircleF
          center={centerOverride}
          radius={radiusKm * 1000}
          options={{
            strokeColor: '#2563eb',
            strokeWeight: 2,
            fillColor: '#2563eb',
            fillOpacity: 0.08,
          }}
        />
      )}
      {crossings.map((crossing) => (
        <CrossingMarker
          key={crossing.id}
          crossing={crossing}
          status={statuses[crossing.id]}
          onSelect={onSelect}
        />
      ))}
    </GoogleMap>
  );
}