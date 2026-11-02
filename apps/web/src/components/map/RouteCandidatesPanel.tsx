'use client';

import { useState, useMemo } from 'react';
import { Compass, MapPin } from 'lucide-react';
import {
  DEFAULT_MAX_EXTRA_MINUTES,
  findRouteCandidates,
  type CaptureItem,
} from '@scrave/shared';
import type { MapPlace } from './MapView';

interface RouteCandidatesPanelProps {
  places: MapPlace[];
  captures: CaptureItem[];
  onSelectPlace: (place: MapPlace) => void;
}

function makePlaceKey(p: Pick<MapPlace, 'captureId' | 'placeIndex'>): string {
  return `${p.captureId}:${p.placeIndex}`;
}

export function RouteCandidatesPanel({
  places,
  captures,
  onSelectPlace,
}: RouteCandidatesPanelProps) {
  const [open, setOpen] = useState(false);
  const [originKey, setOriginKey] = useState<string>('');
  const [destKey, setDestKey] = useState<string>('');

  const effectiveOriginKey = originKey || (places[0] ? makePlaceKey(places[0]) : '');
  const effectiveDestKey =
    destKey || (places[places.length - 1] ? makePlaceKey(places[places.length - 1]!) : '');

  const originPlace = useMemo(
    () => places.find((p) => makePlaceKey(p) === effectiveOriginKey) ?? null,
    [places, effectiveOriginKey],
  );
  const destPlace = useMemo(
    () => places.find((p) => makePlaceKey(p) === effectiveDestKey) ?? null,
    [places, effectiveDestKey],
  );

  // Merge runtime geocoded coordinates from `places` into `captures` so findRouteCandidates works even for freshly geocoded places
  const enrichedCaptures = useMemo(() => {
    const coordMap = new Map<string, { lat: number; lng: number }>();
    for (const mp of places) {
      coordMap.set(makePlaceKey(mp), { lat: mp.lat, lng: mp.lng });
    }
    return captures.map((c) => ({
      ...c,
      places: c.places.map((p, idx) => {
        const coords = coordMap.get(`${c.id}:${idx}`);
        if (!coords) return p;
        return { ...p, lat: coords.lat, lng: coords.lng };
      }),
    }));
  }, [captures, places]);

  const candidates = useMemo(() => {
    if (!originPlace || !destPlace) return [];
    if (makePlaceKey(originPlace) === makePlaceKey(destPlace)) return [];

    const all = findRouteCandidates({
      origin: { lat: originPlace.lat, lng: originPlace.lng },
      destination: { lat: destPlace.lat, lng: destPlace.lng },
      captures: enrichedCaptures,
      maxExtraMinutes: DEFAULT_MAX_EXTRA_MINUTES,
    });

    return all.filter(
      (c) =>
        `${c.captureId}:${c.placeIndex}` !== makePlaceKey(originPlace) &&
        `${c.captureId}:${c.placeIndex}` !== makePlaceKey(destPlace),
    );
  }, [originPlace, destPlace, enrichedCaptures]);

  if (places.length < 3) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface/95 px-3 py-2 backdrop-blur-md shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-text-primary"
      >
        <span className="inline-flex items-center gap-1.5">
          <Compass size={14} className="text-primary" aria-hidden="true" />
          가는 길 경유 추천 (우회 {DEFAULT_MAX_EXTRA_MINUTES}분 이내)
        </span>
        <span className="text-[11px] font-mono text-text-tertiary">
          {open ? '접기' : '열기'}
        </span>
      </button>

      {open && (
        <div className="mt-2.5 flex flex-col gap-2 border-t border-border pt-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
              출발 장소
              <select
                aria-label="출발 장소"
                value={effectiveOriginKey}
                onChange={(e) => setOriginKey(e.target.value)}
                className="rounded-xl border border-border bg-surface-elevated px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary"
              >
                {places.map((p) => {
                  const key = makePlaceKey(p);
                  return (
                    <option key={`origin-${key}`} value={key}>
                      {p.name}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
              도착 장소
              <select
                aria-label="도착 장소"
                value={effectiveDestKey}
                onChange={(e) => setDestKey(e.target.value)}
                className="rounded-xl border border-border bg-surface-elevated px-2 py-1.5 text-xs text-text-primary outline-none focus:border-primary"
              >
                {places.map((p) => {
                  const key = makePlaceKey(p);
                  return (
                    <option key={`dest-${key}`} value={key}>
                      {p.name}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          {candidates.length === 0 ? (
            <p className="text-xs text-text-tertiary py-1">
              선택한 두 장소 사이에서 {DEFAULT_MAX_EXTRA_MINUTES}분 이내로 들를 수 있는 다른 저장 장소가 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {candidates.map((c) => {
                const key = `${c.captureId}:${c.placeIndex}`;
                const matchedPlace = places.find((p) => makePlaceKey(p) === key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (matchedPlace) onSelectPlace(matchedPlace);
                    }}
                    className="flex items-center justify-between gap-2 rounded-xl border border-place-border bg-place-surface px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary-border"
                  >
                    <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary truncate">
                      <MapPin size={12} className="text-place-accent flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="flex-shrink-0 font-mono text-[11px] font-semibold text-place-accent">
                      +{c.extraMinutes}분
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
