'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCaptures } from '@/contexts/CapturesContext';
import { CaptureList } from '@/components/captures/CaptureList';
import { CaptureItem } from '@scrave/shared';
import { FileText } from 'lucide-react';
import {
  getProtectedCategoryPageModel,
  removeCaptureFromCategoryPage,
} from '@/lib/protected-category-page';

export default function TextsPage() {
  const { getCapturesByCategory, isLoading, deleteCapture, isAuthReady } = useCaptures();
  const [dbCaptures, setDbCaptures] = useState<CaptureItem[]>([]);

  useEffect(() => {
    if (!isAuthReady) return;
    getCapturesByCategory('text').then(setDbCaptures);
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
          <FileText size={22} className="inline text-text-accent mb-0.5" /> 텍스트
        </h1>
        <p className="text-text-secondary text-sm mt-1">AI 정보, 코드, 레시피, 기사</p>
      </div>
      <CaptureList
        captures={pageModel.captures}
        isLoading={pageModel.isLoading}
        onDelete={handleDelete}
        emptyIcon={<FileText size={40} className="text-text-accent" />}
        emptyTitle="저장된 텍스트가 없습니다"
        emptySubtitle={'AI 정보, 코드, 레시피, 기사 스크린샷을\n캡처하면 자동으로 여기에 정리됩니다'}
      />
    </div>
  );
}
