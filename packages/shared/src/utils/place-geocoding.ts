import type { PlaceInfo } from '../types/capture';

/**
 * Google 약관은 Geocoding API로 받은 위도·경도를 최대 30일 연속으로만 보관하게 합니다.
 * place_id는 계속 보관할 수 있습니다.
 */
export const GEOCODE_CACHE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PlaceGeocodeResult {
  lat: number;
  lng: number;
  placeId?: string;
}

function hasCoordinates(place: PlaceInfo): boolean {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng);
}

function isExpired(geocodedAt: string, now: Date): boolean {
  const attemptedAt = Date.parse(geocodedAt);
  return Number.isNaN(attemptedAt) || now.getTime() - attemptedAt > GEOCODE_CACHE_DAYS * DAY_MS;
}

function withoutGeocodedFields(place: PlaceInfo): PlaceInfo {
  const { lat: _lat, lng: _lng, geocodedAt: _geocodedAt, ...rest } = place;
  return rest;
}

/**
 * 지오코딩을 (다시) 해야 하는지 판단합니다.
 * 30일 안에 시도한 장소는 실패했더라도 다시 묻지 않고,
 * 지오코딩 없이 들어온 좌표(가이드 저장 등)는 그대로 둡니다.
 */
export function needsGeocoding(place: PlaceInfo, now: Date): boolean {
  if (place.geocodedAt) return isExpired(place.geocodedAt, now);
  return !hasCoordinates(place);
}

/** 지도나 경로 판정에 바로 쓸 수 있는 좌표가 있는지 판단합니다. */
export function hasFreshCoordinates(place: PlaceInfo, now: Date): boolean {
  return hasCoordinates(place) && !needsGeocoding(place, now);
}

/** 지오코딩 결과를 장소에 반영합니다. 실패하면 이전에 받은 좌표를 지우고 시도 시각만 남깁니다. */
export function applyGeocodeResult(
  place: PlaceInfo,
  result: PlaceGeocodeResult | null,
  now: Date
): PlaceInfo {
  const base = withoutGeocodedFields(place);
  const geocodedAt = now.toISOString();
  if (!result) return { ...base, geocodedAt };

  const placeId = result.placeId ?? place.placeId;
  return {
    ...base,
    lat: result.lat,
    lng: result.lng,
    ...(placeId ? { placeId } : {}),
    geocodedAt,
  };
}

/** 30일이 지난 지오코딩 좌표와 시도 기록을 지웁니다. place_id는 남깁니다. */
export function expireGeocodedPlaces(
  places: PlaceInfo[],
  now: Date
): { places: PlaceInfo[]; changed: boolean } {
  let changed = false;
  const next = places.map((place) => {
    if (!place.geocodedAt || !isExpired(place.geocodedAt, now)) return place;
    changed = true;
    return withoutGeocodedFields(place);
  });
  return { places: changed ? next : places, changed };
}
