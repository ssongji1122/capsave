/// <reference types="google.maps" />
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

// --- SDK loaders ---

declare global {
  interface Window {
    google: typeof google;
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => NaverMap;
        Marker: new (opts: object) => NaverMarker;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        LatLngBounds: new (sw: NaverLatLng, ne: NaverLatLng) => NaverBounds;
        Event: { addListener: (target: object, type: string, handler: () => void) => void };
        Service: {
          Status: { OK: string };
          geocode: (opts: { query: string }, cb: (status: string, response: NaverGeocodeResponse) => void) => void;
        };
      };
    };
  }
}

interface NaverLatLng { lat(): number; lng(): number; }
interface NaverBounds { extend(latlng: NaverLatLng): void; }
interface NaverMap { fitBounds(b: NaverBounds, opts?: object): void; panTo(latlng: NaverLatLng): void; }
interface NaverMarker { setMap(map: NaverMap | null): void; }
interface NaverGeocodeResponse { v2?: { addresses?: { x: string; y: string; roadAddress?: string }[] } }

function useNaverMaps() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.naver?.maps) { setLoaded(true); return; }
    const existing = document.querySelector('script[src*="openapi.map.naver.com"]');
    if (existing) { existing.addEventListener('load', () => setLoaded(true)); return; }
    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}&submodules=geocoder`;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  return loaded;
}

function useGoogleMaps() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google?.maps) { setLoaded(true); return; }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { existing.addEventListener('load', () => setLoaded(true)); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  return loaded;
}

// Naver client-side geocoding (uses the Maps JS SDK geocoder submodule)
function naverGeocode(query: string): Promise<{ lat: number; lng: number; address?: string } | null> {
  return new Promise((resolve) => {
    const svc = window.naver?.maps?.Service;
    if (!svc) { resolve(null); return; }
    svc.geocode({ query }, (status, response) => {
      if (status !== svc.Status.OK) { resolve(null); return; }
      const addr = response?.v2?.addresses?.[0];
      if (!addr) { resolve(null); return; }
      resolve({ lat: parseFloat(addr.y), lng: parseFloat(addr.x), address: addr.roadAddress });
    });
  });
}

// --- Main component ---

export function MapView() {
  const { captures, isLoading: contextLoading, isAuthenticated } = useCaptures();
  const searchParams = useSearchParams();
  const captureFilter = searchParams.get('capture');

  const [provider, setProvider] = useState<MapProvider>('naver');

  const naverReady = useNaverMaps();
  const googleReady = useGoogleMaps();

  const naverContainerRef = useRef<HTMLDivElement>(null);
  const googleContainerRef = useRef<HTMLDivElement>(null);
  const naverMapRef = useRef<NaverMap | null>(null);
  const naverMarkersRef = useRef<NaverMarker[]>([]);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const googleMarkersRef = useRef<google.maps.Marker[]>([]);

  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [geocodeError, setGeocodeError] = useState(false);

  const placeCaptures = useMemo(
    () => captures.filter((c) => c.category === 'place' && c.places.length > 0),
    [captures]
  );
  const captureIds = placeCaptures.map((c) => c.id).sort().join(',');

  useEffect(() => {
    if (contextLoading) return;
    if (placeCaptures.length === 0) { setIsLoading(false); return; }

    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setGeocodeError(false);

      type Entry = { place: typeof placeCaptures[0]['places'][0]; capture: typeof placeCaptures[0]; index: number };
      const withCoords: MapPlace[] = [];
      const toGeocode: Entry[] = [];

      for (const capture of placeCaptures) {
        for (let i = 0; i < capture.places.length; i++) {
          const place = capture.places[i];
          if (place.lat && place.lng) {
            withCoords.push({ name: place.name, address: place.address, date: place.date, lat: place.lat, lng: place.lng, captureId: capture.id, captureTitle: capture.title, captureImageUrl: capture.imageUrl, placeIndex: i });
          } else {
            toGeocode.push({ place, capture, index: i });
          }
        }
      }

      // Phase 1: Google Geocoding (server-side)
      const googleResults = await Promise.allSettled(
        toGeocode.map(({ place }) =>
          fetch('/api/geocode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: place.name, address: place.address }) }).then((r) => r.json())
        )
      );

      if (cancelled) return;

      const geocoded: MapPlace[] = [];
      const failedEntries: Entry[] = [];

      googleResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.lat && result.value.lng) {
          const { place, capture, index } = toGeocode[i];
          geocoded.push({ name: place.name, address: place.address || result.value.formattedAddress, date: place.date, lat: result.value.lat, lng: result.value.lng, captureId: capture.id, captureTitle: capture.title, captureImageUrl: capture.imageUrl, placeIndex: index });
        } else {
          failedEntries.push(toGeocode[i]);
        }
      });

      // Phase 2: Naver Geocoding fallback (client-side) for places Google couldn't resolve
      if (failedEntries.length > 0 && window.naver?.maps?.Service) {
        const naverResults = await Promise.allSettled(
          failedEntries.map(({ place }) =>
            naverGeocode(`${place.name}${place.address ? ' ' + place.address : ''}`)
          )
        );

        if (cancelled) return;

        naverResults.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value) {
            const { place, capture, index } = failedEntries[i];
            geocoded.push({ name: place.name, address: place.address || result.value.address, date: place.date, lat: result.value.lat, lng: result.value.lng, captureId: capture.id, captureTitle: capture.title, captureImageUrl: capture.imageUrl, placeIndex: index });
          }
        });
      }

      const allPlaces = [...withCoords, ...geocoded];
      if (allPlaces.length === 0 && toGeocode.length > 0) setGeocodeError(true);
      setPlaces(allPlaces);
      setIsLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [captureIds, contextLoading]);

  const filteredPlaces = captureFilter
    ? places.filter((p) => p.captureId === Number(captureFilter))
    : places;

  // --- Naver Map init ---
  useEffect(() => {
    if (provider !== 'naver' || !naverReady || !naverContainerRef.current || filteredPlaces.length === 0) return;

    const { naver } = window;
    const center = new naver.maps.LatLng(37.5665, 126.978);
    const map = new naver.maps.Map(naverContainerRef.current!, { center, zoom: 12, mapTypeControl: false, zoomControl: false, scaleControl: false, logoControl: false, mapDataControl: false });
    naverMapRef.current = map;

    const lats = filteredPlaces.map((p) => p.lat);
    const lngs = filteredPlaces.map((p) => p.lng);
    const sw = new naver.maps.LatLng(Math.min(...lats), Math.min(...lngs));
    const ne = new naver.maps.LatLng(Math.max(...lats), Math.max(...lngs));
    map.fitBounds(new naver.maps.LatLngBounds(sw, ne), { top: 60, right: 40, bottom: 180, left: 40 });

    const newMarkers: NaverMarker[] = [];
    filteredPlaces.forEach((place, idx) => {
      const content = `<div style="width:32px;height:32px;border-radius:50%;background:#34D399;color:#050508;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid #050508;cursor:pointer;">${idx + 1}</div>`;
      const marker = new naver.maps.Marker({ position: new naver.maps.LatLng(place.lat, place.lng), map, icon: { content, anchor: new (window as any).naver.maps.Point(16, 16) } });
      naver.maps.Event.addListener(marker, 'click', () => setSelectedPlace(place));
      newMarkers.push(marker);
    });
    naverMarkersRef.current = newMarkers;

    return () => { newMarkers.forEach((m) => m.setMap(null)); };
  }, [provider, naverReady, filteredPlaces]);

  // --- Google Map init ---
  useEffect(() => {
    if (provider !== 'google' || !googleReady || !googleContainerRef.current || filteredPlaces.length === 0) return;

    const map = new google.maps.Map(googleContainerRef.current, {
      center: { lat: 37.5665, lng: 126.978 }, zoom: 12,
      disableDefaultUI: true, zoomControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a95' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e1a' }] },
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });
    googleMapRef.current = map;

    const bounds = new google.maps.LatLngBounds();
    filteredPlaces.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, { top: 60, right: 40, bottom: 180, left: 40 });

    const newMarkers: google.maps.Marker[] = [];
    filteredPlaces.forEach((place, idx) => {
      const marker = new google.maps.Marker({
        map, position: { lat: place.lat, lng: place.lng },
        label: { text: String(idx + 1), color: '#050508', fontSize: '12px', fontWeight: '700' },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 16, fillColor: '#34D399', fillOpacity: 1, strokeColor: '#050508', strokeWeight: 2 },
      });
      marker.addListener('click', () => setSelectedPlace(place));
      newMarkers.push(marker);
    });
    googleMarkersRef.current = newMarkers;

    return () => { newMarkers.forEach((m) => m.setMap(null)); };
  }, [provider, googleReady, filteredPlaces]);

  const handlePlaceSelect = useCallback((place: MapPlace) => {
    setSelectedPlace(place);
    if (provider === 'naver' && naverMapRef.current && window.naver) {
      naverMapRef.current.panTo(new window.naver.maps.LatLng(place.lat, place.lng));
    }
    if (provider === 'google' && googleMapRef.current) {
      googleMapRef.current.panTo({ lat: place.lat, lng: place.lng });
    }
  }, [provider]);

  if (contextLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-label="로딩 중">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📍</div>
          <p className="text-text-secondary">장소 좌표를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Uncomment to require login for map access (anonymous auth currently handles guests)
  // if (!isAuthenticated) {
  //   return (
  //     <div className="flex items-center justify-center h-full">
  //       <div className="text-center">
  //         <div className="text-4xl mb-4">🔐</div>
  //         <p className="text-text-primary font-semibold">로그인이 필요합니다</p>
  //         <p className="text-text-tertiary text-sm mt-1 mb-4">지도 기능을 사용하려면 로그인하세요</p>
  //         <a href="/login" className="px-4 py-2 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary-light transition-colors">
  //           로그인하기
  //         </a>
  //       </div>
  //     </div>
  //   );
  // }

  if (geocodeError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-text-primary font-semibold">좌표 변환에 실패했습니다</p>
          <p className="text-text-tertiary text-sm mt-1">Google Geocoding API 또는 Naver 지도 API를 확인해주세요</p>
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
      {/* Top bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex justify-between items-center">
        <div className="px-3 py-2 bg-black/75 backdrop-blur-xl rounded-xl border border-white/10 text-xs text-place-accent font-semibold">
          📍 {filteredPlaces.length}개 장소
        </div>

        {/* Provider toggle */}
        <div className="flex gap-1 p-1 bg-black/75 backdrop-blur-xl rounded-xl border border-white/10">
          <button
            onClick={() => setProvider('naver')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${provider === 'naver' ? 'bg-place-accent text-background' : 'text-text-secondary hover:text-text-primary'}`}
          >
            🟢 네이버
          </button>
          <button
            onClick={() => setProvider('google')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${provider === 'google' ? 'bg-place-accent text-background' : 'text-text-secondary hover:text-text-primary'}`}
          >
            🔵 구글
          </button>
        </div>
      </div>

      {/* Separate containers per SDK — never share a DOM node between map SDKs */}
      <div ref={naverContainerRef} className={`h-full w-full${provider === 'naver' ? '' : ' hidden'}`} />
      <div ref={googleContainerRef} className={`h-full w-full${provider === 'google' ? '' : ' hidden'}`} />

      {selectedPlace && (
        <PlacePopup place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      )}

      <BottomSheet places={filteredPlaces} onPlaceSelect={handlePlaceSelect} selectedPlace={selectedPlace} />
    </div>
  );
}
