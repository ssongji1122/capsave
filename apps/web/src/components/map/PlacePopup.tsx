'use client';

import Link from 'next/link';
import { MapPlace } from './MapView';

interface PlacePopupProps {
  place: MapPlace;
  onClose: () => void;
}

export function PlacePopup({ place, onClose }: PlacePopupProps) {
  const naverSearchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`;
  const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    place.name + (place.address ? ` ${place.address}` : '')
  )}`;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-64 bg-surface-elevated border border-border rounded-2xl p-4 shadow-2xl shadow-black/50">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-text-tertiary hover:text-text-primary text-sm"
      >
        ✕
      </button>

      {/* Place info */}
      <p className="font-bold text-sm text-place-accent">{place.name}</p>
      {place.address && (
        <p className="text-xs text-text-tertiary font-mono mt-1">{place.address}</p>
      )}
      {place.date && (
        <p className="text-xs text-text-tertiary mt-0.5">{place.date}</p>
      )}
      <p className="text-[10px] text-text-tertiary mt-2 pt-2 border-t border-border">
        📸 {place.captureTitle}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <a
          href={naverSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 rounded-lg bg-place-surface text-center text-xs font-semibold text-place-accent hover:bg-[rgba(52,211,153,0.15)] transition-colors"
        >
          길찾기
        </a>
        <Link
          href={`/?highlight=${place.captureId}`}
          className="flex-1 py-2 rounded-lg bg-surface text-center text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          캡처 보기
        </Link>
      </div>
    </div>
  );
}
