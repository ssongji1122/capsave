import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StaticArchiveMap } from '@/components/map/StaticArchiveMap';
import type { MapPlace } from '@/components/map/MapView';

const places: MapPlace[] = [
  { name: '성수 테스트 카페', lat: 37.5446, lng: 127.0559, captureId: 501, captureTitle: '성수 카페 저장', captureImageUrl: '', placeIndex: 0 },
  { name: '을지로 테스트 식당', lat: 37.5663, lng: 126.9918, captureId: 502, captureTitle: '을지로 맛집 저장', captureImageUrl: '', placeIndex: 0 },
];

afterEach(cleanup);

it('leaves the place count to the map top bar so it is not shown twice', () => {
  render(<StaticArchiveMap places={places} selectedPlace={null} onPlaceSelect={vi.fn()} />);
  expect(screen.queryByText(/개 장소/)).toBeNull();
  expect(screen.getByRole('button', { name: '성수 테스트 카페 선택' })).toBeTruthy();
});
