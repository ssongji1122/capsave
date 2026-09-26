export type WebMapProvider = 'naver' | 'google';

interface LatLng {
  lat: number;
  lng: number;
}

const KOREA_BOUNDS = {
  south: 33,
  north: 38.7,
  west: 124.5,
  east: 131.9,
};

function isInsideKorea({ lat, lng }: LatLng): boolean {
  return (
    lat >= KOREA_BOUNDS.south &&
    lat <= KOREA_BOUNDS.north &&
    lng >= KOREA_BOUNDS.west &&
    lng <= KOREA_BOUNDS.east
  );
}

// Naver Map has little detail outside Korea, so pins that are all abroad open on Google.
export function pickDefaultMapProvider(places: LatLng[]): WebMapProvider {
  if (places.length === 0 || places.some(isInsideKorea)) return 'naver';
  return 'google';
}
