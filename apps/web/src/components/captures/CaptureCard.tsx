'use client';

import { useState, useEffect } from 'react';
import { CategoryShape } from './CategoryShape';
import Link from 'next/link';
import {
  Bookmark,
  CalendarPlus,
  Check,
  ChevronDown,
  Compass,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Maximize2,
  NotebookText,
  Phone,
  Play,
  Search as SearchIcon,
  X,
  Zap,
} from 'lucide-react';
import { CaptureItem, PlaceInfo, buildCaptureReviewTopic, getReviewLinks, extractStoragePath } from '@scrave/shared';
import { isDataUri } from '@/lib/image-utils';
import { isSampleCapture } from '@/lib/sample-captures';
import { extractCaptureActions, isTravelPackCandidate } from '@/lib/capture-actions';
import {
  CAPTURE_REASONS,
  CAPTURE_REVISIT_OPTIONS,
  EMPTY_CAPTURE_META,
  buildCaptureReferenceNote,
  getCaptureMeta,
  getRevisitDate,
  saveCaptureMeta,
  toggleCompletedAction,
  type CaptureReasonId,
  type CaptureRevisitContext,
  type CaptureUserMeta,
} from '@/lib/capture-intent';
import { ArchiveSources } from './ArchiveSources';
import { classifyArchiveCapture, ARCHIVE_SECTIONS } from '@scrave/shared';
import { PlaceReviews } from './PlaceReviews';

interface CaptureCardProps {
  item: CaptureItem;
  onDelete: (id: number) => void;
  onMetaChange?: (captureId: number, meta: CaptureUserMeta) => void;
}

const PROVIDER_DOT_CLASS: Record<string, string> = {
  naver: 'bg-place-accent',
  google: 'bg-text-accent',
  kakao: 'bg-warning',
};
const COLLAPSED_TEXT_PREVIEW_LENGTH = 96;

