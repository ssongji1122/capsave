'use client';

import { useId, type RefObject } from 'react';
import {
  addAnalysisPlace,
  removeAnalysisPlace,
  updateAnalysisCategory,
  updateAnalysisPlace,
  type AnalysisResult,
  type AnalysisDraftError,
} from '@scrave/shared';

interface AnalysisResultEditorProps {
  value: AnalysisResult;
  onChange: (value: AnalysisResult) => void;
  error: AnalysisDraftError | null;
  titleInputRef?: RefObject<HTMLInputElement | null>;
}

const INPUT_CLASS = 'min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
const LABEL_CLASS = 'block text-sm font-semibold text-text-primary mb-1.5';

export function AnalysisResultEditor({
  value,
  onChange,
  error,
  titleInputRef,
}: AnalysisResultEditorProps) {
  const id = useId();

  return (
    <div className="space-y-5" aria-label="분석 내용 수정">
      <fieldset>
        <legend className={LABEL_CLASS}>분류</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {([
            ['place', '장소'],
            ['text', '텍스트'],
          ] as const).map(([category, label]) => (
            <label
              key={category}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold ${
                value.category === category
                  ? 'border-primary bg-primary-surface text-primary'
                  : 'border-border bg-surface text-text-secondary'
              }`}
            >
              <input
                type="radio"
                name={`${id}-category`}
                value={category}
                checked={value.category === category}
                onChange={() => onChange(updateAnalysisCategory(value, category))}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block" htmlFor={`${id}-title`}>
        <span className={LABEL_CLASS}>제목</span>
        <input
          ref={titleInputRef}
          id={`${id}-title`}
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          className={INPUT_CLASS}
          aria-invalid={error?.field === 'title'}
        />
      </label>

      <label className="block" htmlFor={`${id}-summary`}>
        <span className={LABEL_CLASS}>요약</span>
        <textarea
          id={`${id}-summary`}
          value={value.summary}
          onChange={(event) => onChange({ ...value, summary: event.target.value })}
          rows={3}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block" htmlFor={`${id}-text`}>
        <span className={LABEL_CLASS}>추출한 글</span>
        <textarea
          id={`${id}-text`}
          value={value.extractedText}
          onChange={(event) => onChange({ ...value, extractedText: event.target.value })}
          rows={5}
          className={`${INPUT_CLASS} font-mono`}
        />
      </label>

      {value.category === 'place' && (
        <fieldset className="space-y-3">
          <legend className={LABEL_CLASS}>장소</legend>
          {value.places.map((place, index) => (
            <div key={index} className="rounded-2xl border border-border bg-surface p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-text-primary">장소 {index + 1}</strong>
                <button
                  type="button"
                  onClick={() => onChange(removeAnalysisPlace(value, index))}
                  className="min-h-11 px-2 text-sm font-semibold text-error"
                  aria-label={`장소 ${index + 1} 삭제`}
                >
                  삭제
                </button>
              </div>
              {(['name', 'address', 'date'] as const).map((field) => {
                const label = field === 'name' ? '장소 이름' : field === 'address' ? '주소' : '날짜';
                return (
                  <label key={field} className="block" htmlFor={`${id}-place-${index}-${field}`}>
                    <span className="block text-xs font-medium text-text-secondary mb-1">{label}</span>
                    <input
                      id={`${id}-place-${index}-${field}`}
                      value={place[field] ?? ''}
                      onChange={(event) => onChange(updateAnalysisPlace(value, index, field, event.target.value))}
                      className={INPUT_CLASS}
                    />
                  </label>
                );
              })}
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange(addAnalysisPlace(value))}
            className="min-h-11 w-full rounded-xl border border-dashed border-border px-3 text-sm font-semibold text-primary"
          >
            장소 추가
          </button>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-error px-3 py-2 text-sm text-error">
          {error.message}
        </p>
      )}
    </div>
  );
}
