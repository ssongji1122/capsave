import React from 'react';
import { CategoryListScreen } from '@/components/CategoryListScreen';

export default function PlacesScreen() {
  return (
    <CategoryListScreen
      category="place"
      title="장소"
      icon="location"
      accentColor={(c) => c.placeAccent}
      surfaceColor={(c) => c.placeSurface}
      emptyIcon="location-outline"
      emptyTitle="저장된 장소가 없습니다"
      emptySubtitle={'맛집, 카페, 여행지 스크린샷을 캡처하면\n자동으로 여기에 정리됩니다'}
    />
  );
}
