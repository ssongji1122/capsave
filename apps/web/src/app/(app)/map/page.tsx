'use client';

import { Suspense } from 'react';
import { MapView } from '@/components/map/MapView';

export default function MapPage() {
  return (
    <div className="h-screen w-full relative">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">🗺</div>
            <p className="text-text-secondary">지도 로딩 중...</p>
          </div>
        </div>
      }>
        <MapView />
      </Suspense>
    </div>
  );
}
