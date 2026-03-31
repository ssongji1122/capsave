'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCaptures } from '@/contexts/CapturesContext';
import { useGuestCaptures } from '@/contexts/GuestCapturesContext';
import { CaptureList } from '@/components/captures/CaptureList';
import { CaptureItem } from '@scrave/shared';

export default function TextsPage() {
  const { getCapturesByCategory, captures: allCaptures, isLoading, deleteCapture } = useCaptures();
  const { guestCaptures, deleteCapture: deleteGuestCapture } = useGuestCaptures();
  const [dbCaptures, setDbCaptures] = useState<CaptureItem[]>([]);

  useEffect(() => {
    getCapturesByCategory('text').then(setDbCaptures);
  }, [getCapturesByCategory]);

  const guestTexts = useMemo(
    () => guestCaptures.filter((c) => c.category === 'text'),
    [guestCaptures],
  );

  const isLoggedIn = allCaptures.length > 0 || dbCaptures.length > 0;
  const captures = isLoggedIn ? dbCaptures : guestTexts;
  const onDelete = isLoggedIn ? deleteCapture : deleteGuestCapture;

  return (
    <div className="pb-20 lg:pb-8">
      <div className="px-5 pt-8 pb-3 lg:pt-10">
        <h1 className="text-2xl font-extrabold">
          <span className="text-text-accent">📝</span> 텍스트
        </h1>
        <p className="text-text-secondary text-sm mt-1">AI 정보, 코드, 레시피, 기사</p>
      </div>
      <CaptureList
        captures={captures}
        isLoading={isLoading}
        onDelete={onDelete}
        emptyIcon="📝"
        emptyTitle="저장된 텍스트가 없습니다"
        emptySubtitle={'AI 정보, 코드, 레시피, 기사 스크린샷을\n캡처하면 자동으로 여기에 정리됩니다'}
      />
    </div>
  );
}
