interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateGeocodingInput(name: unknown, address?: unknown): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'name is required' };
  }
  if (name.length > 200) {
    return { valid: false, error: 'name too long' };
  }
  if (address !== undefined && address !== null && typeof address !== 'string') {
    return { valid: false, error: 'address must be a string' };
  }
  if (typeof address === 'string' && address.length > 300) {
    return { valid: false, error: 'address too long' };
  }
  return { valid: true };
}

export function buildGeocodingQuery(name: string, address?: string): string {
  return address ? `${name} ${address}` : name;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
}

export function parseGoogleGeocodeResponse(data: {
  status: string;
  results: Array<{
    geometry?: { location: { lat: number; lng: number } };
    formatted_address?: string;
    place_id?: string;
  }>;
}): GeocodeResult | null {
  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    return null;
  }

  const first = data.results[0];
  if (!first.geometry?.location) {
    return null;
  }

  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    formattedAddress: first.formatted_address ?? '',
    ...(first.place_id ? { placeId: first.place_id } : {}),
  };
}

export function buildGoogleGeocodeUrl(query: string, apiKey: string): string {
  return `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=ko`;
}

type FetchLike = (input: string) => Promise<Response>;

/**
 * Google Geocoding을 부릅니다. 찾지 못했을 때(ZERO_RESULTS)만 null을 돌려주고,
 * 한도 초과·키 오류·HTTP 오류는 던져서 호출한 쪽이 「찾지 못함」으로 기록하지 않게 합니다.
 */
export async function requestGoogleGeocode(
  query: string,
  apiKey: string,
  fetchImpl: FetchLike = fetch
): Promise<GeocodeResult | null> {
  const res = await fetchImpl(buildGoogleGeocodeUrl(query, apiKey));
  if (!res.ok) throw new Error(`Geocoding API returned ${res.status}`);

  const data = await res.json();
  if (data.status === 'ZERO_RESULTS') return null;
  if (data.status !== 'OK') throw new Error(`Geocoding API status ${data.status}`);
  return parseGoogleGeocodeResponse(data);
}
