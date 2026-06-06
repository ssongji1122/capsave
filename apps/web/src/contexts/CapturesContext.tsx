'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CaptureItem,
  CaptureRow,
  CaptureCategory,
  PlaceInfo,
  AnalysisResult,
  getAllCaptures,
  getCapturesByCategory as getCapturesByCategoryQuery,
  searchCaptures as searchCapturesQuery,
  saveCapture as saveCaptureQuery,
  deleteCapture as deleteCaptureQuery,
  reclassifyCapture as reclassifyCaptureQuery,
  mapRowToCapture,
  MAX_FREE_CAPTURES,
} from '@scrave/shared';
import { createClient } from '@/lib/supabase/browser';
import { showErrorToast } from '@/lib/notifications';
import { getRealUserId } from '@/lib/auth-user';
import {
  applyRealtimeCaptureDelete,
  applyRealtimeCaptureInsert,
  applyRealtimeCaptureUpdate,
} from '@/lib/realtime-captures';

export { MAX_FREE_CAPTURES };

interface CapturesContextValue {
  captures: CaptureItem[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  isFreeLimitReached: boolean;
  freeRemaining: number;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  deleteCapture: (id: number) => Promise<boolean>;
  searchCaptures: (query: string) => Promise<CaptureItem[]>;
  getCapturesByCategory: (category: CaptureCategory) => Promise<CaptureItem[]>;
  reclassifyCapture: (
    id: number,
    category: CaptureCategory,
    places: PlaceInfo[] | null
  ) => Promise<CaptureItem | null>;
  saveCapture: (result: AnalysisResult, imageUrl: string) => Promise<void>;
}

interface RealtimeCapturePayload {
  new: unknown;
  old: unknown;
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
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await client.auth.getUser();
      setUserId(getRealUserId(user));
      setIsAuthReady(true);
    };
    initAuth();
  }, [client]);

  const refresh = useCallback(async () => {
    if (!isAuthReady || !userId) {
      setCaptures([]);
      setHasMore(false);
      setNextCursor(null);
      setIsLoading(false);
      return;
    }

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
  }, [client, isAuthReady, userId]);

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || isLoadingMore || !nextCursor) return;
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
  }, [client, userId, hasMore, isLoadingMore, nextCursor]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription — INSERT / UPDATE / DELETE
  useEffect(() => {
    if (!userId) return;

    const filter = `user_id=eq.${userId}`;
    const channel = client
      .channel('captures-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'captures', filter },
        (payload: RealtimeCapturePayload) => {
          const newItem = mapRowToCapture(payload.new as CaptureRow);
          setCaptures((prev) => applyRealtimeCaptureInsert(prev, newItem, userId));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'captures', filter },
        (payload: RealtimeCapturePayload) => {
          const updated = mapRowToCapture(payload.new as CaptureRow);
          setCaptures((prev) => applyRealtimeCaptureUpdate(prev, updated, userId));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'captures', filter },
        (payload: RealtimeCapturePayload) => {
          const deletedId = (payload.old as { id: number }).id;
          setCaptures((prev) => applyRealtimeCaptureDelete(prev, deletedId));
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, userId]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteCaptureQuery(client, id);
      setCaptures((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (error) {
      console.error('Failed to delete capture:', error);
      showErrorToast('삭제에 실패했습니다. 다시 시도해주세요.');
      return false;
    }
  }, [client]);

  const handleSearch = useCallback(async (query: string) => {
    if (!userId) return [];
    const { items } = await searchCapturesQuery(client, query);
    return items;
  }, [client, userId]);

  const handleGetByCategory = useCallback(async (category: CaptureCategory) => {
    if (!userId) return [];
    const result = await getCapturesByCategoryQuery(client, category);
    return result.items;
  }, [client, userId]);

  const handleReclassify = useCallback(async (
    id: number,
    category: CaptureCategory,
    places: PlaceInfo[] | null
  ) => {
    if (!userId) {
      showErrorToast('로그인이 필요합니다.');
      return null;
    }

    try {
      const updated = await reclassifyCaptureQuery(client, id, category, places);
      setCaptures((prev) => applyRealtimeCaptureUpdate(prev, updated, userId));
      return updated;
    } catch (error) {
      console.error('Failed to reclassify capture:', error);
      showErrorToast('분류 변경에 실패했습니다. 다시 시도해주세요.');
      return null;
    }
  }, [client, userId]);

  const handleSave = useCallback(async (result: AnalysisResult, imageUrl: string) => {
    if (!userId) {
      showErrorToast('로그인이 필요합니다.');
      throw new Error('AUTH_REQUIRED');
    }
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
        isAuthenticated: userId !== null,
        isAuthReady,
        loadMore,
        refresh,
        deleteCapture: handleDelete,
        searchCaptures: handleSearch,
        getCapturesByCategory: handleGetByCategory,
        reclassifyCapture: handleReclassify,
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
