import { describe, expect, it, vi } from 'vitest';
import type { PlaceInfo } from '@scrave/shared';
import { createGooglePlaceGeocoder, refreshPlaceCoordinates } from '@/lib/place-coordinates';
import { buildGoogleGeocodeUrl } from '@/lib/geocoding';

const NOW = new Date('2026-10-24T00:00:00.000Z');
const RECENT = '2026-10-20T00:00:00.000Z';
const OLD = '2026-09-01T00:00:00.000Z';

describe('refreshPlaceCoordinates', () => {
  it('limits geocoding to one outstanding request', async () => {
    let active = 0;
    let peak = 0;
    const geocode = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      return null;
    });
    await refreshPlaceCoordinates([{ name: '성수 카페' }, { name: '서울 숲' }], { now: NOW, geocode });
    expect(peak).toBe(1);
  });
  it('looks up only places without fresh coordinates and stores the result', async () => {
    const geocode = vi.fn().mockResolvedValue({ lat: 37.54, lng: 127.05, placeId: 'ChIJ-new' });
    const places: PlaceInfo[] = [
      { name: '새 카페', address: '성수동' },
      { name: '최근 카페', lat: 37.5, lng: 127, geocodedAt: RECENT },
      { name: '오래된 카페', lat: 37.4, lng: 126.9, geocodedAt: OLD },
    ];

    const result = await refreshPlaceCoordinates(places, { now: NOW, geocode });

    expect(geocode).toHaveBeenCalledTimes(2);
    expect(geocode).toHaveBeenCalledWith(places[0]);
    expect(geocode).toHaveBeenCalledWith(places[2]);
    expect(result).toEqual({
      changed: true,
      places: [
        { name: '새 카페', address: '성수동', lat: 37.54, lng: 127.05, placeId: 'ChIJ-new', geocodedAt: NOW.toISOString() },
        places[1],
        { name: '오래된 카페', lat: 37.54, lng: 127.05, placeId: 'ChIJ-new', geocodedAt: NOW.toISOString() },
      ],
    });
  });

  it('records a not-found lookup so it is not asked again for 30 days', async () => {
    const geocode = vi.fn().mockResolvedValue(null);

    const result = await refreshPlaceCoordinates([{ name: '없는 곳' }], { now: NOW, geocode });

    expect(result).toEqual({
      changed: true,
      places: [{ name: '없는 곳', geocodedAt: NOW.toISOString() }],
    });
  });

  it('leaves a place as it was when the lookup fails for another reason', async () => {
    const geocode = vi.fn().mockRejectedValue(new Error('Geocoding API status OVER_QUERY_LIMIT'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const places: PlaceInfo[] = [{ name: '카페' }];

    const result = await refreshPlaceCoordinates(places, { now: NOW, geocode });

    expect(result).toEqual({ changed: false, places });
    warn.mockRestore();
  });

  it('skips names the geocoder would reject without calling it', async () => {
    const geocode = vi.fn();
    const places: PlaceInfo[] = [{ name: '' }, { name: 'a'.repeat(201) }];

    const result = await refreshPlaceCoordinates(places, { now: NOW, geocode });

    expect(geocode).not.toHaveBeenCalled();
    expect(result).toEqual({ changed: false, places });
  });

  it('reports no change when every place is already fresh', async () => {
    const geocode = vi.fn();
    const places: PlaceInfo[] = [{ name: '최근 카페', lat: 37.5, lng: 127, geocodedAt: RECENT }];

    await expect(refreshPlaceCoordinates(places, { now: NOW, geocode })).resolves.toEqual({
      changed: false,
      places,
    });
    expect(geocode).not.toHaveBeenCalled();
  });
});

describe('createGooglePlaceGeocoder', () => {
  it('asks Google with the place name and address', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'OK',
          results: [{ geometry: { location: { lat: 37.54, lng: 127.05 } }, place_id: 'ChIJ-bb' }],
        }),
        { status: 200 }
      )
    );
    const geocode = createGooglePlaceGeocoder('key-1', fetchMock);

    await expect(geocode({ name: '블루보틀', address: '성수동' })).resolves.toEqual({
      lat: 37.54,
      lng: 127.05,
      placeId: 'ChIJ-bb',
    });
    expect(fetchMock).toHaveBeenCalledWith(buildGoogleGeocodeUrl('블루보틀 성수동', 'key-1'));
  });
});