export function CaptureCard({ item, onDelete, onMetaChange }: CaptureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [showOriginalModal, setShowOriginalModal] = useState(false);
  const [meta, setMeta] = useState<CaptureUserMeta>(EMPTY_CAPTURE_META);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMeta(getCaptureMeta(window.localStorage, item.id));
  }, [item.id]);

  const updateMeta = (next: CaptureUserMeta) => {
    setMeta(next);
    if (typeof window !== 'undefined') {
      saveCaptureMeta(window.localStorage, item.id, next);
    }
    onMetaChange?.(item.id, next);
  };

  const handleToggleReason = (reasonId: CaptureReasonId, e: React.MouseEvent) => {
    e.stopPropagation();
    const exists = meta.reasons.includes(reasonId);
    const nextReasons = exists
      ? meta.reasons.filter((r) => r !== reasonId)
      : [...meta.reasons, reasonId];
    updateMeta({
      ...meta,
      reasons: nextReasons,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleChangeRevisit = (revisit: CaptureRevisitContext, e: React.MouseEvent) => {
    e.stopPropagation();
    updateMeta({
      ...meta,
      revisit,
      revisitOn: getRevisitDate(revisit, new Date()),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleToggleTravelPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateMeta({
      ...meta,
      pinnedToTravelPack: !meta.pinnedToTravelPack,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleToggleActionComplete = (actionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateMeta(toggleCompletedAction(meta, actionId));
  };

  const handleCopyActionValue = async (actionId: string, value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedActionId(actionId);
    setTimeout(() => setCopiedActionId(null), 1800);
  };

  const handleDownloadReferenceNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    const md = buildCaptureReferenceNote(item, meta);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scrave-note-${item.id}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

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
  const isSample = isSampleCapture(item);
  const accentColor = isPlace ? 'text-place-accent' : 'text-text-accent';
  const surfaceBg = isPlace ? 'bg-place-surface' : 'bg-text-surface';
  const borderColor = isPlace ? 'border-place-border' : 'border-text-border';
  const primaryPlace = item.places[0];
  const textPreview = !isPlace && item.extractedText
    ? item.extractedText.slice(0, COLLAPSED_TEXT_PREVIEW_LENGTH)
    : '';
  const actions = extractCaptureActions(item);
  const pendingActionCount = actions.filter((a) => !meta.completedActions.includes(a.id)).length;
  const isTravelPack = meta.pinnedToTravelPack || isTravelPackCandidate(item);
  const resolvedImageSrc = item.imageUrl
    ? isDataUri(item.imageUrl)
      ? item.imageUrl
      : `/api/image?path=${encodeURIComponent(extractStoragePath(item.imageUrl))}`
    : '';

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
    <article data-expanded={expanded} className={`rounded-3xl overflow-hidden border ${borderColor} bg-surface transition-all duration-200 hover:scale-[1.01] hover:border-border-light`}>
      {/* Image */}
      {item.imageUrl && (
        <div className="relative w-full h-64 bg-surface-elevated">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedImageSrc}
            alt={altText}
            className="w-full h-full object-contain cursor-pointer"
            onClick={() => setExpanded(!expanded)}
            loading={isDataUri(item.imageUrl) ? undefined : 'lazy'}
          />
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${surfaceBg} ${accentColor} backdrop-blur-sm`}>
              <span style={{ fontFamily: 'var(--font-label)' }}>{isPlace ? `장소 ${item.places.length}개` : '텍스트'}</span>
            </div>
            {isTravelPack && (
              <div className="px-2 py-0.5 rounded-full bg-primary-surface border border-primary-border text-[10px] font-semibold text-primary backdrop-blur-sm">
                여행·예약
              </div>
            )}
          </div>

          {/* Confidence badge */}
          {item.confidence != null && (
            <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded-full bg-surface/95 backdrop-blur-sm text-[10px] font-mono text-ai-accent">
              AI {Math.round(item.confidence * 100)}%
            </div>
          )}

          {/* Original image uncropped zoom trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowOriginalModal(true);
            }}
            aria-label={`${item.title} 원본 확대`}
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2.5 py-1 text-[10px] font-semibold text-text-primary backdrop-blur-sm hover:bg-surface-elevated transition-colors"
          >
            <Maximize2 size={12} aria-hidden="true" />
            원본
          </button>

          {isSample ? (
            <div className="absolute top-3 right-3 rounded-full bg-surface/95 px-2.5 py-1 text-[10px] font-semibold text-primary backdrop-blur-sm">
              샘플
            </div>
          ) : (
            <button
              onClick={handleDelete}
              aria-label={`${item.title} 삭제`}
              className="absolute top-2 right-2 w-11 h-11 rounded-full bg-surface/95 backdrop-blur-sm flex items-center justify-center text-text-tertiary hover:text-error transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="w-full min-h-11 text-left text-sm text-primary border-b border-border-light py-3"><CategoryShape section={classifyArchiveCapture(item)} /> {ARCHIVE_SECTIONS.find(section => section.id === classifyArchiveCapture(item))?.label} · {expanded ? '정리한 내용 접기' : '정리한 내용·출처 보기'}</button>
      {/* Clickable body */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[17px] leading-6 text-text-primary">{item.title}</h3>
          <ChevronDown
            size={14}
            className={`text-text-tertiary transition-transform ml-2 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </div>

        {/* Collapsed: summary preview */}
        {!expanded && item.summary && (
          <p className="text-sm text-text-secondary mt-1.5 leading-5 line-clamp-2">{item.summary}</p>
        )}

        {!expanded && primaryPlace && (
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-place-border bg-place-surface px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary truncate">{primaryPlace.name}</p>
              {primaryPlace.address && (
                <p className="mt-0.5 text-xs text-text-tertiary font-mono truncate">{primaryPlace.address}</p>
              )}
            </div>
            <Link
              href={`/map?capture=${item.id}`}
              onClick={(e) => e.stopPropagation()}
              aria-label={`${item.title} 지도에서 보기`}
              className="inline-flex min-h-9 flex-shrink-0 items-center gap-1.5 rounded-xl border border-place-border bg-background/50 px-2.5 text-xs font-semibold text-place-accent transition-colors hover:bg-place-surface"
            >
              <MapPin size={13} aria-hidden="true" />
              지도
            </Link>
          </div>
        )}

        {!expanded && textPreview && (
          <p className="mt-2 rounded-2xl border border-[rgba(125,211,252,0.20)] bg-text-surface px-3 py-2 text-xs leading-5 text-text-secondary line-clamp-2">
            {textPreview}
          </p>
        )}

        {/* Collapsed: compact place count / tag / action badge preview */}
        {!expanded && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-wrap items-center gap-1.5" style={{ fontFamily: 'var(--font-label)' }}>
              {isPlace && <span className="text-xs text-place-accent">장소 {item.places.length}개</span>}
              {pendingActionCount > 0 && (
                <span className="rounded-full bg-primary-surface border border-primary-border px-2 py-0.5 text-[10px] font-semibold text-primary">
                  행동 {pendingActionCount}건
                </span>
              )}
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

            {/* Post-capture extracted actions bar (reservation code, phone, date, address) */}
            {actions.length > 0 && (
              <div
                className="mt-3 rounded-2xl border border-primary-border bg-primary-surface p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-primary" style={{ fontFamily: 'var(--font-label)' }}>
                    발견한 행동 · 원본 대조
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    앱 열기와 실제 완료를 구분해 기록합니다
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {actions.map((action) => {
                    const isCompleted = meta.completedActions.includes(action.id);
                    return (
                      <div
                        key={action.id}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-xs transition-colors ${
                          isCompleted
                            ? 'border-border bg-background/40 text-text-tertiary'
                            : 'border-border-light bg-surface-elevated text-text-primary'
                        }`}
                      >
                        <span className={`font-mono truncate flex-1 min-w-0 ${isCompleted ? 'line-through' : ''}`}>
                          {action.label}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleCopyActionValue(action.id, action.value, e)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                          >
                            <Copy size={11} aria-hidden="true" />
                            {copiedActionId === action.id ? '복사됨' : '복사'}
                          </button>
                          {action.href && (
                            <a
                              href={action.href}
                              target={action.kind === 'phone' ? undefined : '_blank'}
                              rel={action.kind === 'phone' ? undefined : 'noopener noreferrer'}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-lg border border-primary-border bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/25 transition-colors"
                            >
                              {action.kind === 'phone' ? (
                                <Phone size={11} aria-hidden="true" />
                              ) : action.kind === 'date' ? (
                                <CalendarPlus size={11} aria-hidden="true" />
                              ) : (
                                <ExternalLink size={11} aria-hidden="true" />
                              )}
                              {action.kind === 'phone' ? '전화' : action.kind === 'date' ? '일정 추가' : '열기'}
                            </a>
                          )}
                          <button
                            type="button"
                            aria-label={`${action.label} 처리 완료 표시`}
                            aria-pressed={isCompleted}
                            onClick={(e) => handleToggleActionComplete(action.id, e)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                              isCompleted
                                ? 'border-place-border bg-place-surface text-place-accent'
                                : 'border-border bg-surface text-text-tertiary hover:text-text-primary'
                            }`}
                          >
                            <Check size={11} aria-hidden="true" />
                            {isCompleted ? '완료됨' : '완료 표시'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                  const topic = buildCaptureReviewTopic(item, idx);
                  const reviewLinks = getReviewLinks(place.name, undefined, topic.query);
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
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${PROVIDER_DOT_CLASS[rl.provider] ?? 'bg-text-tertiary'}`}
                              aria-hidden="true"
                            />
                            {rl.label}
                          </a>
                        ))}
                      </div>
                      <div className="ml-8">
                        <PlaceReviews placeName={place.name} topic={topic} />
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
                    {item.relatedSearchTerms.map((term, i) => (
                      <a
                        key={i}
                        href={`https://www.perplexity.ai/search?q=${encodeURIComponent(term)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-[10px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {term}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-4">
                    {[
                      { icon: Zap, label: 'Perplexity', href: `https://www.perplexity.ai/search?q=${encodeURIComponent(item.title)}` },
                      { icon: SearchIcon, label: 'Google', href: `https://www.google.com/search?q=${encodeURIComponent(item.title)}` },
                      { icon: Play, label: 'YouTube', href: `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title)}` },
                      { icon: NotebookText, label: '블로그', href: `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(item.title)}` },
                    ].map(({ icon: Icon, label, href }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-lg group-hover:border-border-light transition-colors">
                          <Icon size={16} aria-hidden="true" />
                        </div>
                        <span className="text-[9px] text-text-tertiary group-hover:text-text-secondary transition-colors">{label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ArchiveSources capture={item} />
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

            {/* Capture Intent (Why Saved), Revisit Context, Travel Pack Pin & Reference Note Export */}
            <div
              className="mt-3 rounded-2xl border border-border bg-surface-elevated p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1">
                  <Bookmark size={12} className="text-primary" aria-hidden="true" />
                  남긴 이유 · 다시 볼 맥락
                </span>
                <button
                  type="button"
                  aria-pressed={meta.pinnedToTravelPack}
                  onClick={handleToggleTravelPin}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    meta.pinnedToTravelPack
                      ? 'border-primary-border bg-primary-surface text-primary'
                      : 'border-border bg-surface text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {meta.pinnedToTravelPack ? '여행·예약 묶음 고정됨' : '여행·예약 묶음 고정'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {CAPTURE_REASONS.map((r) => {
                  const selected = meta.reasons.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={(e) => handleToggleReason(r.id, e)}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors ${
                        selected
                          ? 'border-primary-border bg-primary-surface text-primary font-semibold'
                          : 'border-border bg-surface text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-text-tertiary flex items-center gap-1 mr-1">
                  <Compass size={11} aria-hidden="true" />
                  다시 보기:
                </span>
                {CAPTURE_REVISIT_OPTIONS.map((opt) => {
                  const active = meta.revisit === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={(e) => handleChangeRevisit(opt.id, e)}
                      className={`rounded-lg border px-2 py-0.5 text-[10px] transition-colors ${
                        active
                          ? 'border-[rgba(167,139,250,0.35)] bg-ai-surface text-ai-accent font-semibold'
                          : 'border-border bg-surface text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={meta.note}
                  onChange={(e) =>
                    updateMeta({
                      ...meta,
                      note: e.target.value,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  placeholder="왜 캡처했는지, 다음에 어떻게 쓸지 한 줄 메모"
                  aria-label={`${item.title} 내 메모`}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleDownloadReferenceNote}
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Download size={12} aria-hidden="true" />
                  참고 메모
                </button>
              </div>
            </div>

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

      {/* Uncropped Original Image Zoom Modal */}
      {showOriginalModal && item.imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${item.title} 원본 이미지`}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowOriginalModal(false);
          }}
        >
          <div
            className="flex w-full max-w-3xl items-center justify-between mb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-sm font-bold text-text-primary">{item.title}</p>
              <p className="text-xs text-text-secondary">
                글자와 예약번호·QR 코드가 잘리지 않는 원본 전체 화면입니다
              </p>
            </div>
            <button
              type="button"
              aria-label="원본 확대 닫기"
              onClick={() => setShowOriginalModal(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-secondary hover:text-text-primary"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-surface-elevated p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedImageSrc}
              alt={`${item.title} 원본 전체`}
              className="mx-auto max-h-[76vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </article>
  );
}
