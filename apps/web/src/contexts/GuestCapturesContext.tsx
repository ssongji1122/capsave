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
} from '@scrave/shared';

const STORAGE_KEY = 'scrave_guest_captures';
const MAX_GUEST_CAPTURES = 3;

interface GuestCapturesContextValue {
  guestCaptures: CaptureItem[];
  remainingSlots: number;
  isGuestFull: boolean;
  addCapture: (result: AnalysisResult, imageBase64: string) => Promise<void>;
  deleteCapture: (id: number) => void;
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

  const addCapture = useCallback(async (result: AnalysisResult, imageBase64: string) => {
    // Compress image to thumbnail for sessionStorage (5MB limit)
    let thumbnail = imageBase64;
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = imageBase64;
      });
      const scale = Math.min(1, 400 / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      thumbnail = canvas.toDataURL('image/jpeg', 0.5);
    } catch {
      // Fallback: use original if resize fails
    }

    setRawCaptures((prev) => {
      const newCapture: GuestCapture = {
        id: getNextGuestId(prev),
        imageBase64: thumbnail,
        title: result.title,
        summary: result.summary,
        category: result.category,
        confidence: result.confidence,
        tags: result.tags,
        places: result.places,
        createdAt: new Date().toISOString(),
        extractedText: result.extractedText || undefined,
        keyInsights: result.keyInsights,
        relatedSearchTerms: result.relatedSearchTerms,
      };
      const updated = addGuestCapture(prev, newCapture, MAX_GUEST_CAPTURES);
      try {
        sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures(updated));
      } catch {
        // sessionStorage full — still keep in-memory state
      }
      return updated;
    });
  }, []);

  const deleteCapture = useCallback((id: number) => {
    setRawCaptures((prev) => {
      const updated = prev.filter((c) => c.id !== id);
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
      value={{ guestCaptures, remainingSlots, isGuestFull, addCapture, deleteCapture, clearCaptures }}
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
