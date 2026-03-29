'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CaptureItem, PlaceInfo, getReviewLinks } from '@scrave/shared';
import { isDataUri } from '@/lib/image-utils';

interface CaptureCardProps {
  item: CaptureItem;
  onDelete: (id: number) => void;
}

export function CaptureCard({ item, onDelete }: CaptureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyText = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(item.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines: string[] = [`[${item.title}]`];
    if (item.summary) lines.push(item.summary);
    if (item.keyInsights?.length) {
      lines.push('', ...item.keyInsights.map(i => `• ${i}`));
    }
    if (item.places.length > 0) {
      lines.push('', ...item.places.map((p, i) => `${i + 1}. ${p.name}${p.address ? ` (${p.address})` : ''}`));
    }
    if (item.tags.length > 0) {
      lines.push('', item.tags.map(t => `#${t}`).join(' '));
    }
    const text = lines.join('\n');

    if (navigator.share) {
      await navigator.share({ title: item.title, text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
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

  const altText = isPlace
    ? `${item.title} - ${item.places.map(p => p.name).join(', ')}`
    : `${item.title}`;

  return (
    <article className={`rounded-3xl overflow-hidden border ${borderColor} bg-surface transition-all duration-200 hover:scale-[1.01] hover:border-border-light`}>
      {/* Image */}
      {item.imageUrl && (
        <div className="relative w-full h-44 bg-surface-elevated">
          {isDataUri(item.imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={altText}
              className="object-cover w-full h-full"
            />
          ) : (
            <Image
              src={item.imageUrl}
              alt={altText}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="eager"
            />
          )}
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${surfaceBg} ${accentColor} backdrop-blur-sm`}>
            <span style={{ fontFamily: 'var(--font-label)' }}>{isPlace ? `장소 ${item.places.length}개` : '텍스트'}</span>
          </div>

          {/* Confidence badge */}
          {item.confidence != null && (
            <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-mono text-ai-accent">
              AI {Math.round(item.confidence * 100)}%
            </div>
          )}

          <button
            onClick={handleDelete}
            aria-label={`${item.title} 삭제`}
            className="absolute top-2 right-2 w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-text-tertiary hover:text-error transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Clickable body */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[17px] leading-6 text-text-primary">{item.title}</h3>
          <span className={`text-text-tertiary text-xs transition-transform ml-2 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>

        {/* Collapsed: summary preview */}
        {!expanded && item.summary && (
          <p className="text-sm text-text-secondary mt-1.5 leading-5 line-clamp-2">{item.summary}</p>
        )}

        {/* Collapsed: compact place count / tag preview */}
        {!expanded && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-wrap gap-1.5" style={{ fontFamily: 'var(--font-label)' }}>
              {isPlace && <span className="text-xs text-place-accent">장소 {item.places.length}개</span>}
              {item.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-xs text-text-tertiary">#{tag}</span>
              ))}
            </div>
            <span className="text-xs text-text-tertiary" style={{ fontFamily: 'var(--font-label)' }}>{formatDate(item.createdAt)}</span>
          </div>
        )}

        {/* Expanded: full details */}
        {expanded && (
          <>
            {item.summary && (
              <p className="text-sm text-text-secondary mt-1.5 leading-5">{item.summary}</p>
            )}

            {/* Key insights — text captures */}
            {!isPlace && item.keyInsights && item.keyInsights.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1">
                {item.keyInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary leading-5">
                    <span className="mt-0.5 text-ai-accent flex-shrink-0">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Numbered place list with per-place review links */}
            {isPlace && item.places.length > 0 && (
              <div className="mt-3 flex flex-col">
                {item.places.map((place: PlaceInfo, idx: number) => {
                  const reviewLinks = getReviewLinks(place.name, place.address);
                  return (
                    <div
                      key={idx}
                      className={`py-2.5 ${idx < item.places.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <div className="flex items-center gap-3">
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
                      <div className="flex gap-1.5 mt-1.5 ml-8">
                        {reviewLinks.map((rl) => (
                          <a
                            key={rl.provider}
                            href={rl.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 rounded-lg bg-surface border border-border text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            {rl.emoji} {rl.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full text toggle — text captures */}
            {!isPlace && item.extractedText && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowFullText(!showFullText); }}
                  className="w-full py-2 rounded-xl bg-ai-surface border border-[rgba(167,139,250,0.20)] text-xs font-semibold text-ai-accent hover:bg-[rgba(167,139,250,0.15)] transition-colors"
                >
                  {showFullText ? '전문 접기' : '전문보기'}
                </button>
                {showFullText && (
                  <div className="mt-2 relative">
                    <div className="p-3 rounded-xl bg-surface-elevated border border-border max-h-64 overflow-y-auto">
                      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-mono">{item.extractedText}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-surface border border-border text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {copied ? '복사됨!' : '복사'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Related search links — text captures */}
            {!isPlace && (item.relatedSearchTerms?.length || item.title) && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold text-text-tertiary mb-1.5" style={{ fontFamily: 'var(--font-label)' }}>관련 내용보기</p>
                {item.relatedSearchTerms && item.relatedSearchTerms.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {item.relatedSearchTerms.map((term, i) => {
                      const colors = ['🟢', '🔵', '🔴'];
                      const color = colors[i % colors.length];
                      return (
                        <a
                          key={i}
                          href={`https://search.naver.com/search.naver?query=${encodeURIComponent(term)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                        >
                          {color} {term}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <a
                      href={`https://search.naver.com/search.naver?query=${encodeURIComponent(item.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1.5 rounded-lg bg-surface border border-border text-center text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      🟢 네이버
                    </a>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(item.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1.5 rounded-lg bg-surface border border-border text-center text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      🔵 Google
                    </a>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1.5 rounded-lg bg-surface border border-border text-center text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      🔴 YouTube
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Links */}
            {item.links.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {item.links.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-text-accent font-mono hover:underline truncate py-2 min-h-[44px] flex items-center"
                  >
                    {link}
                  </a>
                ))}
              </div>
            )}

            {/* Tags, date & share */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex flex-wrap gap-1.5" style={{ fontFamily: 'var(--font-label)' }}>
                {item.tags.map((tag, i) => (
                  <span key={i} className="text-xs text-text-tertiary">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  {copied ? '복사됨!' : '공유'}
                </button>
                <span className="text-xs text-text-tertiary" style={{ fontFamily: 'var(--font-label)' }}>{formatDate(item.createdAt)}</span>
              </div>
            </div>

            {/* Map button for places */}
            {isPlace && (
              <Link
                href={`/map?capture=${item.id}`}
                onClick={(e) => e.stopPropagation()}
                className="mt-3 block w-full py-2.5 rounded-xl bg-place-surface border border-place-border text-center text-sm font-semibold text-place-accent hover:bg-[rgba(52,211,153,0.15)] transition-colors"
              >
                지도에서 보기
              </Link>
            )}
          </>
        )}
      </div>
    </article>
  );
}
