import React from 'react';
import { CategoryScreen } from '@/components/CategoryScreen';

export default function TextsScreen() {
  return (
    <CategoryScreen
      category="text"
      title="텍스트"
      icon="document-text"
      emptyIcon="document-text-outline"
      emptyTitle="저장된 텍스트가 없습니다"
      emptySubtitle={'AI 정보, 코드, 레시피, 기사 스크린샷을\n캡처하면 자동으로 여기에 정리됩니다'}
    />
  );
}
