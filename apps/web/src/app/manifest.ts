import type { MetadataRoute } from 'next';

const APP_BACKGROUND = '#FFFFFF';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scrave',
    short_name: 'Scrave',
    description: '스크린샷을 AI가 자동 분석·분류·정리해주는 캡처 오거나이저',
    lang: 'ko',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: APP_BACKGROUND,
    theme_color: APP_BACKGROUND,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
