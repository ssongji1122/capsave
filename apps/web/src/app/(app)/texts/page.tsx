'use client';

import { useState, useEffect } from 'react';
import { useCaptures } from '@/contexts/CapturesContext';
import { CaptureList } from '@/components/captures/CaptureList';
import { CaptureItem } from '@capsave/shared';

export default function TextsPage() {
  const { getCapturesByCategory, isLoading, deleteCapture } = useCaptures();
  const [captures, setCaptures] = useState<CaptureItem[]>([]);

  useEffect(() => {
    getCapturesByCategory('text').then(setCaptures);
  }, [getCapturesByCategory]);

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
        onDelete={deleteCapture}
        emptyIcon="📝"
        emptyTitle="저장된 텍스트가 없습니다"
        emptySubtitle={'AI 정보, 코드, 레시피, 기사 스크린샷을\n캡처하면 자동으로 여기에 정리됩니다'}
      />
    </div>
  );
}
