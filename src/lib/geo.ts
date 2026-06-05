/** Great-circle distance in km between two lat/lng points (haversine). */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/**
 * Coarsen a precise location before exposing it publicly. Snaps to a ~2 km grid
 * and adds a STABLE per-user offset (seeded by uid) within the cell, so the
 * displayed distance stays roughly right but the exact point (home) is never
 * revealed and doesn't drift between writes.
 */
export function coarsenLocation(
  lat: number,
  lng: number,
  seed: string,
): { lat: number; lng: number } {
  const GRID = 0.02; // ~2.2 km
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  const jLat = ((h % 1000) / 1000 - 0.5) * GRID;
  const jLng = ((Math.floor(h / 1000) % 1000) / 1000 - 0.5) * GRID;
  const snap = (v: number) => Math.round(v / GRID) * GRID;
  return { lat: snap(lat) + jLat, lng: snap(lng) + jLng };
}
