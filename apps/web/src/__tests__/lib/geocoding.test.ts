import { describe, it, expect, vi } from 'vitest';
import {
  validateGeocodingInput,
  buildGeocodingQuery,
  parseGoogleGeocodeResponse,
  buildGoogleGeocodeUrl,
  requestGoogleGeocode,
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

  it('rejects non-string address values', () => {
    const result = validateGeocodingInput('valid', { city: '서울' });
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

describe('parseGoogleGeocodeResponse place id', () => {
  it('keeps the Google place id so it can be stored', () => {
    const data = {
      status: 'OK',
      results: [
        {
          geometry: { location: { lat: 37.5665, lng: 126.978 } },
          formatted_address: '서울특별시 중구',
          place_id: 'ChIJ-seoul',
        },
      ],
    };
    expect(parseGoogleGeocodeResponse(data)?.placeId).toBe('ChIJ-seoul');
  });
});

describe('buildGoogleGeocodeUrl', () => {
  it('encodes the query and asks for Korean results', () => {
    const url = new URL(buildGoogleGeocodeUrl('블루보틀 성수', 'key-1'));
    expect(url.origin + url.pathname).toBe('https://maps.googleapis.com/maps/api/geocode/json');
    expect(url.searchParams.get('address')).toBe('블루보틀 성수');
    expect(url.searchParams.get('key')).toBe('key-1');
    expect(url.searchParams.get('language')).toBe('ko');
  });
});

describe('requestGoogleGeocode', () => {
  function respond(body: unknown, init: ResponseInit = { status: 200 }) {
    return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init));
  }

  it('returns coordinates and place id for a found place', async () => {
    const fetchMock = respond({
      status: 'OK',
      results: [{ geometry: { location: { lat: 37.54, lng: 127.05 } }, place_id: 'ChIJ-bb' }],
    });

    await expect(requestGoogleGeocode('블루보틀 성수', 'key-1', fetchMock)).resolves.toEqual({
      lat: 37.54,
      lng: 127.05,
      formattedAddress: '',
      placeId: 'ChIJ-bb',
    });
    expect(fetchMock).toHaveBeenCalledWith(buildGoogleGeocodeUrl('블루보틀 성수', 'key-1'));
  });

  it('returns null only when Google finds nothing', async () => {
    const fetchMock = respond({ status: 'ZERO_RESULTS', results: [] });
    await expect(requestGoogleGeocode('없는 곳', 'key-1', fetchMock)).resolves.toBeNull();
  });

  it('throws on quota or key errors so the place is not marked as not found', async () => {
    const fetchMock = respond({ status: 'OVER_QUERY_LIMIT', results: [] });
    await expect(requestGoogleGeocode('카페', 'key-1', fetchMock)).rejects.toThrow('OVER_QUERY_LIMIT');
  });

  it('throws on HTTP errors', async () => {
    const fetchMock = respond({}, { status: 503 });
    await expect(requestGoogleGeocode('카페', 'key-1', fetchMock)).rejects.toThrow('503');
  });
});

