'use client';

import Link from 'next/link';
import { getMapLinks, getReviewLinks } from '@scrave/shared';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { MapPlace } from './MapView';

interface PlacePopupProps {
  place: MapPlace;
  onClose: () => void;
}

export function PlacePopup({ place, onClose }: PlacePopupProps) {
  const { preferences } = useUserPreferences();
  const links = getMapLinks(place.name, place.address);
  const reviewLinks = getReviewLinks(place.name, place.address);
  const preferred = links.find((l) => l.provider === preferences.preferredNavApp);
  const others = links.filter((l) => l.provider !== preferences.preferredNavApp);

  return (
    <div
      role="dialog"
      aria-label={`${place.name} 장소 정보`}
      className="absolute top-16 left-1/2 -translate-x-1/2 z-20 w-64 bg-surface-elevated border border-border rounded-2xl p-4 shadow-2xl shadow-black/50"
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="팝업 닫기"
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

      {/* Preferred nav app — full width primary button */}
      {preferred && (
        <a
          href={preferred.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-place-surface text-xs font-semibold text-place-accent hover:bg-[rgba(52,211,153,0.15)] transition-colors"
        >
          <span>{preferred.emoji}</span>
          <span>{preferred.label}로 길찾기</span>
        </a>
      )}

      {/* Other nav apps — compact row */}
      <div className="flex gap-1.5 mt-2">
        {others.map((link) => (
          <a
            key={link.provider}
            href={link.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 rounded-lg border border-border text-center text-[11px] font-medium text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
            title={link.label}
          >
            {link.emoji}
          </a>
        ))}
      </div>

      {/* Review links */}
      <div className="flex gap-1.5 mt-2 pt-2 border-t border-border">
        {reviewLinks.map((link) => (
          <a
            key={link.provider}
            href={link.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 rounded-lg bg-surface text-center text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
            title={link.label}
          >
            {link.emoji} 리뷰
          </a>
        ))}
      </div>

      {/* View capture */}
      <Link
        href={`/dashboard?highlight=${place.captureId}`}
        className="mt-2 block w-full py-2 rounded-lg bg-surface text-center text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        캡처 보기
      </Link>
    </div>
  );
}
