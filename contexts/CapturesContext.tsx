import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CaptureItem,
  getAllCaptures,
  deleteCapture as dbDeleteCapture,
  searchCaptures as dbSearchCaptures,
} from '@/services/database';
import { CaptureCategory } from '@/services/ai-analyzer';

interface CapturesContextValue {
  captures: CaptureItem[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  deleteCapture: (id: number) => Promise<void>;
  searchCaptures: (query: string) => Promise<CaptureItem[]>;
  getCapturesByCategory: (category: CaptureCategory) => CaptureItem[];
}

const CapturesContext = createContext<CapturesContextValue | null>(null);

export function CapturesProvider({ children }: { children: React.ReactNode }) {
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const items = await getAllCaptures();
      setCaptures(items);
    } catch (error) {
      console.error('Failed to load captures:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteCapture = useCallback(async (id: number) => {
    await dbDeleteCapture(id);
    setCaptures((prev) => prev.filter((c) => c.id !== id));
  }, []);

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
      value={{ captures, isLoading, refresh, deleteCapture, searchCaptures, getCapturesByCategory }}
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
