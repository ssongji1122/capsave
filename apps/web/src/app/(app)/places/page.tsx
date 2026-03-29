'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCaptures } from '@/contexts/CapturesContext';
import { useGuestCaptures } from '@/contexts/GuestCapturesContext';
import { CaptureList } from '@/components/captures/CaptureList';
import { CaptureItem } from '@scrave/shared';

export default function PlacesPage() {
  const { getCapturesByCategory, captures: allCaptures, isLoading, deleteCapture } = useCaptures();
  const { guestCaptures, deleteCapture: deleteGuestCapture } = useGuestCaptures();
  const [dbCaptures, setDbCaptures] = useState<CaptureItem[]>([]);

  useEffect(() => {
    getCapturesByCategory('place').then(setDbCaptures);
  }, [getCapturesByCategory]);

  const guestPlaces = useMemo(
    () => guestCaptures.filter((c) => c.category === 'place'),
    [guestCaptures],
  );

  // Show DB captures if logged in (has any captures), otherwise show guest captures
  const isLoggedIn = allCaptures.length > 0 || dbCaptures.length > 0;
  const captures = isLoggedIn ? dbCaptures : guestPlaces;
  const onDelete = isLoggedIn ? deleteCapture : deleteGuestCapture;

  return (
    <div className="pb-20 lg:pb-8">
      <div className="px-5 pt-8 pb-3 lg:pt-10">
        <h1 className="text-2xl font-extrabold">
          <span className="text-place-accent">📍</span> 장소
        </h1>
        <p className="text-text-secondary text-sm mt-1">맛집, 카페, 여행지</p>
      </div>
      <CaptureList
        captures={captures}
        isLoading={isLoading}
        onDelete={onDelete}
        emptyIcon="📍"
        emptyTitle="저장된 장소가 없습니다"
        emptySubtitle={'맛집, 카페, 여행지 스크린샷을 캡처하면\n자동으로 여기에 정리됩니다'}
      />
    </div>
  );
}
