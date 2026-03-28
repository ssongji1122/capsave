import { describe, it, expect } from 'vitest';
import {
  validateGeocodingInput,
  buildGeocodingQuery,
  parseGoogleGeocodeResponse,
} from '@/lib/geocoding';

describe('validateGeocodingInput', () => {
  it('accepts valid name', () => {
    expect(validateGeocodingInput('스타벅스')).toEqual({ valid: true });
  });

  it('rejects empty name', () => {
    const result = validateGeocodingInput('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects non-string name', () => {
    const result = validateGeocodingInput(null as unknown as string);
    expect(result.valid).toBe(false);
  });

  it('rejects name over 200 chars', () => {
    const result = validateGeocodingInput('a'.repeat(201));
    expect(result.valid).toBe(false);
  });

  it('rejects address over 300 chars', () => {
    const result = validateGeocodingInput('valid', 'a'.repeat(301));
    expect(result.valid).toBe(false);
  });

  it('accepts name with optional address', () => {
    expect(validateGeocodingInput('카페', '강남구')).toEqual({ valid: true });
  });
});

describe('buildGeocodingQuery', () => {
  it('combines name and address', () => {
    expect(buildGeocodingQuery('스타벅스', '강남구 역삼동')).toBe('스타벅스 강남구 역삼동');
  });

  it('returns name only when no address', () => {
    expect(buildGeocodingQuery('블루보틀')).toBe('블루보틀');
  });

  it('returns name only when address is undefined', () => {
    expect(buildGeocodingQuery('카페', undefined)).toBe('카페');
  });
});

describe('parseGoogleGeocodeResponse', () => {
  it('extracts lat, lng, address from valid response', () => {
    const data = {
      status: 'OK',
      results: [
        {
          geometry: { location: { lat: 37.5665, lng: 126.978 } },
          formatted_address: '서울특별시 중구',
        },
      ],
    };
    expect(parseGoogleGeocodeResponse(data)).toEqual({
      lat: 37.5665,
      lng: 126.978,
      formattedAddress: '서울특별시 중구',
    });
  });

  it('returns null for empty results', () => {
    expect(parseGoogleGeocodeResponse({ status: 'OK', results: [] })).toBeNull();
  });

  it('returns null for ZERO_RESULTS status', () => {
    expect(parseGoogleGeocodeResponse({ status: 'ZERO_RESULTS', results: [] })).toBeNull();
  });

  it('returns null when geometry is missing', () => {
    const data = {
      status: 'OK',
      results: [{ formatted_address: '서울' }],
    };
    expect(parseGoogleGeocodeResponse(data)).toBeNull();
  });
});
