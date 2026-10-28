import type { CaptureItem } from '../types/capture';

export interface LatLng {
  lat: number;
  lng: number;
}

export type RouteCandidateCapture = Pick<
  CaptureItem,
  'id' | 'title' | 'places' | 'source' | 'imageUrl' | 'createdAt'
>;

export interface RouteCandidateInput {
  origin: LatLng;
  destination: LatLng;
  captures: RouteCandidateCapture[];
  maxExtraMinutes?: number;
}

export interface RouteCandidate {
  captureId: number;
  captureTitle: string;
  placeIndex: number;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  extraMinutes: number;
  savedAt: string;
  source: string;
  imageUrl: string;
}

// 시험값: 실제 경로 시간을 받기 전까지 직선 거리로 우회 시간을 어림합니다.
export const DEFAULT_MAX_EXTRA_MINUTES = 20;
export const DETOUR_ROAD_FACTOR = 1.3;
export const DETOUR_AVERAGE_SPEED_KMH = 40;

const EARTH_RADIUS_KM = 6371.0088;
const KM_PER_DEGREE_LAT = 110.574;
const KM_PER_DEGREE_LNG_AT_EQUATOR = 111.32;
const MIN_ROUTE_KM = 0.001;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

// 출발→목적지 선분 위에서 장소가 놓인 위치. 0이면 출발, 1이면 목적지입니다.
function positionAlongRoute(origin: LatLng, destination: LatLng, point: LatLng): number {
  const kmPerDegreeLng =
    KM_PER_DEGREE_LNG_AT_EQUATOR * Math.cos(toRadians((origin.lat + destination.lat) / 2));
  const routeX = (destination.lng - origin.lng) * kmPerDegreeLng;
  const routeY = (destination.lat - origin.lat) * KM_PER_DEGREE_LAT;
  const pointX = (point.lng - origin.lng) * kmPerDegreeLng;
  const pointY = (point.lat - origin.lat) * KM_PER_DEGREE_LAT;
  return (pointX * routeX + pointY * routeY) / (routeX ** 2 + routeY ** 2);
}

function toExtraMinutes(detourKm: number): number {
  const minutes = ((detourKm * DETOUR_ROAD_FACTOR) / DETOUR_AVERAGE_SPEED_KMH) * 60;
  return Math.max(0, Math.round(minutes));
}

/**
 * 출발지에서 목적지로 가는 길에 들를 수 있는 저장 장소를 고릅니다.
 * 저장한 곳만 후보로 삼고, 우회 시간이 적은 순, 같으면 최근에 저장한 순으로 돌려줍니다.
 */
export function findRouteCandidates({
  origin,
  destination,
  captures,
  maxExtraMinutes = DEFAULT_MAX_EXTRA_MINUTES,
}: RouteCandidateInput): RouteCandidate[] {
  const directKm = distanceKm(origin, destination);
  if (directKm < MIN_ROUTE_KM) return [];

  const candidates: RouteCandidate[] = [];

  for (const capture of captures) {
    capture.places.forEach((place, placeIndex) => {
      if (!isValidLatLng(place.lat, place.lng)) return;
      const point = { lat: place.lat as number, lng: place.lng as number };

      const position = positionAlongRoute(origin, destination, point);
      if (position < 0 || position > 1) return;

      const detourKm = distanceKm(origin, point) + distanceKm(point, destination) - directKm;
      const extraMinutes = toExtraMinutes(detourKm);
      if (extraMinutes > maxExtraMinutes) return;

      candidates.push({
        captureId: capture.id,
        captureTitle: capture.title,
        placeIndex,
        name: place.name,
        address: place.address,
        lat: point.lat,
        lng: point.lng,
        extraMinutes,
        savedAt: capture.createdAt,
        source: capture.source,
        imageUrl: capture.imageUrl,
      });
    });
  }

  return candidates.sort(
    (a, b) => a.extraMinutes - b.extraMinutes || b.savedAt.localeCompare(a.savedAt)
  );
}
