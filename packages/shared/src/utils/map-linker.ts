export type MapProvider = 'naver' | 'google' | 'kakao';

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
      provider: 'naver',
      label: '네이버 지도',
      emoji: '🟢',
      webUrl: `https://map.naver.com/v5/search/${encoded}`,
    },
    {
      provider: 'google',
      label: 'Google Maps',
      emoji: '🔵',
      webUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    },
    {
      provider: 'kakao',
      label: '카카오맵',
      emoji: '🟡',
      webUrl: `https://map.kakao.com/?q=${encoded}`,
    },
  ];
}
