'use client';

import { useState, type ReactNode } from 'react';
import { CaptureDeck } from './CaptureDeck';
import { Search } from 'lucide-react';
import { CaptureItem, CAPTURE_SORT_OPTIONS, sortCaptures, relatedCaptures, classifyArchiveCapture, extractStoragePath, type CaptureSort } from '@scrave/shared';
import { isDataUri } from '@/lib/image-utils';
import type { CaptureUserMeta } from '@/lib/capture-intent';
import { CaptureCard } from './CaptureCard';

interface CaptureListProps {
  captures: CaptureItem[];
  isLoading: boolean;
  onDelete: (id: number) => void;
  onMetaChange?: (captureId: number, meta: CaptureUserMeta) => void;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptySubtitle: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  loadMore?: () => void;
  searchQuery?: string;
}

export function CaptureList({
  captures,
  isLoading,
  onDelete,
  onMetaChange,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  hasMore,
  isLoadingMore,
  loadMore,
  searchQuery,
}: CaptureListProps) {
  const [view, setView] = useState<'grid' | 'deck'>('grid');
  const [sort, setSort] = useState<CaptureSort>('recent');
  const [anchorId, setAnchorId] = useState<number | null>(null);
  const anchor = captures.find(c => c.id === anchorId) ?? sortCaptures(captures, 'recent')[0];
  const ordered = sortCaptures(captures, sort, anchor);
  const related = anchor ? relatedCaptures(anchor, captures) : [];
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-3xl bg-surface border border-border h-72 animate-[pulse-slow_2s_ease-in-out_infinite]" />
        ))}
      </div>
    );
  }

  if (captures.length === 0) {
    if (searchQuery && searchQuery.trim().length > 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <div className="w-24 h-24 rounded-full bg-surface-elevated flex items-center justify-center mb-5">
            <Search size={40} className="text-text-tertiary" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-text-primary">
            &ldquo;{searchQuery}&rdquo; 결과 없음
          </h3>
          <p className="text-text-secondary text-center mt-2 leading-6">
            다른 키워드로 검색해보세요
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-24 px-8">
        <div className="w-24 h-24 rounded-full bg-surface-elevated flex items-center justify-center mb-5">
          {emptyIcon}
        </div>
        <h3 className="text-xl font-bold text-text-primary">{emptyTitle}</h3>
        <p className="text-text-secondary text-center mt-2 leading-6 whitespace-pre-line">{emptySubtitle}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4" role="group" aria-label="카드 보기 방식">
        {(['grid', 'deck'] as const).map(mode => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className="min-h-11 rounded-full border border-border px-4 text-sm text-primary">{mode === 'grid' ? '모아보기' : '한 장씩'}</button>)}
        <label className="text-sm text-text-secondary">정렬 <select aria-label="카드 정렬" value={sort} onChange={e=>setSort(e.target.value as CaptureSort)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-text-primary">{CAPTURE_SORT_OPTIONS.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      </div>
      <p className="px-4 pt-3 text-xs text-text-secondary">현재 불러온 {captures.length}개 안에서 정렬합니다{hasMore ? ' · 더 보기를 누르면 범위가 넓어집니다' : ''}.</p>
      {sort === 'upcoming' && <p className="px-4 pt-3 text-sm text-text-secondary">캡처에서 읽은 날짜 중 오늘 이후 일정을 먼저 보여줍니다. 시간이 변경됐는지는 원본에서 확인하세요.</p>}
      {sort === 'related' && anchor && <section className="p-4" aria-label="같은 카테고리의 연관 카드">
        <label className="text-sm text-text-secondary">이 카드와 연결하기 <select aria-label="연관 기준 카드" value={anchor.id} onChange={e=>setAnchorId(Number(e.target.value))} className="block min-h-11 w-full max-w-md rounded-xl border border-border bg-background px-3 text-text-primary">{captures.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <p className="my-3 text-sm text-text-secondary">같은 카테고리에서 태그·장소·출처 계정이 겹치는 카드입니다. 카드를 고르면 연결 기준이 바뀝니다.</p>
        <div className="flex gap-3 overflow-x-auto pb-2">{related.map(({capture,reasons})=><button type="button" key={capture.id} onClick={()=>setAnchorId(capture.id)} className="w-40 shrink-0 rounded-xl border border-border p-2 text-left"><img src={isDataUri(capture.imageUrl)?capture.imageUrl:`/api/image?path=${encodeURIComponent(extractStoragePath(capture.imageUrl))}`} alt={`${capture.title} 원본`} className="h-32 w-full object-contain" loading="lazy"/><span className="mt-2 block text-sm font-medium">{capture.title}</span><span className="mt-1 block text-xs text-text-secondary">{reasons.join(' / ')}</span></button>)}</div>
        {related.length===0 && <p className="text-sm text-text-secondary">아직 연결 근거가 있는 카드가 없습니다.</p>}
      </section>}
      {view === 'deck' ? <CaptureDeck key={`${sort}:${anchor.id}`} captures={ordered} initialCategory={sort==='related' ? classifyArchiveCapture(anchor) : undefined} onDelete={onDelete} onMetaChange={onMetaChange} /> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
        {ordered.map((item) => (
          <CaptureCard
            key={item.id}
            item={item}
            onDelete={onDelete}
            onMetaChange={onMetaChange}
          />
        ))}
      </div>}
      {hasMore && (
        <div className="flex justify-center mt-6 mb-4">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm font-medium text-text-secondary hover:text-text-primary hover:border-border-light transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? '불러오는 중...' : '더 보기'}
          </button>
        </div>
      )}
    </>
  );
}
