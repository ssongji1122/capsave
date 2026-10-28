import { describe, expect, it } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import { buildCapturePlacesCoordUpdates } from '@/lib/geocode-cache';

function makePlaceCapture(id: number, places: CaptureItem['places']): CaptureItem {
  return {
    id,
    category: 'place',
    title: `장소 캡처 ${id}`,
    summary: '',
    places,
    extractedText: '',
    links: [],
    tags: [],
    source: 'instagram',
    imageUrl: 'captures/u/1.jpg',
    createdAt: '2026-10-20T00:00:00Z',
    userId: 'user-1',
    confidence: 0.9,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  };
}

describe('buildCapturePlacesCoordUpdates (G4 geocoding cache)', () => {
  it('builds updated PlaceInfo arrays only for captures that gained newly geocoded coordinates', () => {
    const c1 = makePlaceCapture(10, [
      { name: '성수 카페', address: '서울 성동구' },
      { name: '이미 좌표 있음', address: '서울 강남구', lat: 37.5, lng: 127.0 },
    ]);
    const c2 = makePlaceCapture(20, [
      { name: '모두 좌표 있음', lat: 37.55, lng: 126.98 },
    ]);
    const guestCapture = makePlaceCapture(-1, [
      { name: '게스트 장소', address: '서울 마포구' },
    ]);

    const updates = buildCapturePlacesCoordUpdates(
      [c1, c2, guestCapture],
      [
        {
          captureId: 10,
          placeIndex: 0,
          lat: 37.5446,
          lng: 127.0557,
          address: '서울 성동구 연무장길 11',
        },
        {
          captureId: -1,
          placeIndex: 0,
          lat: 37.55,
          lng: 126.92,
        },
      ],
    );

    // Guest captures (id <= 0) and unchanged captures (c2) are skipped
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({
      captureId: 10,
      places: [
        {
          name: '성수 카페',
          address: '서울 성동구',
          lat: 37.5446,
          lng: 127.0557,
        },
        {
          name: '이미 좌표 있음',
          address: '서울 강남구',
          lat: 37.5,
          lng: 127.0,
        },
      ],
    });
  });
});
