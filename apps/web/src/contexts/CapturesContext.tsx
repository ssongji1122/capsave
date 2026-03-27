'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CaptureItem,
  CaptureCategory,
  AnalysisResult,
  createSupabaseClient,
  getAllCaptures,
  getCapturesByCategory as getCapturesByCategoryQuery,
  searchCaptures as searchCapturesQuery,
  saveCapture as saveCaptureQuery,
  deleteCapture as deleteCaptureQuery,
} from '@capsave/shared';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

interface CapturesContextValue {
  captures: CaptureItem[];
  isLoading: boolean;
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
  const [client] = useState(() => {
    const config = getSupabaseConfig();
    if (!config) return null;
    return createSupabaseClient(config.url, config.key);
  });

  const refresh = useCallback(async () => {
    if (!client) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const items = await getAllCaptures(client);
      setCaptures(items);
    } catch (error) {
      console.error('Failed to load captures:', error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (id: number) => {
    if (!client) return;
    await deleteCaptureQuery(client, id);
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }, [client]);

  const handleSearch = useCallback(async (query: string) => {
    if (!client) return [];
    return searchCapturesQuery(client, query);
  }, [client]);

  const handleGetByCategory = useCallback(async (category: CaptureCategory) => {
    if (!client) return [];
    return getCapturesByCategoryQuery(client, category);
  }, [client]);

  const handleSave = useCallback(async (result: AnalysisResult, imageUrl: string) => {
    if (!client) return;
    const newCapture = await saveCaptureQuery(client, result, imageUrl);
    setCaptures((prev) => [newCapture, ...prev]);
  }, [client]);

  return (
    <CapturesContext.Provider
      value={{
        captures,
        isLoading,
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
