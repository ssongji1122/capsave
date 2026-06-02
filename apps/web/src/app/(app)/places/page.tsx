'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCaptures } from '@/contexts/CapturesContext';
import { CaptureList } from '@/components/captures/CaptureList';
import { CaptureItem } from '@scrave/shared';
import { MapPin } from 'lucide-react';
import {
  getProtectedCategoryPageModel,
  removeCaptureFromCategoryPage,
} from '@/lib/protected-category-page';

export default function PlacesPage() {
  const { getCapturesByCategory, isLoading, deleteCapture, isAuthReady } = useCaptures();
  const [dbCaptures, setDbCaptures] = useState<CaptureItem[]>([]);

  useEffect(() => {
    if (!isAuthReady) return;
    getCapturesByCategory('place').then(setDbCaptures);
  }, [getCapturesByCategory, isAuthReady]);

  const pageModel = getProtectedCategoryPageModel({
    dbCaptures,
    guestCaptures: [],
    isAuthReady,
    isLoading,
  });

  const handleDelete = useCallback(async (id: number) => {
    const deleted = await deleteCapture(id);
    if (!deleted) return;
    setDbCaptures((prev) => removeCaptureFromCategoryPage(prev, id));
  }, [deleteCapture]);

  return (
    <div className="pb-20 lg:pb-8">
      <div className="px-5 pt-8 pb-3 lg:pt-10">
        <h1 className="text-2xl font-extrabold">
          <MapPin size={22} className="inline text-place-accent mb-0.5" /> 장소
        </h1>
        <p className="text-text-secondary text-sm mt-1">맛집, 카페, 여행지</p>
      </div>
      <CaptureList
        captures={pageModel.captures}
        isLoading={pageModel.isLoading}
        onDelete={handleDelete}
        emptyIcon={<MapPin size={40} className="text-place-accent" />}
        emptyTitle="저장된 장소가 없습니다"
        emptySubtitle={'맛집, 카페, 여행지 스크린샷을 캡처하면\n자동으로 여기에 정리됩니다'}
      />
    </div>
  );
}
