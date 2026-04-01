import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
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
import { supabase } from '@/services/supabase';
import Constants from 'expo-constants';
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

async function uploadImageToSupabase(uri: string, userId: string): Promise<string> {
  const serverUrl = Constants.expoConfig?.extra?.serverUrl;
  if (!serverUrl) {
    throw new Error('서버 URL이 설정되지 않았습니다.');
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const formData = new FormData();
  formData.append('file', {
    uri: manipulated.uri,
    type: 'image/jpeg',
    name: `${Date.now()}.jpg`,
  } as any);

  const response = await fetch(`${serverUrl}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '업로드 실패' }));
    throw new Error(error.error || '이미지 업로드에 실패했습니다.');
  }

  const data = await response.json();
  return data.url;
}

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
      // Upload image to Supabase Storage first
      const uploadedUrl = await uploadImageToSupabase(imageUrl, session.user.id);
      
      const saved = await supaSave(supabase, analysis, uploadedUrl, session.user.id);
      const mobileItem = toMobileCapture(saved);
      await dbSaveCapture(analysis, uploadedUrl);
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
