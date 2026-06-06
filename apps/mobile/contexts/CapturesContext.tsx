import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import {
  CaptureItem,
  replaceAllCaptures,
  deleteCapture as dbDeleteCapture,
  saveCapture as dbSaveCapture,
} from '@/services/database';
import { CaptureCategory, AnalysisResult } from '@/services/ai-analyzer';
import { useAuth } from './AuthContext';
import { supabase } from '@/services/supabase';
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
  loadCapturesForSession,
  searchVisibleCaptures,
  toMobileCapture,
} from '@/services/session-captures';
import {
  assertCanSaveCapture,
  CaptureSaveLimitError,
} from '@/services/mobile-save-capacity';

interface CapturesContextValue {
  captures: CaptureItem[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  saveCapture: (analysis: AnalysisResult, imageUrl: string) => Promise<void>;
  deleteCapture: (id: number) => Promise<boolean>;
  searchCaptures: (query: string) => Promise<CaptureItem[]>;
  getCapturesByCategory: (category: CaptureCategory) => CaptureItem[];
}

const CapturesContext = createContext<CapturesContextValue | null>(null);

export function CapturesProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [capturesOwnerId, setCapturesOwnerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();
  const isRefreshing = useRef(false);
  const sessionUserId = session?.user.id ?? null;
  const visibleCaptures = useMemo(
    () => getSessionVisibleCaptures(sessionUserId, capturesOwnerId, captures),
    [sessionUserId, capturesOwnerId, captures]
  );

  useEffect(() => {
    setCaptures([]);
    setCapturesOwnerId(null);
  }, [sessionUserId]);

  const refresh = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    try {
      setIsLoading(true);

      const mobileItems = await loadCapturesForSession(session, {
        getServerCaptures: () => supaGetAll(supabase),
        replaceCachedCaptures: replaceAllCaptures,
      });
      setCaptures(mobileItems);
      setCapturesOwnerId(session?.user.id ?? null);
    } catch (error) {
      console.error('Failed to load captures:', error);
    } finally {
      setIsLoading(false);
      isRefreshing.current = false;
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
