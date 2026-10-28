'use client';

import { MapPin } from 'lucide-react';
import type { MapPlace } from './MapView';

interface StaticArchiveMapProps {
  places: readonly MapPlace[];
  selectedPlace: MapPlace | null;
  onPlaceSelect: (place: MapPlace) => void;
}

const MAP_PADDING_PERCENT = 12;
const MAP_SPAN_FALLBACK = 0.01;

function getPinPosition(
  place: MapPlace,
  places: readonly MapPlace[],
): { readonly left: number; readonly top: number } {
  const lats = places.map((item) => item.lat);
  const lngs = places.map((item) => item.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(MAP_SPAN_FALLBACK, maxLat - minLat);
  const lngSpan = Math.max(MAP_SPAN_FALLBACK, maxLng - minLng);
  const available = 100 - MAP_PADDING_PERCENT * 2;

  return {
    left: MAP_PADDING_PERCENT + ((place.lng - minLng) / lngSpan) * available,
    top: MAP_PADDING_PERCENT + ((maxLat - place.lat) / latSpan) * available,
  };
}

export function StaticArchiveMap({
  places,
  selectedPlace,
  onPlaceSelect,
}: StaticArchiveMapProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(244,132,95,0.12),transparent_28%),radial-gradient(circle_at_76%_28%,rgba(52,211,153,0.12),transparent_30%),radial-gradient(circle_at_54%_74%,rgba(125,211,252,0.10),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(232,213,183,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(232,213,183,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="absolute left-4 top-20 max-w-[280px] rounded-2xl border border-border bg-surface/90 p-4 backdrop-blur">
        <p className="text-xs font-semibold text-place-accent" style={{ fontFamily: 'var(--font-label)' }}>
          ARCHIVE MAP
        </p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          지도 키가 없어도 저장한 장소와 캡처를 함께 탐색할 수 있습니다. 실제 좌표가 있는 항목은 위치 비율을 유지합니다.
        </p>
      </div>

      {places.map((place, index) => {
        const isSelected =
          selectedPlace?.captureId === place.captureId &&
          selectedPlace.placeIndex === place.placeIndex;
        const position = getPinPosition(place, places);

        return (
          <button
            key={`${place.captureId}-${place.placeIndex}`}
            type="button"
            onClick={() => onPlaceSelect(place)}
            className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-bold transition-all ${
              isSelected
                ? 'scale-110 border-primary bg-primary text-background'
                : 'border-background bg-place-accent text-background hover:scale-105'
            }`}
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
            aria-label={`${place.name} 선택`}
          >
            {index + 1}
          </button>
        );
      })}

      <div className="absolute bottom-36 right-4 hidden max-w-xs rounded-2xl border border-border bg-surface/90 p-4 backdrop-blur md:block">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <MapPin size={16} className="text-place-accent" aria-hidden="true" />
          {places.length}개 장소
        </div>
        <p className="mt-1 text-xs leading-5 text-text-tertiary">
          아래 장소 카드를 누르면 지도 선택과 캡처 정보가 함께 바뀝니다.
        </p>
      </div>
    </div>
  );
}
