import {
  applyGeocodeResult,
  needsGeocoding,
  type PlaceGeocodeResult,
  type PlaceInfo,
} from '@scrave/shared';
import { buildGeocodingQuery, requestGoogleGeocode, validateGeocodingInput } from '@/lib/geocoding';

type FetchLike = (input: string) => Promise<Response>;

export type PlaceGeocoder = (place: PlaceInfo) => Promise<PlaceGeocodeResult | null>;

export function createGooglePlaceGeocoder(apiKey: string, fetchImpl?: FetchLike): PlaceGeocoder {
  return async (place) => {
    const result = await requestGoogleGeocode(
      buildGeocodingQuery(place.name, place.address),
      apiKey,
      fetchImpl
    );
    return result ? { lat: result.lat, lng: result.lng, placeId: result.placeId } : null;
  };
}

/**
 * 좌표가 없거나 30일이 지난 장소만 지오코딩해 결과를 반영합니다.
 * 찾지 못한 장소는 시도 시각을 남겨 30일 동안 다시 묻지 않고,
 * 한도 초과 같은 오류가 난 장소는 그대로 두어 다음에 다시 시도합니다.
 */
export async function refreshPlaceCoordinates(
  places: PlaceInfo[],
  { now, geocode }: { now: Date; geocode: PlaceGeocoder }
): Promise<{ places: PlaceInfo[]; changed: boolean }> {
  let changed = false;
  const next = await Promise.all(
    places.map(async (place) => {
      if (!needsGeocoding(place, now)) return place;
      if (!validateGeocodingInput(place.name, place.address).valid) return place;
      try {
        const result = await geocode(place);
        changed = true;
        return applyGeocodeResult(place, result, now);
      } catch (error) {
        console.warn('[place-coordinates] geocode failed:', error);
        return place;
      }
    })
  );
  return { places: changed ? next : places, changed };
}
