export type WebMapProvider = 'naver' | 'google';
export type MapProviderChoice = WebMapProvider | 'archive';

// An SDK that rejected its key (unregistered domain, revoked key) renders an error grid instead of a map.
export function resolveMapProvider(
  requested: MapProviderChoice,
  failed: ReadonlySet<WebMapProvider>,
): MapProviderChoice {
  return requested !== 'archive' && failed.has(requested) ? 'archive' : requested;
}

// A failed SDK keeps drawing its error tile into its container, so containers stay mounted
// but only the one for the provider on screen may be shown.
export function isMapContainerVisible(container: WebMapProvider, active: MapProviderChoice): boolean {
  return container === active;
}

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
