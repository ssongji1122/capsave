import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
  CaptureItem,
  getAllCaptures as getCachedCaptures,
  replaceAllCaptures,
  deleteCapture as dbDeleteCapture,
  searchCaptures as dbSearchCaptures,
  saveCapture as dbSaveCapture,
} from '@/services/database';
import { CaptureCategory, AnalysisResult } from '@/services/ai-analyzer';
import { useAuth } from './AuthContext';
import { supabase, uploadImageToStorage } from '@/services/supabase';
import {
  getAllCaptures as supaGetAll,
  saveCapture as supaSave,
  deleteCapture as supaDelete,
  mapRowToCapture,
} from '@scrave/shared';

interface CapturesContextValue {
  captures: CaptureItem[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  saveCapture: (analysis: AnalysisResult, imageUrl: string) => Promise<void>;
  deleteCapture: (id: number) => Promise<void>;
  searchCaptures: (query: string) => Promise<CaptureItem[]>;
  getCapturesByCategory: (category: CaptureCategory) => CaptureItem[];
}

const CapturesContext = createContext<CapturesContextValue | null>(null);

/** Map shared CaptureItem to mobile CaptureItem (imageUrl → imageUri) */
function toMobileCapture(item: ReturnType<typeof mapRowToCapture>): CaptureItem {
  return {
    id: item.id,
    category: item.category as CaptureCategory,
    title: item.title,
    summary: item.summary,
    places: item.places,
    extractedText: item.extractedText,
    links: item.links,
    tags: item.tags,
    source: item.source,
    imageUri: item.imageUrl,
    confidence: item.confidence,
    sourceAccountId: item.sourceAccountId,
    createdAt: item.createdAt,
  };
}

export function CapturesProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();
  const isRefreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    try {
      setIsLoading(true);

      // 1. Load cache immediately
      const cached = await getCachedCaptures();
      if (cached.length > 0) {
        setCaptures(cached);
        setIsLoading(false);
      }

      // 2. Fetch from Supabase if authenticated
      if (session) {
        const serverItems = await supaGetAll(supabase);
        const mobileItems = serverItems.map(toMobileCapture);
        setCaptures(mobileItems);
        await replaceAllCaptures(mobileItems);
      }
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
      // Fallback to local-only save
      const id = await dbSaveCapture(analysis, imageUrl);
      const newItem: CaptureItem = {
        id,
        category: analysis.category as CaptureCategory,
        title: analysis.title,
        summary: analysis.summary,
        places: analysis.places,
        extractedText: analysis.extractedText,
        links: analysis.links,
        tags: analysis.tags,
        source: analysis.source,
        imageUri: imageUrl,
        confidence: analysis.confidence,
        sourceAccountId: analysis.sourceAccountId,
        createdAt: new Date().toISOString(),
      };
      setCaptures((prev) => [newItem, ...prev]);
      return;
    }

    try {
      // Before saving to DB, upload image to Storage if it's a local file
      let storagePathOrUri = imageUrl;

      if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('/'))) {
        try {
          storagePathOrUri = await uploadImageToStorage(imageUrl, session.user.id);
        } catch (uploadError) {
          console.error('[CapturesContext] Storage upload failed:', uploadError);
          // Continue with local URI as fallback — image will work on device but not web
        }
      }

      const saved = await supaSave(supabase, analysis, storagePathOrUri, session.user.id);
      const mobileItem = toMobileCapture(saved);
      await dbSaveCapture(analysis, storagePathOrUri);
      setCaptures((prev) => [mobileItem, ...prev]);
    } catch (error) {
      Alert.alert('저장 실패', '인터넷 연결을 확인해주세요.');
      throw error;
    }
  }, [session]);

  const deleteCapture = useCallback(async (id: number) => {
    if (session) {
      try {
        await supaDelete(supabase, id);
      } catch (error) {
        Alert.alert('삭제 실패', '인터넷 연결을 확인해주세요.');
        return;
      }
    }
    await dbDeleteCapture(id);
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }, [session]);

  const searchCaptures = useCallback(async (query: string): Promise<CaptureItem[]> => {
    if (!query) return captures;
    return dbSearchCaptures(query);
  }, [captures]);

  const getCapturesByCategory = useCallback(
    (category: CaptureCategory): CaptureItem[] => {
      return captures.filter((c) => c.category === category);
    },
    [captures]
  );

  return (
    <CapturesContext.Provider
      value={{ captures, isLoading, refresh, saveCapture, deleteCapture, searchCaptures, getCapturesByCategory }}
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
