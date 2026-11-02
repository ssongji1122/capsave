'use client';

import { useRef, useState } from 'react';
import { ARCHIVE_SECTIONS, classifyArchiveCapture, type ArchiveSection, type CaptureItem } from '@scrave/shared';
import type { CaptureUserMeta } from '@/lib/capture-intent';
import { swipeStep } from '@/lib/capture-swipe';
import { CaptureCard } from './CaptureCard';

export function CaptureDeck({ captures, onDelete, onMetaChange, initialCategory }: {
  captures: CaptureItem[];
  initialCategory?: ArchiveSection;
  onDelete: (id: number) => void;
  onMetaChange?: (id: number, meta: CaptureUserMeta) => void;
}) {
  const sections = ARCHIVE_SECTIONS.filter(section => captures.some(item => classifyArchiveCapture(item) === section.id));
  const [selected, setSelected] = useState(initialCategory ?? '');
  const [position, setPosition] = useState(0);
  const category = sections.find(section => section.id === selected)?.id ?? sections[0]?.id;
  const items = captures.filter(item => classifyArchiveCapture(item) === category);
  const index = Math.min(position, Math.max(0, items.length - 1));
  const item = items[index];
  const start = useRef<{x: number; y: number} | null>(null);
  const [offset, setOffset] = useState(0);
  const dragged = useRef(false);
  const move = (step: number) => setPosition(Math.max(0, Math.min(items.length - 1, index + step)));
  if (!item) return null;

  return <section className="capture-deck p-4" aria-label="같은 카테고리 카드 넘겨보기">
    <div className="flex items-center justify-between gap-3 mb-4">
      <label className="text-sm text-text-secondary">카테고리
        <select aria-label="넘겨 볼 카테고리" className="ml-2 min-h-11 rounded-xl border border-border bg-surface px-3 text-text-primary" value={category} onChange={event => {setSelected(event.target.value); setPosition(0);}}>
          {sections.map(section => <option key={section.id} value={section.id}>{section.label}</option>)}
        </select>
      </label>
      <span role="status" aria-live="polite" className="text-sm text-text-secondary">{index + 1} / {items.length}</span>
    </div>
    <div className="mx-auto max-w-lg">
      <div className="capture-deck-surface" tabIndex={0} aria-label="카드를 좌우로 넘깁니다" style={{touchAction:'pan-y', transform:`translateX(${offset}px) rotate(${offset / 30}deg)`}}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);}
        }}
        onClickCapture={event => {if (dragged.current) {event.preventDefault(); event.stopPropagation(); dragged.current = false;}}}
        onPointerDown={event => {
          if (event.button !== 0 || (event.target as HTMLElement).closest('button,a,input,textarea,select,[role="dialog"]')) return;
          dragged.current = false;
          start.current = {x:event.clientX, y:event.clientY};
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={event => {
          if (!start.current) return;
          const dx = event.clientX - start.current.x;
          const dy = event.clientY - start.current.y;
          if (Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (Math.abs(dx) > 10) dragged.current = true;
            setOffset(Math.max(-120, Math.min(120, dx)));
          }
        }}
        onPointerUp={event => {
          if (start.current) move(swipeStep(event.clientX - start.current.x, event.clientY - start.current.y));
          start.current = null; setOffset(0);
        }}
        onPointerCancel={() => {start.current = null; dragged.current = false; setOffset(0);}}
      >
        <CaptureCard key={item.id} item={item} onDelete={onDelete} onMetaChange={onMetaChange} />
      </div>
      <div className="flex justify-between items-center gap-3 mt-4">
        <button type="button" aria-label="이전 카드" disabled={index === 0} onClick={() => move(-1)} className="min-h-11 min-w-11 rounded-full border border-border px-4 text-primary disabled:opacity-40">←</button>
        <p className="text-xs text-text-secondary">같은 카테고리 안에서 좌우로 넘깁니다</p>
        <button type="button" aria-label="다음 카드" disabled={index === items.length - 1} onClick={() => move(1)} className="min-h-11 min-w-11 rounded-full border border-border px-4 text-primary disabled:opacity-40">→</button>
      </div>
    </div>
  </section>;
}
