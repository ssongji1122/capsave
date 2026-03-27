'use client';

import Image from 'next/image';
import { CaptureItem, PlaceInfo, getMapLinks, MapLink } from '@capsave/shared';

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
    <div className={`rounded-3xl overflow-hidden border ${borderColor} bg-surface transition-transform hover:scale-[1.01]`}>
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
            {isPlace ? '📍 장소' : '📝 텍스트'}
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

        {/* Places list */}
        {isPlace && item.places.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {item.places.map((place: PlaceInfo, idx: number) => {
              const mapLinks = getMapLinks(place.name, place.address);
              return (
                <div key={idx} className={`p-3 rounded-xl ${surfaceBg}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${accentColor}`}>{place.name}</p>
                      {place.date && (
                        <p className="text-xs text-text-tertiary mt-0.5">{place.date}</p>
                      )}
                      {place.address && (
                        <p className="text-xs text-text-tertiary mt-0.5">{place.address}</p>
                      )}
                    </div>
                  </div>
                  {/* Place-specific links */}
                  {place.links && place.links.length > 0 && (
                    <div className="mt-1.5">
                      {place.links.map((link, li) => (
                        <a key={li} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-text-accent hover:underline truncate block">
                          🔗 {link}
                        </a>
                      ))}
                    </div>
                  )}
                  {/* Map buttons per place */}
                  <div className="flex gap-1.5 mt-2">
                    {mapLinks.map((link: MapLink) => (
                      <button
                        key={link.provider}
                        onClick={() => window.open(link.webUrl, '_blank')}
                        className="flex-1 py-1.5 rounded-lg bg-surface text-xs font-medium text-text-secondary hover:text-text-primary transition-colors text-center"
                      >
                        {link.emoji} {link.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
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
                className="text-xs text-text-accent hover:underline truncate"
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
