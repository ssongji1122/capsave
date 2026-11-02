import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import { RouteCandidatesPanel } from '@/components/map/RouteCandidatesPanel';
import type { MapPlace } from '@/components/map/MapView';

afterEach(() => {
  cleanup();
});

const SAMPLE_PLACES: MapPlace[] = [
  {
    name: '서울역',
    address: '서울 용산구 한강대로 405',
    lat: 37.5547,
    lng: 126.9707,
    captureId: 1,
    captureTitle: '출발지 캡처',
    captureImageUrl: 'captures/u/1.jpg',
    placeIndex: 0,
  },
  {
    name: '성수 카페',
    address: '서울 성동구 연무장길 11',
    lat: 37.5446,
    lng: 127.0557,
    captureId: 2,
    captureTitle: '경유 카페 캡처',
    captureImageUrl: 'captures/u/2.jpg',
    placeIndex: 0,
  },
  {
    name: '잠실 롯데월드타워',
    address: '서울 송파구 올림픽로 300',
    lat: 37.5126,
    lng: 127.1025,
    captureId: 3,
    captureTitle: '목적지 캡처',
    captureImageUrl: 'captures/u/3.jpg',
    placeIndex: 0,
  },
];

const SAMPLE_CAPTURES: CaptureItem[] = [
  {
    id: 1,
    category: 'place',
    title: '출발지 캡처',
    summary: '',
    places: [{ name: '서울역', lat: 37.5547, lng: 126.9707 }],
    extractedText: '',
    links: [],
    tags: [],
    source: 'naver',
    imageUrl: 'captures/u/1.jpg',
    createdAt: '2026-10-20T00:00:00Z',
    userId: 'u1',
    confidence: 0.9,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  },
  {
    id: 2,
    category: 'place',
    title: '경유 카페 캡처',
    summary: '',
    places: [{ name: '성수 카페', address: '서울 성동구 연무장길 11', lat: 37.5446, lng: 127.0557 }],
    extractedText: '',
    links: [],
    tags: [],
    source: 'instagram',
    imageUrl: 'captures/u/2.jpg',
    createdAt: '2026-10-22T00:00:00Z',
    userId: 'u1',
    confidence: 0.95,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  },
  {
    id: 3,
    category: 'place',
    title: '목적지 캡처',
    summary: '',
    places: [{ name: '잠실 롯데월드타워', lat: 37.5126, lng: 127.1025 }],
    extractedText: '',
    links: [],
    tags: [],
    source: 'naver',
    imageUrl: 'captures/u/3.jpg',
    createdAt: '2026-10-21T00:00:00Z',
    userId: 'u1',
    confidence: 0.92,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
  },
];

describe('RouteCandidatesPanel (Track 2 route-candidates wireup)', () => {
  it('opens the route finder, computes stopover candidates between origin and destination, and selects a candidate', () => {
    const onSelectPlace = vi.fn();
    render(
      React.createElement(RouteCandidatesPanel, {
        places: SAMPLE_PLACES,
        captures: SAMPLE_CAPTURES,
        onSelectPlace,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /가는 길 경유 추천/ }));

    const originSelect = screen.getByLabelText('출발 장소');
    const destSelect = screen.getByLabelText('도착 장소');

    fireEvent.change(originSelect, { target: { value: '1:0' } });
    fireEvent.change(destSelect, { target: { value: '3:0' } });

    // 성수 카페 lies along the route between 서울역 and 잠실 within 20 minutes detour
    const candidateBtn = screen.getByRole('button', { name: /성수 카페/ });
    expect(candidateBtn).toBeTruthy();

    fireEvent.click(candidateBtn);
    expect(onSelectPlace).toHaveBeenCalledWith(
      expect.objectContaining({ name: '성수 카페', captureId: 2 }),
    );
  });
});
