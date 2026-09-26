'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, MapPin, Sparkles, X } from 'lucide-react';
import type { CaptureItem } from '@scrave/shared';
import { MAX_GUIDE_CAPTURES, MAX_GUIDE_NIGHTS, MIN_GUIDE_CAPTURES } from '@/lib/guide-draft';
import {
  GUIDE_DRAFT_STORAGE_KEY,
  countPickedPlaces,
  getDraftErrorMessage,
  isPickableCapture,
  serializeGuideDraft,
  togglePickedCapture,
  type StoredGuideDraft,
} from '@/lib/guide-draft-edit';

interface GuideCapturePickerProps {
  captures: CaptureItem[];
  onCancel: () => void;
}

const NIGHT_OPTIONS = Array.from({ length: MAX_GUIDE_NIGHTS + 1 }, (_, nights) => nights);

export function GuideCapturePicker({ captures, onCancel }: GuideCapturePickerProps) {
  const router = useRouter();
  const [picked, setPicked] = useState<number[]>([]);
  const [nights, setNights] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickable = captures.filter(isPickableCapture);
  const placeCount = countPickedPlaces(pickable, picked);
  const canSubmit = picked.length >= MIN_GUIDE_CAPTURES && !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/guides/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captureIds: picked, nights }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(getDraftErrorMessage(response.status, body));
        return;
      }

      try {
        sessionStorage.setItem(GUIDE_DRAFT_STORAGE_KEY, serializeGuideDraft(body as StoredGuideDraft));
      } catch (storageError) {
        console.error('[GuideCapturePicker] could not keep the draft:', storageError);
      }
      router.push('/guides/new');
    } catch (requestError) {
      console.error('[GuideCapturePicker] draft request failed:', requestError);
      setError(getDraftErrorMessage(0, {}));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 pb-32">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm text-text-secondary">
          가이드에 넣을 캡처를 {MIN_GUIDE_CAPTURES}~{MAX_GUIDE_CAPTURES}장 고르세요.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
        >
          <X size={14} aria-hidden="true" />
          취소
        </button>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pickable.map((capture) => {
          const checked = picked.includes(capture.id);
          const full = !checked && picked.length >= MAX_GUIDE_CAPTURES;
          return (
            <li key={capture.id}>
              <label
                className={`flex gap-3 p-4 rounded-3xl border transition-colors cursor-pointer ${
                  checked
                    ? 'border-primary-border bg-primary-surface'
                    : 'border-border bg-surface hover:border-border-light'
                } ${full ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  disabled={full}
                  onChange={() => setPicked((current) => togglePickedCapture(current, capture.id))}
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                    checked ? 'border-primary bg-primary text-background' : 'border-border-light'
                  }`}
                >
                  {checked && <Check size={14} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-semibold text-text-primary truncate">
                    {capture.title}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {capture.places.map((place, index) => (
                      <span
                        key={`${place.name}-${index}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-place-border bg-place-surface text-[11px] text-place-accent"
                      >
                        <MapPin size={10} aria-hidden="true" />
                        {place.name}
                      </span>
                    ))}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-16 lg:bottom-0 lg:left-60 z-30 border-t border-border bg-surface-elevated/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3">
          <span className="font-mono text-[13px] text-text-secondary">
            {picked.length}장 · 장소 {placeCount}곳
          </span>
          <label className="flex items-center gap-2 text-[13px] text-text-secondary">
            일정
            <select
              aria-label="일정"
              value={nights}
              onChange={(event) => setNights(Number(event.target.value))}
              className="rounded-xl border border-border bg-surface px-2 py-1 text-text-primary"
            >
              {NIGHT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 0 ? '당일' : `${option}박`}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={`ml-auto inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              submitting
                ? 'bg-ai-surface text-ai-accent animate-pulse'
                : 'bg-primary text-background hover:bg-primary-light'
            }`}
          >
            <Sparkles size={15} aria-hidden="true" />
            {submitting ? '순서를 정하는 중' : '초안 만들기'}
          </button>
          {error && (
            <p role="alert" className="basis-full text-[13px] text-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
