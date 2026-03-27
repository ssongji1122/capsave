'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCaptures } from '@/contexts/CapturesContext';
import { BottomSheet } from './BottomSheet';
import { PlacePopup } from './PlacePopup';

export interface MapPlace {
  name: string;
  address?: string;
  date?: string;
  lat: number;
  lng: number;
  captureId: number;
  captureTitle: string;
  captureImageUrl: string;
  placeIndex: number;
}

type MapProvider = 'naver' | 'google';

export function MapView() {
  const { captures } = useCaptures();
  const searchParams = useSearchParams();
  const captureFilter = searchParams.get('capture');

  const [provider, setProvider] = useState<MapProvider>('naver');
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize place captures with stable identity key
  const placeCaptures = useMemo(
    () => captures.filter((c) => c.category === 'place' && c.places.length > 0),
    [captures]
  );
  const captureIds = placeCaptures.map((c) => c.id).sort().join(',');
  const hasGeocoded = useRef(false);

  // Geocode all places with parallel requests
  useEffect(() => {
    if (placeCaptures.length === 0) {
      setIsLoading(false);
      return;
    }
    if (hasGeocoded.current) return;
    hasGeocoded.current = true;

    const run = async () => {
      setIsLoading(true);

      type PlaceEntry = { place: typeof placeCaptures[0]['places'][0]; capture: typeof placeCaptures[0]; index: number };
      const withCoords: MapPlace[] = [];
      const toGeocode: PlaceEntry[] = [];

      for (const capture of placeCaptures) {
        for (let i = 0; i < capture.places.length; i++) {
          const place = capture.places[i];
          if (place.lat && place.lng) {
            withCoords.push({
              name: place.name, address: place.address, date: place.date,
              lat: place.lat, lng: place.lng,
              captureId: capture.id, captureTitle: capture.title,
              captureImageUrl: capture.imageUrl, placeIndex: i,
            });
          } else {
            toGeocode.push({ place, capture, index: i });
          }
        }
      }

      // Parallel geocoding with Promise.allSettled
      const results = await Promise.allSettled(
        toGeocode.map(({ place }) =>
          fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: place.name, address: place.address }),
          }).then((res) => res.json())
        )
      );

      const geocoded: MapPlace[] = results
        .map((result, i) => {
          if (result.status !== 'fulfilled' || !result.value.lat || !result.value.lng) return null;
          const { place, capture, index } = toGeocode[i];
          return {
            name: place.name,
            address: place.address || result.value.formattedAddress,
            date: place.date,
            lat: result.value.lat,
            lng: result.value.lng,
            captureId: capture.id,
            captureTitle: capture.title,
            captureImageUrl: capture.imageUrl,
            placeIndex: index,
          } as MapPlace;
        })
        .filter((p): p is MapPlace => p !== null);

      setPlaces([...withCoords, ...geocoded]);
      setIsLoading(false);
    };

    run();
  }, [captureIds]);

  // Filter by capture if query param present
  const filteredPlaces = captureFilter
    ? places.filter((p) => p.captureId === Number(captureFilter))
    : places;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📍</div>
          <p className="text-text-secondary">장소 좌표를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (filteredPlaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">🗺</div>
          <p className="text-text-primary font-semibold">저장된 장소가 없습니다</p>
          <p className="text-text-tertiary text-sm mt-1">장소 캡처를 추가하면 지도에 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Top bar: Provider toggle + filters */}
      <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-center">
        {/* Map provider toggle */}
        <div className="flex bg-black/75 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10">
          <button
            onClick={() => setProvider('naver')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              provider === 'naver'
                ? 'text-place-accent bg-[rgba(52,211,153,0.15)]'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            네이버
          </button>
          <button
            onClick={() => setProvider('google')}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              provider === 'google'
                ? 'text-place-accent bg-[rgba(52,211,153,0.15)]'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            구글
          </button>
        </div>

        {/* Place count */}
        <div className="px-3 py-2 bg-black/75 backdrop-blur-xl rounded-xl border border-white/10 text-xs text-place-accent font-semibold">
          📍 {filteredPlaces.length}개 장소
        </div>
      </div>

      {/* Map placeholder */}
      <div className="h-full w-full bg-surface">
        {provider === 'naver' ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            네이버맵 (NAVER_MAPS_CLIENT_ID 설정 필요)
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            구글맵 (GOOGLE_MAPS_API_KEY 설정 필요)
          </div>
        )}
      </div>

      {/* Place popup */}
      {selectedPlace && (
        <PlacePopup
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {/* Bottom sheet */}
      <BottomSheet
        places={filteredPlaces}
        onPlaceSelect={(place) => setSelectedPlace(place)}
        selectedPlace={selectedPlace}
      />
    </div>
  );
}
