import { describe, it, expect } from 'vitest';
import {
  GEOCODE_CACHE_DAYS,
  needsGeocoding,
  hasFreshCoordinates,
  applyGeocodeResult,
  expireGeocodedPlaces,
} from '../utils/place-geocoding';
import type { PlaceInfo } from '../types/capture';

const NOW = new Date('2026-10-24T00:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('GEOCODE_CACHE_DAYS', () => {
  it('keeps geocoded coordinates for 30 days', () => {
    expect(GEOCODE_CACHE_DAYS).toBe(30);
  });
});

describe('needsGeocoding', () => {
  it('asks for coordinates when a place has none', () => {
    expect(needsGeocoding({ name: '카페' }, NOW)).toBe(true);
  });

  it('asks again when stored coordinates are not usable numbers', () => {
    expect(needsGeocoding({ name: '카페', lat: Number.NaN, lng: 127 }, NOW)).toBe(true);
  });

  it('keeps coordinates geocoded within 30 days', () => {
    expect(
      needsGeocoding({ name: '카페', lat: 37.5, lng: 127, geocodedAt: daysAgo(29) }, NOW)
    ).toBe(false);
  });

  it('asks again once geocoded coordinates are older than 30 days', () => {
    expect(
      needsGeocoding({ name: '카페', lat: 37.5, lng: 127, geocodedAt: daysAgo(31) }, NOW)
    ).toBe(true);
  });

  it('does not retry a failed lookup within 30 days', () => {
    expect(needsGeocoding({ name: '없는 곳', geocodedAt: daysAgo(3) }, NOW)).toBe(false);
  });

  it('keeps coordinates that did not come from geocoding', () => {
    expect(needsGeocoding({ name: '가이드 장소', lat: 37.5, lng: 127 }, NOW)).toBe(false);
  });
});

describe('hasFreshCoordinates', () => {
  it('accepts coordinates geocoded within 30 days', () => {
    expect(hasFreshCoordinates({ name: '카페', lat: 37.5, lng: 127, geocodedAt: daysAgo(1) }, NOW)).toBe(true);
  });

  it('accepts coordinates that did not come from geocoding', () => {
    expect(hasFreshCoordinates({ name: '가이드 장소', lat: 37.5, lng: 127 }, NOW)).toBe(true);
  });

  it('rejects expired geocoded coordinates', () => {
    expect(hasFreshCoordinates({ name: '카페', lat: 37.5, lng: 127, geocodedAt: daysAgo(31) }, NOW)).toBe(false);
  });

  it('rejects a place whose recent lookup found nothing', () => {
    expect(hasFreshCoordinates({ name: '없는 곳', geocodedAt: daysAgo(1) }, NOW)).toBe(false);
  });
});

describe('applyGeocodeResult', () => {
  it('stores coordinates, place id and lookup time on success', () => {
    const place: PlaceInfo = { name: '카페', address: '서울' };
    expect(
      applyGeocodeResult(place, { lat: 37.5, lng: 127.1, placeId: 'ChIJ123' }, NOW)
    ).toEqual({
      name: '카페',
      address: '서울',
      lat: 37.5,
      lng: 127.1,
      placeId: 'ChIJ123',
      geocodedAt: NOW.toISOString(),
    });
  });

  it('drops old geocoded coordinates and records the attempt on failure', () => {
    const place: PlaceInfo = {
      name: '카페',
      lat: 37.5,
      lng: 127.1,
      placeId: 'ChIJ123',
      geocodedAt: daysAgo(40),
    };
    expect(applyGeocodeResult(place, null, NOW)).toEqual({
      name: '카페',
      placeId: 'ChIJ123',
      geocodedAt: NOW.toISOString(),
    });
  });

  it('keeps an existing place id when the new result has none', () => {
    const place: PlaceInfo = { name: '카페', placeId: 'ChIJ123' };
    expect(applyGeocodeResult(place, { lat: 37.5, lng: 127.1 }, NOW).placeId).toBe('ChIJ123');
  });
});

describe('expireGeocodedPlaces', () => {
  it('removes geocoded coordinates older than 30 days and reports the change', () => {
    const places: PlaceInfo[] = [
      { name: '오래됨', lat: 37.5, lng: 127, placeId: 'ChIJold', geocodedAt: daysAgo(31) },
      { name: '최근', lat: 37.6, lng: 127.2, geocodedAt: daysAgo(2) },
      { name: '가이드 장소', lat: 37.7, lng: 127.3 },
    ];

    expect(expireGeocodedPlaces(places, NOW)).toEqual({
      changed: true,
      places: [
        { name: '오래됨', placeId: 'ChIJold' },
        { name: '최근', lat: 37.6, lng: 127.2, geocodedAt: daysAgo(2) },
        { name: '가이드 장소', lat: 37.7, lng: 127.3 },
      ],
    });
  });

  it('clears an old failed attempt so the place is looked up again', () => {
    expect(expireGeocodedPlaces([{ name: '없는 곳', geocodedAt: daysAgo(31) }], NOW)).toEqual({
      changed: true,
      places: [{ name: '없는 곳' }],
    });
  });

  it('reports no change when nothing has expired', () => {
    const places: PlaceInfo[] = [{ name: '최근', lat: 37.6, lng: 127.2, geocodedAt: daysAgo(2) }];
    const result = expireGeocodedPlaces(places, NOW);
    expect(result.changed).toBe(false);
    expect(result.places).toEqual(places);
  });
});
