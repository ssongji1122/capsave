'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CaptureItem,
  AnalysisResult,
  GuestCapture,
  parseGuestCaptures,
  serializeGuestCaptures,
  addGuestCapture,
  getNextGuestId,
  guestCaptureToItem,
} from '@capsave/shared';

const STORAGE_KEY = 'capsave_guest_captures';
const MAX_GUEST_CAPTURES = 3;

interface GuestCapturesContextValue {
  guestCaptures: CaptureItem[];
  remainingSlots: number;
  isGuestFull: boolean;
  addCapture: (result: AnalysisResult, imageBase64: string) => void;
  clearCaptures: () => void;
}

const GuestCapturesContext = createContext<GuestCapturesContextValue | null>(null);

export function GuestCapturesProvider({ children }: { children: React.ReactNode }) {
  const [rawCaptures, setRawCaptures] = useState<GuestCapture[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    setRawCaptures(parseGuestCaptures(stored));
  }, []);

  const persist = useCallback((captures: GuestCapture[]) => {
    sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures(captures));
    setRawCaptures(captures);
  }, []);

  const addCapture = useCallback((result: AnalysisResult, imageBase64: string) => {
    setRawCaptures((prev) => {
      const newCapture: GuestCapture = {
        id: getNextGuestId(prev),
        imageBase64,
        title: result.title,
        summary: result.summary,
        category: result.category,
        confidence: result.confidence,
        tags: result.tags,
        places: result.places,
        createdAt: new Date().toISOString(),
      };
      const updated = addGuestCapture(prev, newCapture, MAX_GUEST_CAPTURES);
      sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures(updated));
      return updated;
    });
  }, []);

  const clearCaptures = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setRawCaptures([]);
  }, []);

  const guestCaptures = rawCaptures.map(guestCaptureToItem);
  const remainingSlots = MAX_GUEST_CAPTURES - rawCaptures.length;
  const isGuestFull = remainingSlots <= 0;

  return (
    <GuestCapturesContext.Provider
      value={{ guestCaptures, remainingSlots, isGuestFull, addCapture, clearCaptures }}
    >
      {children}
    </GuestCapturesContext.Provider>
  );
}

export function useGuestCaptures() {
  const context = useContext(GuestCapturesContext);
  if (!context) {
    throw new Error('useGuestCaptures must be used within a GuestCapturesProvider');
  }
  return context;
}
