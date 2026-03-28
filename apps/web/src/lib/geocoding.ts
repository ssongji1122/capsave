interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateGeocodingInput(name: string, address?: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'name is required' };
  }
  if (name.length > 200) {
    return { valid: false, error: 'name too long' };
  }
  if (address && address.length > 300) {
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
}

export function parseGoogleGeocodeResponse(data: {
  status: string;
  results: Array<{
    geometry?: { location: { lat: number; lng: number } };
    formatted_address?: string;
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
  };
}
