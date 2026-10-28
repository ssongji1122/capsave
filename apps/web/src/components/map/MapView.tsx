/// <reference types="google.maps" />
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Map, MapPin, Search, X } from 'lucide-react';
import { useCaptures } from '@/contexts/CapturesContext';
import { useGuestCaptures } from '@/contexts/GuestCapturesContext';
import { filterCapturesByArchiveQuery, mergeArchiveCaptures } from '@/lib/archive-search';
import { getVisibleArchiveCaptures } from '@/lib/sample-captures';
import { BottomSheet } from './BottomSheet';
import { PlacePopup } from './PlacePopup';
import { StaticArchiveMap } from './StaticArchiveMap';
import { pickDefaultMapProvider, resolveMapProvider, type MapProviderChoice, type WebMapProvider } from '@/lib/map-provider';
import { requestCaptureCoordinates } from '@/lib/capture-coordinates';
import { ARCHIVE_APPEARANCE, hasFreshCoordinates, needsGeocoding } from '@scrave/shared';

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

type MapProvider = MapProviderChoice;
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 } as const;
const NAVER_MAP_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const PIN_FILL = ARCHIVE_APPEARANCE.places.color;
const PIN_STROKE = '#F3EFE6';
const PIN_LABEL = '#FFFFFF';

// --- SDK loaders ---

