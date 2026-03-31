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
} from '@scrave/shared';
import { createClient } from '@/lib/supabase/browser';

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
    await deleteCaptureQuery(client, id);
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }, [client]);

  const handleSearch = useCallback(async (query: string) => {
    const { items } = await searchCapturesQuery(client, query);
    return items;
  }, [client]);

  const handleGetByCategory = useCallback(async (category: CaptureCategory) => {
    return getCapturesByCategoryQuery(client, category);
  }, [client]);

  const handleSave = useCallback(async (result: AnalysisResult, imageUrl: string) => {
    const newCapture = await saveCaptureQuery(client, result, imageUrl, userId ?? undefined);
    // Attach ephemeral fields from analysis result (not persisted to DB)
    const enriched: CaptureItem = {
      ...newCapture,
      ...(result.keyInsights && { keyInsights: result.keyInsights }),
      ...(result.relatedSearchTerms && { relatedSearchTerms: result.relatedSearchTerms }),
    };
    setCaptures((prev) => [enriched, ...prev]);
  }, [client, userId]);

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
