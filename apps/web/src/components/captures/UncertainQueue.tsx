'use client';

import { useState } from 'react';
import { CaptureItem, CaptureCategory, reclassifyCapture } from '@capsave/shared';
import { createClient } from '@/lib/supabase/browser';
import { CaptureCard } from './CaptureCard';

interface UncertainQueueProps {
  captures: CaptureItem[];
  onDelete: (id: number) => void;
}

export function UncertainQueue({ captures, onDelete }: UncertainQueueProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [reclassifying, setReclassifying] = useState<number | null>(null);

  const handleReclassify = async (id: number, category: CaptureCategory) => {
    setReclassifying(id);
    try {
      const client = createClient();
      const capture = captures.find((c) => c.id === id);
      await reclassifyCapture(client, id, category, capture?.places ?? null);
    } finally {
      setReclassifying(null);
    }
  };

  return (
    <div className="mx-4 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-3 rounded-2xl bg-warning/10 border border-warning/20 text-left transition-colors hover:bg-warning/15"
      >
        <span className="text-warning text-sm">⚠️</span>
        <span className="text-sm font-semibold text-warning">
          확인 필요
        </span>
        <span className="text-xs text-warning/70 font-medium ml-1">
          {captures.length}개
        </span>
        <span className={`ml-auto text-warning/50 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {captures.map((item) => (
            <div key={item.id} className="relative">
              <CaptureCard item={item} onDelete={onDelete} />
              {/* Reclassify actions */}
              <div className="flex gap-2 px-4 pb-4 -mt-1">
                <span className="text-xs text-text-tertiary self-center mr-1">분류 변경:</span>
                <button
                  onClick={() => handleReclassify(item.id, 'place')}
                  disabled={reclassifying === item.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-place-border text-place-accent hover:bg-place-surface transition-colors disabled:opacity-50"
                >
                  장소
                </button>
                <button
                  onClick={() => handleReclassify(item.id, 'text')}
                  disabled={reclassifying === item.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-text-border text-text-accent hover:bg-text-surface transition-colors disabled:opacity-50"
                >
                  텍스트
                </button>
              </div>
              {/* Confidence indicator */}
              {item.confidence !== null && (
                <div className="absolute top-3 right-14 px-2 py-0.5 rounded-full bg-warning/15 text-[10px] font-mono text-warning">
                  {Math.round(item.confidence * 100)}%
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
