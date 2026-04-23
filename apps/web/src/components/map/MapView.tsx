'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapPin, Map } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCaptures } from '@/contexts/CapturesContext';
import { useGuestCaptures } from '@/contexts/GuestCapturesContext';
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

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        LatLngBounds: new () => KakaoLatLngBounds;
        Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
        Marker: new (options: { position: KakaoLatLng; map?: KakaoMap }) => KakaoMarker;
        CustomOverlay: new (options: {
          position: KakaoLatLng;
          content: string;
          yAnchor?: number;
          xAnchor?: number;
          map?: KakaoMap;
        }) => KakaoCustomOverlay;
        event: {
          addListener: (target: unknown, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}
interface KakaoLatLngBounds {
  extend(latlng: KakaoLatLng): void;
}
interface KakaoMap {
  setBounds(bounds: KakaoLatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
  panTo(latlng: KakaoLatLng): void;
}
interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
}
interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void;
}

const KAKAO_SDK_URL = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`;

function useKakaoMaps() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already loaded
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => setLoaded(true));
      return;
    }

    // Check if script tag already exists
    const existing = document.querySelector(`script[src*="dapi.kakao.com"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        window.kakao.maps.load(() => setLoaded(true));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => setLoaded(true));
    };
    document.head.appendChild(script);
  }, []);

  return loaded;
}

export function MapView() {
  const { captures } = useCaptures();
  const { guestCaptures } = useGuestCaptures();
  const searchParams = useSearchParams();
  const captureFilter = searchParams.get('capture');

  // Merge auth captures with guest captures (auth takes priority, guest fills in for unauthenticated users)
  const allCaptures = useMemo(
    () => [...captures, ...guestCaptures],
    [captures, guestCaptures]
  );

  const kakaoReady = useKakaoMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const overlaysRef = useRef<KakaoCustomOverlay[]>([]);

  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize place captures
  const placeCaptures = useMemo(
    () => allCaptures.filter((c) => c.category === 'place' && c.places.length > 0),
    [allCaptures]
  );
  const captureIds = placeCaptures.map((c) => c.id).sort().join(',');
  const hasGeocoded = useRef(false);

  // Geocode all places
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

  // Initialize Kakao Map
  useEffect(() => {
    if (!kakaoReady || !mapContainerRef.current || filteredPlaces.length === 0) return;

    const { kakao } = window;

    // Default center: Seoul
    const defaultCenter = new kakao.maps.LatLng(37.5665, 126.978);
    const map = new kakao.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      level: 5,
    });
    mapRef.current = map;

    // Fit bounds to all places
    const bounds = new kakao.maps.LatLngBounds();
    filteredPlaces.forEach((p) => {
      bounds.extend(new kakao.maps.LatLng(p.lat, p.lng));
    });
    map.setBounds(bounds, 60, 40, 180, 40);

    // Create markers with numbered labels
    const newMarkers: KakaoMarker[] = [];
    const newOverlays: KakaoCustomOverlay[] = [];

    filteredPlaces.forEach((place, idx) => {
      const position = new kakao.maps.LatLng(place.lat, place.lng);

      // Custom numbered marker overlay
      const content = `
        <div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: #34D399; color: #050508;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer; border: 2px solid #050508;
        " data-place-idx="${idx}">${idx + 1}</div>
      `;

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 1,
        xAnchor: 0.5,
        map,
      });

      // Invisible marker for click events
      const marker = new kakao.maps.Marker({ position, map });
      kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedPlace(place);
      });

      newMarkers.push(marker);
      newOverlays.push(overlay);
    });

    markersRef.current = newMarkers;
    overlaysRef.current = newOverlays;

    return () => {
      newMarkers.forEach((m) => m.setMap(null));
      newOverlays.forEach((o) => o.setMap(null));
    };
  }, [kakaoReady, filteredPlaces]);

  // Pan to selected place
  const handlePlaceSelect = useCallback((place: MapPlace) => {
    setSelectedPlace(place);
    if (mapRef.current && window.kakao) {
      const pos = new window.kakao.maps.LatLng(place.lat, place.lng);
      mapRef.current.panTo(pos);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-label="로딩 중">
        <div className="text-center">
          <MapPin size={32} className="text-place-accent animate-bounce mx-auto mb-4" />
          <p className="text-text-secondary">장소 좌표를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (filteredPlaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Map size={32} className="text-place-accent mx-auto mb-4" />
          <p className="text-text-primary font-semibold">저장된 장소가 없습니다</p>
          <p className="text-text-tertiary text-sm mt-1">장소 캡처를 추가하면 지도에 표시됩니다</p>
        </div>
      </div>
    );
  }

  const hasKakaoKey = !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  return (
    <div className="relative h-full">
      {/* Top bar: Place count */}
      <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-center">
        <div className="px-3 py-2 bg-black/75 backdrop-blur-xl rounded-xl border border-white/10 text-xs text-place-accent font-semibold">
          <MapPin size={12} className="inline mr-1" />{filteredPlaces.length}개 장소
        </div>
      </div>

      {/* Map container */}
      <div className="h-full w-full bg-surface">
        {!hasKakaoKey ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
            <div className="text-center">
              <p className="mb-2">카카오맵 API 키가 설정되지 않았습니다</p>
              <p className="text-xs text-text-tertiary">
                .env.local에 NEXT_PUBLIC_KAKAO_JS_KEY를 추가하세요
              </p>
            </div>
          </div>
        ) : (
          <div ref={mapContainerRef} className="h-full w-full" />
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
        onPlaceSelect={handlePlaceSelect}
        selectedPlace={selectedPlace}
      />
    </div>
  );
}
