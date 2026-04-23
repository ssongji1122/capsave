'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CaptureItem,
  CaptureRow,
  CaptureCategory,
  AnalysisResult,
  getAllCaptures,
  getCapturesByCategory as getCapturesByCategoryQuery,
  searchCaptures as searchCapturesQuery,
  saveCapture as saveCaptureQuery,
  deleteCapture as deleteCaptureQuery,
  mapRowToCapture,
  MAX_FREE_CAPTURES,
} from '@scrave/shared';
import { createClient } from '@/lib/supabase/browser';
import { showErrorToast } from '@/lib/notifications';

export { MAX_FREE_CAPTURES };

interface CapturesContextValue {
  captures: CaptureItem[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  isFreeLimitReached: boolean;
  freeRemaining: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  deleteCapture: (id: number) => Promise<void>;
  searchCaptures: (query: string) => Promise<CaptureItem[]>;
  getCapturesByCategory: (category: CaptureCategory) => Promise<CaptureItem[]>;
  saveCapture: (result: AnalysisResult, imageUrl: string) => Promise<void>;
}

const CapturesContext = createContext<CapturesContextValue | null>(null);

export function CapturesProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [client] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    client.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, [client]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getAllCaptures(client);
      setCaptures(result.items);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('Failed to load captures:', error);
      showErrorToast('캡처를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    try {
      setIsLoadingMore(true);
      const result = await getAllCaptures(client, { cursor: nextCursor });
      setCaptures((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('Failed to load more captures:', error);
      showErrorToast('더 불러오기에 실패했습니다.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [client, hasMore, isLoadingMore, nextCursor]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription — INSERT / UPDATE / DELETE
  useEffect(() => {
    const channel = client
      .channel('captures-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'captures' },
        (payload) => {
          const newItem = mapRowToCapture(payload.new as CaptureRow);
          setCaptures((prev) => {
            if (prev.some((c) => c.id === newItem.id)) return prev;
            return [newItem, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'captures' },
        (payload) => {
          const updated = mapRowToCapture(payload.new as CaptureRow);
          setCaptures((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'captures' },
        (payload) => {
          const deletedId = (payload.old as { id: number }).id;
          setCaptures((prev) => prev.filter((c) => c.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteCaptureQuery(client, id);
      setCaptures((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete capture:', error);
      showErrorToast('삭제에 실패했습니다. 다시 시도해주세요.');
    }
  }, [client]);

  const handleSearch = useCallback(async (query: string) => {
    const { items } = await searchCapturesQuery(client, query);
    return items;
  }, [client]);

  const handleGetByCategory = useCallback(async (category: CaptureCategory) => {
    const result = await getCapturesByCategoryQuery(client, category);
    return result.items;
  }, [client]);

  const handleSave = useCallback(async (result: AnalysisResult, imageUrl: string) => {
    if (captures.length >= MAX_FREE_CAPTURES) {
      showErrorToast(`무료 플랜은 최대 ${MAX_FREE_CAPTURES}개까지 저장할 수 있습니다.`);
      throw new Error('FREE_LIMIT_REACHED');
    }
    try {
      const newCapture = await saveCaptureQuery(client, result, imageUrl, userId ?? undefined);
      // Attach ephemeral fields from analysis result (not persisted to DB)
      const enriched: CaptureItem = {
        ...newCapture,
        ...(result.keyInsights && { keyInsights: result.keyInsights }),
        ...(result.relatedSearchTerms && { relatedSearchTerms: result.relatedSearchTerms }),
      };
      setCaptures((prev) => [enriched, ...prev]);
    } catch (error) {
      console.error('Failed to save capture:', error);
      showErrorToast('저장에 실패했습니다. 다시 시도해주세요.');
      throw error;
    }
  }, [client, userId, captures.length]);

  return (
    <CapturesContext.Provider
      value={{
        captures,
        isLoading,
        hasMore,
        isLoadingMore,
        isFreeLimitReached: captures.length >= MAX_FREE_CAPTURES,
        freeRemaining: Math.max(0, MAX_FREE_CAPTURES - captures.length),
        loadMore,
        refresh,
        deleteCapture: handleDelete,
        searchCaptures: handleSearch,
        getCapturesByCategory: handleGetByCategory,
        saveCapture: handleSave,
      }}
    >
      {children}
    </CapturesContext.Provider>
  );
}

export function useCaptures() {
  const context = useContext(CapturesContext);
  if (!context) {
    throw new Error('useCaptures must be used within a CapturesProvider');
  }
  return context;
}
