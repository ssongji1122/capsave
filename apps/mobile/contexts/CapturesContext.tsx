import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import {
  CaptureItem,
  getAllCaptures as getCachedCaptures,
  replaceAllCaptures,
  deleteCapture as dbDeleteCapture,
  saveCapture as dbSaveCapture,
} from '@/services/database';
import { CaptureCategory, AnalysisResult } from '@/services/ai-analyzer';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '@/services/supabase';
import {
  MAX_FREE_CAPTURES,
  countUserCaptures,
  getAllCaptures as supaGetAll,
  saveCapture as supaSave,
  deleteCapture as supaDelete,
} from '@scrave/shared';
import {
  deleteCaptureForSession,
  getSessionVisibleCaptures,
  loadCachedCapturesForSession,
  loadCapturesForSession,
  searchVisibleCaptures,
  toMobileCapture,
} from '@/services/session-captures';
import {
  assertCanSaveCapture,
  CaptureSaveLimitError,
} from '@/services/mobile-save-capacity';
import {
  clearCaptureCacheOwner,
  getCaptureCacheOwner,
  setCaptureCacheOwner,
} from '@/services/capture-cache-owner';
import { syncCapturesForSession } from '@/services/capture-sync-flow';

interface CapturesContextValue {
  captures: CaptureItem[];
  isLoading: boolean;
  syncError: string | null;
  refresh: () => Promise<void>;
  saveCapture: (analysis: AnalysisResult, imageUrl: string) => Promise<void>;
  deleteCapture: (id: number) => Promise<boolean>;
  searchCaptures: (query: string) => Promise<CaptureItem[]>;
  getCapturesByCategory: (category: CaptureCategory) => CaptureItem[];
}

const CapturesContext = createContext<CapturesContextValue | null>(null);

export function CapturesProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseClient();
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [capturesOwnerId, setCapturesOwnerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { session } = useAuth();
  const refreshGeneration = useRef(0);
  const sessionUserId = session?.user.id ?? null;
  const sessionUserIdRef = useRef(sessionUserId);
  sessionUserIdRef.current = sessionUserId;
  const visibleCaptures = useMemo(
    () => getSessionVisibleCaptures(sessionUserId, capturesOwnerId, captures),
    [sessionUserId, capturesOwnerId, captures]
  );

  useEffect(() => {
    setCaptures([]);
    setCapturesOwnerId(null);
    setSyncError(null);
  }, [sessionUserId]);

  const refresh = useCallback(async () => {
    const generation = refreshGeneration.current + 1;
    refreshGeneration.current = generation;
    const requestedOwnerId = session?.user.id ?? null;
    const isCurrentRequest = () => (
      refreshGeneration.current === generation
      && sessionUserIdRef.current === requestedOwnerId
    );

    setIsLoading(true);

    await syncCapturesForSession(session, {
      loadCache: (activeSession) => loadCachedCapturesForSession(activeSession, {
        getCachedOwnerId: getCaptureCacheOwner,
        getCachedCaptures,
      }),
      loadServer: (activeSession) => loadCapturesForSession(activeSession, {
        getServerCaptures: () => supaGetAll(supabase),
        replaceCachedCaptures: replaceAllCaptures,
        clearCachedOwnerId: clearCaptureCacheOwner,
        setCachedOwnerId: setCaptureCacheOwner,
      }),
      onCaptures: (loadedCaptures) => {
        if (!isCurrentRequest()) return;
        setCaptures(loadedCaptures);
        setCapturesOwnerId(requestedOwnerId);
        setIsLoading(false);
      },
      onSyncError: (message) => {
        if (!isCurrentRequest()) return;
        setSyncError(message);
      },
    });

    if (isCurrentRequest()) {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveCapture = useCallback(async (analysis: AnalysisResult, imageUrl: string) => {
    if (!session) {
      Alert.alert('로그인 필요', '캡처를 저장하려면 로그인해주세요.');
      throw new Error('AUTH_REQUIRED');
    }

    const currentCaptureCount = capturesOwnerId === session.user.id ? captures.length : 0;

    try {
      await assertCanSaveCapture({
        userId: session.user.id,
        localCaptureCount: currentCaptureCount,
        maxCaptures: MAX_FREE_CAPTURES,
        countServerCaptures: (userId) => countUserCaptures(supabase, userId),
      });

      if (!imageUrl || imageUrl.startsWith('file://') || imageUrl.startsWith('/')) {
        throw new Error('saveCapture requires an uploaded storage path, not a local file URI.');
      }

      const saved = await supaSave(supabase, analysis, imageUrl, session.user.id);
      const mobileItem = toMobileCapture(saved);
      await dbSaveCapture(analysis, imageUrl);
      setCapturesOwnerId(session.user.id);
      setCaptures((prev) => [mobileItem, ...prev]);
    } catch (error) {
      if (error instanceof CaptureSaveLimitError) {
        Alert.alert('저장 한도 도달', `무료 플랜은 최대 ${MAX_FREE_CAPTURES}개까지 저장할 수 있습니다.`);
        throw error;
      }

      Alert.alert('저장 실패', '인터넷 연결을 확인해주세요.');
      throw error;
    }
  }, [session, captures.length, capturesOwnerId]);

  const deleteCapture = useCallback(async (id: number): Promise<boolean> => {
    const deleted = await deleteCaptureForSession(session, id, {
      deleteServerCapture: (captureId) => supaDelete(supabase, captureId),
      deleteLocalCapture: dbDeleteCapture,
      alertDeleteFailure: () => Alert.alert('삭제 실패', '인터넷 연결을 확인해주세요.'),
    });

    if (deleted) {
      setCaptures((prev) => prev.filter((c) => c.id !== id));
    }

    return deleted;
  }, [session]);

  const searchCaptures = useCallback(async (query: string): Promise<CaptureItem[]> => {
    if (!session) return [];
    return searchVisibleCaptures(query, visibleCaptures);
  }, [visibleCaptures, session]);

  const getCapturesByCategory = useCallback(
    (category: CaptureCategory): CaptureItem[] => {
      return visibleCaptures.filter((c) => c.category === category);
    },
    [visibleCaptures]
  );

  return (
    <CapturesContext.Provider
      value={{
        captures: visibleCaptures,
        isLoading,
        syncError,
        refresh,
        saveCapture,
        deleteCapture,
        searchCaptures,
        getCapturesByCategory,
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
