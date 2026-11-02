'use client';

import { MapPin } from 'lucide-react';
import { ARCHIVE_APPEARANCE } from '@scrave/shared';
import { getStaticPinPosition } from '@/lib/static-map-layout';
import type { MapPlace } from './MapView';

interface StaticArchiveMapProps {
  places: readonly MapPlace[];
  selectedPlace: MapPlace | null;
  onPlaceSelect: (place: MapPlace) => void;
}

export function StaticArchiveMap({
  places,
  selectedPlace,
  onPlaceSelect,
}: StaticArchiveMapProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(22,21,19,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(22,21,19,0.06)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="absolute left-4 top-48 hidden max-w-[280px] rounded-2xl border border-border bg-surface/90 p-4 backdrop-blur md:block">
        <p className="text-xs font-semibold text-text-primary" style={{ fontFamily: 'var(--font-label)' }}>
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
        const position = getStaticPinPosition(place, places);

        return (
          <button
            key={`${place.captureId}-${place.placeIndex}`}
            type="button"
            onClick={() => onPlaceSelect(place)}
            className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background text-xs font-bold text-white transition-all ${
              isSelected ? 'scale-110 bg-text-primary' : 'hover:scale-105'
            }`}
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              ...(isSelected ? {} : { backgroundColor: ARCHIVE_APPEARANCE.places.color }),
            }}
            aria-label={`${place.name} 선택`}
          >
            {index + 1}
          </button>
        );
      })}

      <div className="absolute bottom-36 right-4 hidden max-w-xs rounded-2xl border border-border bg-surface/90 p-4 backdrop-blur md:block">
        <p className="flex items-start gap-2 text-xs leading-5 text-text-tertiary">
          <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: ARCHIVE_APPEARANCE.places.color }} aria-hidden="true" />
          아래 장소 카드를 누르면 지도 선택과 캡처 정보가 함께 바뀝니다.
        </p>
      </div>
    </div>
  );
}
