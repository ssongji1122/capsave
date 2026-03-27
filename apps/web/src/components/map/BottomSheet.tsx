'use client';

import { useRef, useEffect } from 'react';
import { MapPlace } from './MapView';

interface BottomSheetProps {
  places: MapPlace[];
  onPlaceSelect: (place: MapPlace) => void;
  selectedPlace: MapPlace | null;
}

export function BottomSheet({ places, onPlaceSelect, selectedPlace }: BottomSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to selected place card
  useEffect(() => {
    if (selectedPlace && scrollRef.current) {
      const idx = places.findIndex(
        (p) => p.name === selectedPlace.name && p.captureId === selectedPlace.captureId
      );
      if (idx >= 0) {
        const card = scrollRef.current.children[idx] as HTMLElement;
        card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedPlace, places]);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border rounded-t-2xl z-10 pb-safe">
      {/* Handle bar */}
      <div className="flex justify-center py-2">
        <div className="w-9 h-1 bg-border-light rounded-full" />
      </div>

      {/* Horizontal scroll cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {places.map((place, idx) => {
          const isSelected =
            selectedPlace?.name === place.name &&
            selectedPlace?.captureId === place.captureId;

          return (
            <button
              key={`${place.captureId}-${place.placeIndex}`}
              onClick={() => onPlaceSelect(place)}
              className={`flex-shrink-0 w-44 p-3 rounded-xl text-left transition-all ${
                isSelected
                  ? 'bg-place-surface border border-place-border'
                  : 'bg-surface-elevated border border-border hover:border-border-light'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-place-accent flex items-center justify-center text-[10px] font-bold text-background flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="font-semibold text-xs text-text-primary truncate">
                  {place.name}
                </span>
              </div>
              <p className="text-[10px] text-text-tertiary mt-1.5 truncate font-mono">
                {place.address || ''}
              </p>
              <p className="text-[10px] text-text-tertiary mt-0.5 truncate">
                📸 {place.captureTitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
