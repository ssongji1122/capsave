import { describe, it, expect } from 'vitest';
import { findRouteCandidates, RouteCandidateCapture } from '../utils/route-candidates';

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
const GANGNEUNG_STATION = { lat: 37.7637, lng: 128.8996 };

function capture(
  id: number,
  places: RouteCandidateCapture['places'],
  createdAt = '2026-10-01T00:00:00.000Z'
): RouteCandidateCapture {
  return {
    id,
    title: `캡처 ${id}`,
    places,
    source: 'instagram',
    imageUrl: `captures/${id}.jpg`,
    createdAt,
  };
}

describe('findRouteCandidates', () => {
  it('keeps a saved place on the way and drops one far off the route', () => {
    const candidates = findRouteCandidates({
      origin: SEOUL_CITY_HALL,
      destination: GANGNEUNG_STATION,
      captures: [
        capture(1, [{ name: '양평 카페', lat: 37.4917, lng: 127.4876 }]),
        capture(2, [{ name: '부산 식당', lat: 35.1796, lng: 129.0756 }]),
      ],
    });

    expect(candidates.map((c) => c.name)).toEqual(['양평 카페']);
    expect(candidates[0].extraMinutes).toBeGreaterThan(0);
    expect(candidates[0].extraMinutes).toBeLessThanOrEqual(20);
  });

  it('returns zero extra minutes for a place right on the straight route', () => {
    const candidates = findRouteCandidates({
      origin: { lat: 37.0, lng: 127.0 },
      destination: { lat: 37.0, lng: 128.0 },
      captures: [capture(1, [{ name: '중간 지점', lat: 37.0, lng: 127.5 }])],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].extraMinutes).toBe(0);
  });

  it('respects a custom detour limit', () => {
    const candidates = findRouteCandidates({
      origin: SEOUL_CITY_HALL,
      destination: GANGNEUNG_STATION,
      captures: [capture(1, [{ name: '양평 카페', lat: 37.4917, lng: 127.4876 }])],
      maxExtraMinutes: 1,
    });

    expect(candidates).toEqual([]);
  });

  it('drops places behind the origin or beyond the destination', () => {
    const candidates = findRouteCandidates({
      origin: SEOUL_CITY_HALL,
      destination: GANGNEUNG_STATION,
      captures: [
        capture(1, [{ name: '출발 뒤쪽', lat: 37.5665, lng: 126.9667 }]),
        capture(2, [{ name: '도착 너머', lat: 37.7637, lng: 128.911 }]),
      ],
    });

    expect(candidates).toEqual([]);
  });

  it('skips places without valid coordinates', () => {
    const candidates = findRouteCandidates({
      origin: { lat: 37.0, lng: 127.0 },
      destination: { lat: 37.0, lng: 128.0 },
      captures: [
        capture(1, [
          { name: '좌표 없음' },
          { name: '위도 범위 밖', lat: 137.0, lng: 127.5 },
          { name: '숫자 아님', lat: Number.NaN, lng: 127.5 },
          { name: '정상', lat: 37.0, lng: 127.5 },
        ]),
      ],
    });

    expect(candidates.map((c) => c.name)).toEqual(['정상']);
    expect(candidates[0].placeIndex).toBe(3);
  });

  it('sorts by extra minutes, then by the most recent save', () => {
    const candidates = findRouteCandidates({
      origin: { lat: 37.0, lng: 127.0 },
      destination: { lat: 37.0, lng: 128.0 },
      captures: [
        capture(1, [{ name: '조금 돌아감', lat: 37.05, lng: 127.5 }], '2026-10-20T00:00:00.000Z'),
        capture(2, [{ name: '예전 저장', lat: 37.0, lng: 127.3 }], '2026-09-01T00:00:00.000Z'),
        capture(3, [{ name: '최근 저장', lat: 37.0, lng: 127.6 }], '2026-10-10T00:00:00.000Z'),
      ],
    });

    expect(candidates.map((c) => c.name)).toEqual(['최근 저장', '예전 저장', '조금 돌아감']);
  });

  it('carries the save context the car needs to explain a suggestion', () => {
    const [candidate] = findRouteCandidates({
      origin: { lat: 37.0, lng: 127.0 },
      destination: { lat: 37.0, lng: 128.0 },
      captures: [
        capture(7, [
          { name: '다른 장소', lat: 36.0, lng: 127.5 },
          { name: '수목원', address: '경기도 어딘가', lat: 37.0, lng: 127.5 },
        ], '2026-10-02T09:00:00.000Z'),
      ],
    });

    expect(candidate).toEqual({
      captureId: 7,
      captureTitle: '캡처 7',
      placeIndex: 1,
      name: '수목원',
      address: '경기도 어딘가',
      lat: 37.0,
      lng: 127.5,
      extraMinutes: 0,
      savedAt: '2026-10-02T09:00:00.000Z',
      source: 'instagram',
      imageUrl: 'captures/7.jpg',
    });
  });

  it('returns nothing when origin and destination are the same point', () => {
    const candidates = findRouteCandidates({
      origin: SEOUL_CITY_HALL,
      destination: SEOUL_CITY_HALL,
      captures: [capture(1, [{ name: '근처 카페', lat: 37.567, lng: 126.979 }])],
    });

    expect(candidates).toEqual([]);
  });
});
