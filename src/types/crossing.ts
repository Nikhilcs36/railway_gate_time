/** Overall state of a railway gate crossing, derived from live status. */
export type GateState = 'open' | 'closing_soon' | 'closed' | 'unknown';

/** Live prediction payload — matches the backend `/crossings/:id/status` response. */
export interface CrossingStatus {
  crossing: number;
  train: string;
  distance_km: number;
  eta_seconds: number;
  predicted_closure: string; // HH:mm:ss
  predicted_opening: string; // HH:mm:ss
  confidence: number; // 0..1
  updated_at: string; // ISO timestamp
}

export interface Crossing {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TrainReport {
  crossing: number;
  train: string;
}