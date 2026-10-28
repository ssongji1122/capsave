'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  Copy,
  Globe,
  MessageSquareText,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { GuideVisibility, PlaceReviewResult } from '@scrave/shared';
import { PublicGuideExperience } from '@/components/guides/PublicGuideExperience';
import { toGuideReferences } from '@/lib/guide-draft';
import {
  GUIDE_DRAFT_STORAGE_KEY,
  attachGuidePlaceReferences,
  moveGuidePlace,
  parseStoredGuideDraft,
  removeGuidePlace,
  serializeGuideDraft,
  updateGuidePlaceText,
  type EditablePlaceField,
  type StoredGuideDraft,
} from '@/lib/guide-draft-edit';

type ReviewState = { status: 'loading' } | { status: 'added'; count: number } | { status: 'error' };

function readDraft(): StoredGuideDraft | null {
  try {
    return parseStoredGuideDraft(sessionStorage.getItem(GUIDE_DRAFT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function keepDraft(draft: StoredGuideDraft) {
  try {
    sessionStorage.setItem(GUIDE_DRAFT_STORAGE_KEY, serializeGuideDraft(draft));
  } catch (error) {
    console.error('[GuideDraftScreen] could not keep the draft:', error);
  }
}

export function GuideDraftScreen() {
  const [draft, setDraft] = useState<StoredGuideDraft | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [savedGuideId, setSavedGuideId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<GuideVisibility>('private');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  if (draft === undefined) return null;

  if (draft === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-text-secondary">만들어 둔 가이드 초안이 없습니다.</p>
        <a
          href="/places"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary-light"
        >
          장소에서 캡처 고르기
        </a>
      </div>
    );
  }

  const { guide } = draft;

  const update = (next: StoredGuideDraft['guide']) => {
    const nextDraft = { ...draft, guide: next };
    setDraft(nextDraft);
    keepDraft(nextDraft);
    setSaveMessage(null);
  };

  const editText = (placeId: string, field: EditablePlaceField, value: string) => {
    const next = updateGuidePlaceText(guide, placeId, field, value);
    if (next !== guide) update(next);
  };

  const handleSaveToGuides = async (targetVisibility: GuideVisibility = visibility) => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = savedGuideId
        ? await fetch(`/api/guides/${savedGuideId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guide,
              status: 'ready',
              visibility: targetVisibility,
            }),
          })
        : await fetch('/api/guides', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guide,
              status: 'ready',
              visibility: targetVisibility,
              generation: { fallback: draft.fallback },
            }),
          });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (errBody?.error === 'guide-limit-reached') {
          setSaveError('가이드는 최대 20편까지 저장할 수 있습니다. 기존 가이드를 정리해 주세요.');
        } else {
          setSaveError('가이드 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
        return;
      }

      const data = await response.json();
      if (data?.guide?.id) {
        setSavedGuideId(data.guide.id);
      }
      setVisibility(targetVisibility);
      setSaveMessage(
        targetVisibility === 'unlisted'
          ? '링크를 아는 사람만 볼 수 있도록 공유를 켰습니다. 원본 캡처 사진은 노출되지 않습니다.'
          : '가이드 보관함에 저장했습니다.',
      );
    } catch {
      setSaveError('가이드 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/g/${guide.slug}`;
    await navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const attachReviews = async (placeId: string, name: string) => {
    setReviews((current) => ({ ...current, [placeId]: { status: 'loading' } }));
    try {
      const response = await fetch('/api/place-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(`place-reviews returned ${response.status}`);
      const result = (await response.json()) as PlaceReviewResult;
      const references = toGuideReferences(result, new Date().toISOString().slice(0, 10));
      setDraft((current) => {
        if (!current) return current;
        const nextDraft = {
          ...current,
          guide: attachGuidePlaceReferences(current.guide, placeId, references),
        };
        keepDraft(nextDraft);
        return nextDraft;
      });
      setReviews((current) => ({ ...current, [placeId]: { status: 'added', count: references.length } }));
    } catch (error) {
      console.error('[GuideDraftScreen] reviews failed:', error);
      setReviews((current) => ({ ...current, [placeId]: { status: 'error' } }));
    }
  };

  return (
    <div className="bg-background">
      <section className="mx-auto max-w-[1280px] px-4 py-6" aria-label="초안 고치기">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-ai-surface px-3 py-1 text-[13px] font-semibold text-ai-accent">
              <Sparkles size={14} aria-hidden="true" />
              AI 초안 · 방문 전 확인 필요
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveToGuides(visibility)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-background hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                {savedGuideId ? <Check size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
                {savedGuideId ? '변경 내용 저장' : '가이드 보관함에 저장'}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  handleSaveToGuides(visibility === 'unlisted' ? 'private' : 'unlisted')
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  visibility === 'unlisted'
                    ? 'border-place-border bg-place-surface text-place-accent'
                    : 'border-border bg-surface-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                <Globe size={14} aria-hidden="true" />
                {visibility === 'unlisted' ? '링크 공유 중 (비공개 전환)' : '링크 공유 켜기'}
              </button>
              {visibility === 'unlisted' && (
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-1 rounded-xl border border-primary-border bg-primary-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Copy size={13} aria-hidden="true" />
                  {copiedLink ? '공유 링크 복사됨' : '공유 링크 복사'}
                </button>
              )}
            </div>
          </div>

          <p className="mt-2 text-[13px] text-text-secondary">
            순서와 문장은 AI가 저장한 캡처만 보고 정했습니다. 영업시간과 가격은 넣지 않았습니다.
            「가이드 보관함에 저장」으로 계정에 영구 보관하거나 「내 지도에 저장」으로 아카이브에 남기세요.
          </p>
          {saveMessage && (
            <p role="status" className="mt-2 text-[13px] text-place-accent font-medium">
              {saveMessage}
            </p>
          )}
          {saveError && (
            <p role="alert" className="mt-2 text-[13px] text-error font-medium">
              {saveError}
            </p>
          )}
          {draft.fallback && (
            <p className="mt-2 text-[13px] text-warning">
              AI 순서를 만들지 못해 거리순으로 놓았습니다. 순서와 시간대를 직접 고쳐 주세요.
            </p>
          )}
          {draft.unresolved.length > 0 && (
            <p className="mt-2 text-[13px] text-text-secondary">
              위치를 찾지 못해 뺀 장소: {draft.unresolved.map(({ name }) => name).join(', ')}
            </p>
          )}

          <ol className="mt-4 space-y-3">
            {guide.places.map((place, index) => {
              const review = reviews[place.id];
              return (
                <li key={place.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-text-tertiary">
                      {String(place.sequence).padStart(2, '0')}
                    </span>
                    <span className="flex-1 truncate text-[15px] font-semibold text-text-primary">
                      {place.name}
                    </span>
                    <button
                      type="button"
                      aria-label={`${place.name} 위로`}
                      disabled={index === 0}
                      onClick={() => update(moveGuidePlace(guide, place.id, -1))}
                      className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30"
                    >
                      <ArrowUp size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${place.name} 아래로`}
                      disabled={index === guide.places.length - 1}
                      onClick={() => update(moveGuidePlace(guide, place.id, 1))}
                      className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30"
                    >
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${place.name} 빼기`}
                      disabled={guide.places.length <= 2}
                      onClick={() => update(removeGuidePlace(guide, place.id))}
                      className="rounded-lg p-1.5 text-text-secondary hover:text-error disabled:opacity-30"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <label className="text-[11px] text-text-tertiary">
                      방문 시간
                      <input
                        key={`${place.id}-visit-${place.visitWindow}`}
                        aria-label={`${place.name} 방문 시간`}
                        defaultValue={place.visitWindow}
                        onBlur={(event) => editText(place.id, 'visitWindow', event.target.value)}
                        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-text-primary"
                      />
                    </label>
                    <label className="text-[11px] text-text-tertiary">
                      가기 전 확인
                      <textarea
                        key={`${place.id}-note-${place.practicalNote}`}
                        aria-label={`${place.name} 가기 전 확인`}
                        defaultValue={place.practicalNote}
                        rows={2}
                        onBlur={(event) => editText(place.id, 'practicalNote', event.target.value)}
                        className="mt-1 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-text-primary"
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`${place.name} 후기·영상 붙이기`}
                      disabled={review?.status === 'loading'}
                      onClick={() => attachReviews(place.id, place.name)}
                      className={`inline-flex items-center gap-1 rounded-lg border border-text-border px-3 py-1.5 text-xs font-medium text-text-accent hover:bg-text-surface disabled:opacity-50 ${
                        review?.status === 'loading' ? 'animate-pulse' : ''
                      }`}
                    >
                      <MessageSquareText size={13} aria-hidden="true" />
                      후기·영상 붙이기
                    </button>
                    {review?.status === 'added' && (
                      <span className="text-[11px] text-text-secondary">{review.count}개 붙임</span>
                    )}
                    {review?.status === 'error' && (
                      <span className="text-[11px] text-error">후기와 영상을 불러오지 못했습니다.</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <PublicGuideExperience
        guide={guide}
        mode="draft"
        saveImageUrl={draft.coverImageUrl ?? undefined}
      />
    </div>
  );
}
