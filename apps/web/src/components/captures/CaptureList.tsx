'use client';

import { useState, type ReactNode } from 'react';
import { CaptureDeck } from './CaptureDeck';
import { Search } from 'lucide-react';
import { CaptureItem } from '@scrave/shared';
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
      <div className="flex gap-2 px-4 pt-4" role="group" aria-label="카드 보기 방식">
        {(['grid', 'deck'] as const).map(mode => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className="min-h-11 rounded-full border border-border px-4 text-sm text-primary">{mode === 'grid' ? '모아보기' : '한 장씩'}</button>)}
      </div>
      {view === 'deck' ? <CaptureDeck captures={captures} onDelete={onDelete} onMetaChange={onMetaChange} /> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
        {captures.map((item) => (
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