declare global {
  interface Window {
    navermap_authFailure?: () => void;
    gm_authFailure?: () => void;
    google: typeof google;
    naver: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => NaverMap;
        Marker: new (opts: object) => NaverMarker;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        LatLngBounds: new (sw: NaverLatLng, ne: NaverLatLng) => NaverBounds;
        Point: new (x: number, y: number) => object;
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

function useNaverMaps(enabled: boolean) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (!NAVER_MAP_CLIENT_ID) return;
    if (window.naver?.maps) { setLoaded(true); return; }
    const existing = document.querySelector('script[src*="openapi.map.naver.com"]');
    if (existing) { existing.addEventListener('load', () => setLoaded(true)); return; }
    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_MAP_CLIENT_ID}&submodules=geocoder`;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [enabled]);
  return loaded;
}

function useGoogleMaps(enabled: boolean) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (!GOOGLE_MAPS_API_KEY) return;
    if (window.google?.maps) { setLoaded(true); return; }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { existing.addEventListener('load', () => setLoaded(true)); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [enabled]);
  return loaded;
}

// Both SDKs report a rejected key through these fixed global callbacks.
function useMapAuthFailures(): readonly [ReadonlySet<WebMapProvider>, (provider: WebMapProvider) => void] {
  const [failed, setFailed] = useState<ReadonlySet<WebMapProvider>>(() => new Set());
  const markFailed = useCallback((provider: WebMapProvider) => {
    setFailed((prev) => (prev.has(provider) ? prev : new Set([...prev, provider])));
  }, []);
  useEffect(() => {
    window.navermap_authFailure = () => markFailed('naver');
    window.gm_authFailure = () => markFailed('google');
    return () => {
      delete window.navermap_authFailure;
      delete window.gm_authFailure;
    };
  }, [markFailed]);
  return [failed, markFailed] as const;
}

// Once an SDK has rejected its key its map and marker methods throw; an exception inside an effect would take down the page.
function callMapSdk(action: () => void): boolean {
  try {
    action();
    return true;
  } catch {
    return false;
  }
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
  const { guestCaptures } = useGuestCaptures();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const captureFilter = searchParams.get('capture');
  const queryFilter = searchParams.get('q') ?? '';

  const [provider, setProvider] = useState<MapProvider>('archive');
  const [searchValue, setSearchValue] = useState(queryFilter);
  const providerPickedRef = useRef(false);

  const [failedProviders, markProviderFailed] = useMapAuthFailures();
  const naverLoaded = useNaverMaps(provider === 'naver');
  const googleLoaded = useGoogleMaps(provider === 'google');
  const naverReady = naverLoaded && !failedProviders.has('naver');
  const googleReady = googleLoaded && !failedProviders.has('google');

  useEffect(() => {
    setProvider((current) => resolveMapProvider(current, failedProviders));
  }, [failedProviders]);

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

  const archiveCaptures = useMemo(
    () => mergeArchiveCaptures(captures, guestCaptures),
    [captures, guestCaptures]
  );
  const visibleArchiveCaptures = useMemo(
    () => getVisibleArchiveCaptures(archiveCaptures),
    [archiveCaptures]
  );
  const searchedCaptures = useMemo(
    () => filterCapturesByArchiveQuery(visibleArchiveCaptures, queryFilter),
    [queryFilter, visibleArchiveCaptures]
  );
  const placeCaptures = useMemo(
    () => searchedCaptures.filter((c) => c.category === 'place' && c.places.length > 0),
    [searchedCaptures]
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
      const now = new Date();

      // Phase 1: ask the server to geocode (Google) and store coordinates for captures
      // that have places without fresh coordinates. Stored results are reused for 30 days.
      const capturesToRefresh = placeCaptures.filter((capture) =>
        isAuthenticated &&
        capture.places.some((place) => needsGeocoding(place, now))
      );
      const refreshed: Array<readonly [number, Awaited<ReturnType<typeof requestCaptureCoordinates>>]> = [];
      for (const capture of capturesToRefresh) {
        if (cancelled) return;
        refreshed.push([capture.id, await requestCaptureCoordinates(capture.id)]);
      }

      if (cancelled) return;

      // globalThis.Map: the lucide `Map` icon import shadows the built-in here.
      const refreshedPlaces = new globalThis.Map(refreshed);
      const geocoded: MapPlace[] = [];
      const failedEntries: Entry[] = [];

      for (const capture of placeCaptures) {
        const capturePlaces = refreshedPlaces.get(capture.id) ?? capture.places;
        capturePlaces.forEach((place, index) => {
          if (hasFreshCoordinates(place, now)) {
            geocoded.push({ name: place.name, address: place.address, date: place.date, lat: place.lat!, lng: place.lng!, captureId: capture.id, captureTitle: capture.title, captureImageUrl: capture.imageUrl, placeIndex: index });
          } else {
            failedEntries.push({ place, capture, index });
          }
        });
      }

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
            const entry = failedEntries[i];
            if (!entry) return;
            const { place, capture, index } = entry;
            geocoded.push({ name: place.name, address: place.address || result.value.address, date: place.date, lat: result.value.lat, lng: result.value.lng, captureId: capture.id, captureTitle: capture.title, captureImageUrl: capture.imageUrl, placeIndex: index });
          }
        });
      }

      const allPlaces = geocoded;
      if (allPlaces.length === 0 && failedEntries.length > 0) setGeocodeError(true);
      setPlaces(allPlaces);
      setIsLoading(false);

    };
    run();
    return () => { cancelled = true; };
  }, [captureIds, contextLoading, isAuthenticated]);

  const filteredPlaces = captureFilter
    ? places.filter((p) => p.captureId === Number(captureFilter))
    : places;
  const hasActiveFilter = Boolean(captureFilter || queryFilter.trim());

  useEffect(() => {
    setSearchValue(queryFilter);
  }, [queryFilter]);

  const selectedPlaceKey = selectedPlace
    ? `${selectedPlace.captureId}:${selectedPlace.placeIndex}`
    : '';
  const filteredPlaceKey = filteredPlaces
    .map((place) => `${place.captureId}:${place.placeIndex}`)
    .join(',');

  useEffect(() => {
    if (filteredPlaces.length === 0) {
      if (selectedPlace) setSelectedPlace(null);
      return;
    }

    const selectedIsVisible = filteredPlaces.some(
      (place) =>
        selectedPlace?.captureId === place.captureId &&
        selectedPlace.placeIndex === place.placeIndex,
    );
    if (selectedIsVisible) return;
    if (hasActiveFilter) setSelectedPlace(filteredPlaces[0] ?? null);
  }, [filteredPlaceKey, hasActiveFilter, selectedPlaceKey]);

  const updateMapQuery = useCallback((nextQuery: string) => {
    const trimmed = nextQuery.trim();
    const params = new URLSearchParams(searchParams.toString());
    params.delete('capture');
    if (trimmed) {
      params.set('q', trimmed);
    } else {
      params.delete('q');
    }
    const nextSearch = params.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateMapQuery(searchValue);
  }, [searchValue, updateMapQuery]);

  const clearMapFilters = useCallback(() => {
    setSearchValue('');
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    if (providerPickedRef.current) return;
    setProvider(resolveMapProvider(pickDefaultMapProvider(filteredPlaces), failedProviders));
  }, [filteredPlaces, failedProviders]);

  const chooseProvider = (next: MapProvider) => {
    providerPickedRef.current = true;
    setProvider(resolveMapProvider(next, failedProviders));
  };

  // --- Naver Map init ---
  useEffect(() => {
    if (provider !== 'naver' || !naverReady || !naverContainerRef.current || filteredPlaces.length === 0) return;

    const { naver } = window;
    const container = naverContainerRef.current;
    if (!container) return;
    const newMarkers: NaverMarker[] = [];
    const initialized = callMapSdk(() => {
      const center = new naver.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng);
      const map = new naver.maps.Map(container, { center, zoom: 12, mapTypeControl: false, zoomControl: false, scaleControl: false, logoControl: false, mapDataControl: false });
      naverMapRef.current = map;

      const lats = filteredPlaces.map((p) => p.lat);
      const lngs = filteredPlaces.map((p) => p.lng);
      const sw = new naver.maps.LatLng(Math.min(...lats), Math.min(...lngs));
      const ne = new naver.maps.LatLng(Math.max(...lats), Math.max(...lngs));
      map.fitBounds(new naver.maps.LatLngBounds(sw, ne), { top: 60, right: 40, bottom: 180, left: 40 });

      filteredPlaces.forEach((place, idx) => {
        const content = `<div style="width:32px;height:32px;border-radius:50%;background:${PIN_FILL};color:${PIN_LABEL};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 1px 4px rgba(22,21,19,0.25);border:2px solid ${PIN_STROKE};cursor:pointer;">${idx + 1}</div>`;
        const marker = new naver.maps.Marker({ position: new naver.maps.LatLng(place.lat, place.lng), map, icon: { content, anchor: new window.naver.maps.Point(16, 16) } });
        naver.maps.Event.addListener(marker, 'click', () => setSelectedPlace(place));
        newMarkers.push(marker);
      });
      naverMarkersRef.current = newMarkers;
    });
    if (!initialized) markProviderFailed('naver');

    return () => { newMarkers.forEach((m) => callMapSdk(() => m.setMap(null))); };
  }, [provider, naverReady, filteredPlaces, markProviderFailed]);

  // --- Google Map init ---
  useEffect(() => {
    if (provider !== 'google' || !googleReady || !googleContainerRef.current || filteredPlaces.length === 0) return;

    const googleContainer = googleContainerRef.current;
    const newMarkers: google.maps.Marker[] = [];
    const initialized = callMapSdk(() => {
      const map = new google.maps.Map(googleContainer, {
        center: SEOUL_CENTER, zoom: 12,
        disableDefaultUI: true, zoomControl: true,
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
      });
      googleMapRef.current = map;

      const bounds = new google.maps.LatLngBounds();
      filteredPlaces.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 180, left: 40 });

      filteredPlaces.forEach((place, idx) => {
        const marker = new google.maps.Marker({
          map, position: { lat: place.lat, lng: place.lng },
          label: { text: String(idx + 1), color: PIN_LABEL, fontSize: '12px', fontWeight: '700' },
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 16, fillColor: PIN_FILL, fillOpacity: 1, strokeColor: PIN_STROKE, strokeWeight: 2 },
        });
        marker.addListener('click', () => setSelectedPlace(place));
        newMarkers.push(marker);
      });
      googleMarkersRef.current = newMarkers;
    });
    if (!initialized) markProviderFailed('google');

    return () => { newMarkers.forEach((m) => callMapSdk(() => m.setMap(null))); };
  }, [provider, googleReady, filteredPlaces, markProviderFailed]);

  const handlePlaceSelect = useCallback((place: MapPlace) => {
    setSelectedPlace(place);
    const naverMap = naverMapRef.current;
    const googleMap = googleMapRef.current;
    if (provider === 'naver' && naverReady && naverMap && window.naver) {
      callMapSdk(() => naverMap.panTo(new window.naver.maps.LatLng(place.lat, place.lng)));
    }
    if (provider === 'google' && googleReady && googleMap) {
      callMapSdk(() => googleMap.panTo({ lat: place.lat, lng: place.lng }));
    }
  }, [provider, naverReady, googleReady]);

  if (contextLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-label="로딩 중">
        <div className="text-center">
          <MapPin size={40} className="text-place-accent mx-auto mb-4 animate-bounce" aria-hidden="true" />
          <p className="text-text-secondary">장소 좌표를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (geocodeError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle size={40} className="text-warning mx-auto mb-4" aria-hidden="true" />
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
          <Map size={40} className="text-place-accent mx-auto mb-4" aria-hidden="true" />
          <p className="text-text-primary font-semibold">저장된 장소가 없습니다</p>
          <p className="text-text-tertiary text-sm mt-1">장소 캡처를 추가하면 지도에 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Top bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex w-full flex-col gap-2 md:max-w-sm">
          <div className="flex w-fit items-center gap-1.5 px-3 py-2 bg-surface/95 backdrop-blur-xl rounded-xl border border-border text-xs text-text-primary font-semibold">
            <MapPin size={13} style={{ color: PIN_FILL }} aria-hidden="true" />
            {filteredPlaces.length}개 장소
          </div>

          {failedProviders.size > 0 && (
            <p role="status" className="w-fit rounded-xl border border-border bg-surface/95 px-3 py-2 text-xs text-text-secondary backdrop-blur-xl">
              {failedProviders.has('naver') ? '네이버' : '구글'} 지도를 불러오지 못해 기본 지도로 보여 드립니다.
            </p>
          )}

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 rounded-2xl border border-border bg-surface/95 px-3 py-2 backdrop-blur-xl"
          >
            <Search size={14} className="flex-shrink-0 text-text-tertiary" aria-hidden="true" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="지도에서 검색"
              aria-label="지도 장소 검색"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearMapFilters}
                aria-label="지도 필터 지우기"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface hover:text-text-primary"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="min-h-8 rounded-full bg-text-primary px-3 text-xs font-semibold text-background transition-opacity hover:opacity-85"
            >
              검색
            </button>
          </form>

          {hasActiveFilter && filteredPlaces.length > 0 && selectedPlace && (
            <div className="rounded-xl border border-place-border bg-place-surface px-3 py-2 text-xs text-text-secondary backdrop-blur-xl">
              <span className="font-semibold text-place-accent">{selectedPlace.name}</span>
              <span> 핀이 선택되었습니다</span>
            </div>
          )}
        </div>

        {/* Provider toggle */}
        <div className="flex gap-1 self-end p-1 bg-surface/95 backdrop-blur-xl rounded-xl border border-border md:self-start">
          <button
            onClick={() => chooseProvider('archive')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${provider === 'archive' ? 'bg-text-primary text-background' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1" aria-hidden="true" />
            아카이브
          </button>
          <button
            onClick={() => chooseProvider('naver')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${provider === 'naver' ? 'bg-text-primary text-background' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-place-accent mr-1" aria-hidden="true" />
            네이버
          </button>
          <button
            onClick={() => chooseProvider('google')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${provider === 'google' ? 'bg-text-primary text-background' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-accent mr-1" aria-hidden="true" />
            구글
          </button>
        </div>
      </div>

      {/* Separate containers per SDK — never share a DOM node between map SDKs.
          After an auth failure the SDK keeps drawing into its container, so it stays mounted and laid out under the static map. */}
      {(provider === 'naver' && naverReady) || (naverLoaded && failedProviders.has('naver')) ? (
        <div ref={naverContainerRef} className="h-full w-full" />
      ) : null}
      {(provider === 'google' && googleReady) || (googleLoaded && failedProviders.has('google')) ? (
        <div ref={googleContainerRef} className="h-full w-full" />
      ) : null}
      {(provider === 'archive' || (provider === 'naver' && !naverReady) || (provider === 'google' && !googleReady)) && (
        <div className="absolute inset-0">
          <StaticArchiveMap
            places={filteredPlaces}
            selectedPlace={selectedPlace}
            onPlaceSelect={handlePlaceSelect}
          />
        </div>
      )}

      {selectedPlace && (
        <PlacePopup place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      )}

      <BottomSheet places={filteredPlaces} onPlaceSelect={handlePlaceSelect} selectedPlace={selectedPlace} />
    </div>
  );
}
