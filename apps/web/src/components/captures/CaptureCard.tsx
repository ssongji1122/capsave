'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CaptureItem, PlaceInfo } from '@capsave/shared';

interface CaptureCardProps {
  item: CaptureItem;
  onDelete: (id: number) => void;
}

export function CaptureCard({ item, onDelete }: CaptureCardProps) {
  const isPlace = item.category === 'place';
  const accentColor = isPlace ? 'text-place-accent' : 'text-text-accent';
  const surfaceBg = isPlace ? 'bg-place-surface' : 'bg-text-surface';
  const borderColor = isPlace ? 'border-place-border' : 'border-text-border';

  const handleDelete = () => {
    if (confirm('이 캡처를 삭제하시겠습니까?')) {
      onDelete(item.id);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`rounded-3xl overflow-hidden border ${borderColor} bg-surface transition-all duration-200 hover:scale-[1.01] hover:border-border-light`}>
      {/* Image */}
      {item.imageUrl && (
        <div className="relative w-full h-44 bg-surface-elevated">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${surfaceBg} ${accentColor} backdrop-blur-sm`}>
            {isPlace ? `📍 장소 ${item.places.length}개` : '📝 텍스트'}
          </div>
          <button
            onClick={handleDelete}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-text-tertiary hover:text-error transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-4">
        <h3 className="font-bold text-[17px] leading-6 text-text-primary">{item.title}</h3>
        {item.summary && (
          <p className="text-sm text-text-secondary mt-1.5 leading-5 line-clamp-2">{item.summary}</p>
        )}

        {/* Numbered place list */}
        {isPlace && item.places.length > 0 && (
          <div className="mt-3 flex flex-col">
            {item.places.map((place: PlaceInfo, idx: number) => (
              <div
                key={idx}
                className={`flex items-center gap-3 py-2 ${
                  idx < item.places.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-place-accent flex items-center justify-center text-[10px] font-bold text-background flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-text-primary truncate">{place.name}</p>
                  <p className="text-xs text-text-tertiary font-mono truncate">
                    {[place.address, place.date].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            ))}

            {/* Single map button */}
            <Link
              href={`/map?capture=${item.id}`}
              className="mt-3 block w-full py-2.5 rounded-xl bg-place-surface border border-place-border text-center text-sm font-semibold text-place-accent hover:bg-[rgba(52,211,153,0.15)] transition-colors"
            >
              🗺 지도에서 보기
            </Link>
          </div>
        )}

        {/* Links */}
        {item.links.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {item.links.slice(0, 3).map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-text-accent font-mono hover:underline truncate"
              >
                🔗 {link}
              </a>
            ))}
          </div>
        )}

        {/* Tags & date */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="text-xs text-text-tertiary">
                #{tag}
              </span>
            ))}
          </div>
          <span className="text-xs text-text-tertiary">{formatDate(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
