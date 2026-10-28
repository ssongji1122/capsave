'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Compass,
  Copy,
  ExternalLink,
  Globe,
  Lock,
  MapPin,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { SavedGuideSummary } from '@scrave/shared';

export default function GuidesListPage() {
  const [guides, setGuides] = useState<SavedGuideSummary[]>([]);
  const [maxGuides, setMaxGuides] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadGuides = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/guides');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGuides(data.guides ?? []);
      if (typeof data.maxGuides === 'number') setMaxGuides(data.maxGuides);
    } catch {
      setError('가이드 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  const handleToggleVisibility = async (guide: SavedGuideSummary) => {
    const nextVisibility = guide.visibility === 'unlisted' ? 'private' : 'unlisted';
    if (nextVisibility === 'unlisted') {
      const ok = window.confirm(
        '링크를 받은 사람은 장소 이름·순서·메모를 볼 수 있습니다. 원본 캡처 사진은 보이지 않습니다. 링크 공개로 전환할까요?',
      );
      if (!ok) return;
    }

    try {
      const res = await fetch(`/api/guides/${guide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: nextVisibility, status: 'ready' }),
      });
      if (!res.ok) throw new Error('update failed');
      setGuides((prev) =>
        prev.map((item) =>
          item.id === guide.id ? { ...item, visibility: nextVisibility } : item,
        ),
      );
    } catch {
      setError('공개 범위 변경에 실패했습니다.');
    }
  };

  const handleCopyShareLink = async (guide: SavedGuideSummary) => {
    const url = `${window.location.origin}/g/${guide.slug}`;
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(guide.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDelete = async (guide: SavedGuideSummary) => {
    if (!window.confirm(`"${guide.title}" 가이드를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/guides/${guide.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      setGuides((prev) => prev.filter((item) => item.id !== guide.id));
    } catch {
      setError('가이드 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="pb-20 lg:pb-8">
      <div className="px-5 pt-8 pb-4 lg:pt-10 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Compass size={22} className="text-primary" aria-hidden="true" />
            내 여행·동선 가이드
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            장소 캡처로 만든 동선 가이드를 보관하고 링크로 공유합니다 ({guides.length} / {maxGuides})
          </p>
        </div>
        <Link
          href="/places"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-background hover:bg-primary-light transition-colors"
        >
          <Sparkles size={15} aria-hidden="true" />
          새 가이드 만들기
        </Link>
      </div>

      {error && (
        <div className="mx-4 mb-4 rounded-xl border border-error/40 bg-surface p-3 text-xs text-error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              className="h-44 rounded-3xl border border-border bg-surface animate-pulse"
            />
          ))}
        </div>
      ) : guides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
            <Compass size={36} className="text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">
            아직 저장한 동선 가이드가 없습니다
          </h2>
          <p className="text-sm text-text-secondary mt-2 max-w-md leading-6">
            장소 탭에서 캡처 2~10장을 고르면 AI가 이동 거리와 방문 시간대를 고려해 동선 가이드를 만들어 드립니다.
          </p>
          <Link
            href="/places"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-light transition-colors"
          >
            <MapPin size={15} aria-hidden="true" />
            장소 캡처 고르러 가기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {guides.map((guide) => {
            const isShared = guide.visibility === 'unlisted';
            return (
              <article
                key={guide.id}
                className="rounded-3xl border border-border bg-surface p-5 flex flex-col justify-between gap-4 hover:border-border-light transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isShared
                          ? 'bg-place-surface text-place-accent border border-place-border'
                          : 'bg-surface-elevated text-text-secondary border border-border'
                      }`}
                    >
                      {isShared ? (
                        <>
                          <Globe size={12} aria-hidden="true" />
                          링크 공개 (noindex)
                        </>
                      ) : (
                        <>
                          <Lock size={12} aria-hidden="true" />
                          나만 보기
                        </>
                      )}
                    </span>
                    <span className="text-xs font-mono text-text-tertiary">
                      장소 {guide.placeCount}곳 · {guide.updatedAt.slice(0, 10)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-text-primary mt-3">
                    {guide.title}
                  </h2>
                  {guide.description && (
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                      {guide.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(guide)}
                      className="rounded-xl border border-border bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {isShared ? '비공개로 전환' : '링크 공유 켜기'}
                    </button>
                    {isShared && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyShareLink(guide)}
                          className="inline-flex items-center gap-1 rounded-xl border border-primary-border bg-primary-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Copy size={12} aria-hidden="true" />
                          {copiedId === guide.id ? '링크 복사됨' : '공유 링크 복사'}
                        </button>
                        <Link
                          href={`/g/${guide.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <ExternalLink size={12} aria-hidden="true" />
                          열기
                        </Link>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`${guide.title} 삭제`}
                    onClick={() => handleDelete(guide)}
                    className="rounded-xl p-2 text-text-tertiary hover:text-error transition-colors"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
