import React from 'react';
import { CategoryScreen } from '@/components/CategoryScreen';

export default function PlacesScreen() {
  return (
    <CategoryScreen
      category="place"
      title="장소"
      icon="location"
      emptyIcon="location-outline"
      emptyTitle="저장된 장소가 없습니다"
      emptySubtitle={'맛집, 카페, 여행지 스크린샷을 캡처하면\n자동으로 여기에 정리됩니다'}
    />
  );
}
