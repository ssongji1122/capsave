export type MapProvider = 'tmap' | 'naver' | 'google' | 'kakao';

export interface MapLink {
  provider: MapProvider;
  label: string;
  emoji: string;
  webUrl: string;
}

function encodeQuery(query: string): string {
  return encodeURIComponent(query);
}

export function getMapLinks(placeName: string, address?: string | null): MapLink[] {
  const query = address ? `${placeName} ${address}` : placeName;
  const encoded = encodeQuery(query);
  const placeEncoded = encodeQuery(placeName);

  return [
    {
      provider: 'tmap' as MapProvider,
      label: 'T map',
      emoji: '🔴',
      webUrl: `https://tmap.life/search?query=${encoded}`,
    },
    {
      provider: 'naver' as MapProvider,
      label: '네이버 지도',
      emoji: '🟢',
      webUrl: `https://map.naver.com/v5/search/${encoded}`,
    },
    {
      provider: 'google' as MapProvider,
      label: 'Google Maps',
      emoji: '🔵',
      webUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    },
    {
      provider: 'kakao' as MapProvider,
      label: '카카오맵',
      emoji: '🟡',
      webUrl: `https://map.kakao.com/?q=${encoded}`,
    },
  ];
}
