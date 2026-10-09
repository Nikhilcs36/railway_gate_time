/**
 * Search-radius options for the 'Near me' filter, in kilometres.
 * The toolbar offers these presets and also lets the user type a custom
 * value within [MIN_RADIUS_KM, MAX_RADIUS_KM].
 */
export const RADIUS_PRESETS_KM = [5, 10, 15] as const;
export const DEFAULT_RADIUS_KM = 5;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 100;

/**
 * Map zoom level for a given search radius - larger radii zoom out so the
 * blue circle stays in view (5 km -> 13, 10 km -> 12, 15 km -> 11).
 * Clamped to the valid Google Maps zoom range [3, 18].
 */
export function zoomForRadius(radiusKm: number): number {
  const zoom = 14 - Math.log2(Math.max(radiusKm, 0.1) / 2.5);
  return Math.round(Math.min(18, Math.max(3, zoom)));
}