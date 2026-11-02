interface LatLng {
  lat: number;
  lng: number;
}

// Percent of the map kept clear of pins: the top bar (count, notice, search, provider toggle) and the bottom sheet cover these bands.
export const STATIC_PIN_AREA = {
  top: 32,
  bottom: 16,
  side: 12,
} as const;

const MAP_SPAN_FALLBACK = 0.01;

// Places closer together than the fallback span are centered in it, so a single place sits mid-map instead of at an edge.
function spreadFraction(offsetFromStart: number, actualSpan: number): number {
  const span = Math.max(MAP_SPAN_FALLBACK, actualSpan);
  return (offsetFromStart + (span - actualSpan) / 2) / span;
}

export function getStaticPinPosition(
  place: LatLng,
  places: readonly LatLng[],
): { readonly left: number; readonly top: number } {
  const lats = places.map((item) => item.lat);
  const lngs = places.map((item) => item.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const width = 100 - STATIC_PIN_AREA.side * 2;
  const height = 100 - STATIC_PIN_AREA.top - STATIC_PIN_AREA.bottom;

  return {
    left: STATIC_PIN_AREA.side + spreadFraction(place.lng - minLng, maxLng - minLng) * width,
    top: STATIC_PIN_AREA.top + spreadFraction(maxLat - place.lat, maxLat - minLat) * height,
  };
}
