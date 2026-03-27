'use client';

import { useState, useEffect } from 'react';
import { useCaptures } from '@/contexts/CapturesContext';
import { CaptureList } from '@/components/captures/CaptureList';
import { CaptureItem } from '@capsave/shared';

export default function PlacesPage() {
  const { getCapturesByCategory, isLoading, deleteCapture } = useCaptures();
  const [captures, setCaptures] = useState<CaptureItem[]>([]);

  useEffect(() => {
    getCapturesByCategory('place').then(setCaptures);
  }, [getCapturesByCategory]);

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
        onDelete={deleteCapture}
        emptyIcon="📍"
        emptyTitle="저장된 장소가 없습니다"
        emptySubtitle={'맛집, 카페, 여행지 스크린샷을 캡처하면\n자동으로 여기에 정리됩니다'}
      />
    </div>
  );
}
