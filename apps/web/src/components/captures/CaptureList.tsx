'use client';

import { CaptureItem } from '@scrave/shared';
import { CaptureCard } from './CaptureCard';

interface CaptureListProps {
  captures: CaptureItem[];
  isLoading: boolean;
  onDelete: (id: number) => void;
  emptyIcon: string;
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
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  hasMore,
  isLoadingMore,
  loadMore,
  searchQuery,
}: CaptureListProps) {
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
            <span className="text-4xl">🔍</span>
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
          <span className="text-4xl">{emptyIcon}</span>
        </div>
        <h3 className="text-xl font-bold text-text-primary">{emptyTitle}</h3>
        <p className="text-text-secondary text-center mt-2 leading-6 whitespace-pre-line">{emptySubtitle}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
        {captures.map((item) => (
          <CaptureCard key={item.id} item={item} onDelete={onDelete} />
        ))}
      </div>
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
