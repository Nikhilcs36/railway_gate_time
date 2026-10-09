/** Build a Google Maps marker icon (SVG pin) as a data URL for a hex color. */
export function markerIconUrl(color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">` +
    `<path fill="${color}" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z"/>` +
    `<circle cx="16" cy="16" r="7" fill="#ffffff"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}