import { Marker } from '@react-google-maps/api';
import type { Crossing, CrossingStatus, GateState } from '../types/crossing';
import { crossingState } from '../lib/countdown';
import { markerColor } from '../lib/markerColor';
import { markerIconUrl } from '../lib/markerIcon';

interface Props {
  crossing: Crossing;
  status?: CrossingStatus;
  onSelect: (id: number) => void;
}

/** A Google Maps marker colored by the crossing's current gate state. */
export function CrossingMarker({ crossing, status, onSelect }: Props) {
  // No status = no train approaching = open gate (green marker).
  const state: GateState = status ? crossingState(status) : 'open';

  return (
    <Marker
      position={{ lat: crossing.lat, lng: crossing.lng }}
      title={crossing.name}
      icon={status ? { url: markerIconUrl(markerColor(state)) } : undefined}
      onClick={() => onSelect(crossing.id)}
    />
  );
}