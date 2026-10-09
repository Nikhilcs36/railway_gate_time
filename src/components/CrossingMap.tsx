import { useLoadScript, GoogleMap } from '@react-google-maps/api';
import { useMemo } from 'react';
import type { Crossing, CrossingStatus, GeoBounds } from '../types/crossing';
import { CrossingMarker } from './CrossingMarker';

const CONTAINER_STYLE = { width: '100%', height: '420px' };
const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };

interface Props {
  apiKey?: string;
  crossings: Crossing[];
  statuses?: Record<number, CrossingStatus>;
  onBoundsChange: (bounds: GeoBounds) => void;
  onSelect: (id: number) => void;
}

export function CrossingMap({ apiKey = '', crossings, statuses = {}, onBoundsChange, onSelect }: Props) {
  const center = useMemo(() => {
    if (crossings.length === 0) return DEFAULT_CENTER;
    const lat = crossings.reduce((sum, c) => sum + c.lat, 0) / crossings.length;
    const lng = crossings.reduce((sum, c) => sum + c.lng, 0) / crossings.length;
    return { lat, lng };
  }, [crossings]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: ['places'],
  });

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
        map.addListener('bounds_changed', () => pushBounds(map));
        pushBounds(map);
      }}
    >
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