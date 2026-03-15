import React from 'react';
import { CategoryListScreen } from '@/components/CategoryListScreen';

export default function TextsScreen() {
  return (
    <CategoryListScreen
      category="text"
      title="텍스트"
      icon="document-text"
      accentColor={(c) => c.textAccent}
      surfaceColor={(c) => c.textSurface}
      emptyIcon="document-text-outline"
      emptyTitle="저장된 텍스트가 없습니다"
      emptySubtitle={'AI 정보, 코드, 레시피, 기사 스크린샷을\n캡처하면 자동으로 여기에 정리됩니다'}
    />
  );
}
