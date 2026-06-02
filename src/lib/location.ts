import { useProfile } from "../store/useProfile";

/** Major TR cities for the manual location fallback. */
export const CITIES: { label: string; lat: number; lng: number }[] = [
  { label: "İstanbul", lat: 41.01, lng: 28.98 },
  { label: "Ankara", lat: 39.93, lng: 32.85 },
  { label: "İzmir", lat: 38.42, lng: 27.14 },
  { label: "Bursa", lat: 40.19, lng: 29.06 },
  { label: "Antalya", lat: 36.9, lng: 30.69 },
  { label: "Adana", lat: 37.0, lng: 35.32 },
  { label: "Eskişehir", lat: 39.78, lng: 30.52 },
  { label: "Bodrum", lat: 37.03, lng: 27.43 },
];

/** Ask the browser for the user's location and store it on the profile. */
export function requestLocation(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        useProfile.getState().update({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          locationLabel: "Mevcut konum",
        });
        resolve(true);
      },
      () => resolve(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  });
}

export function setCity(label: string): void {
  const c = CITIES.find((x) => x.label === label);
  if (c) useProfile.getState().update({ lat: c.lat, lng: c.lng, locationLabel: c.label });
}
