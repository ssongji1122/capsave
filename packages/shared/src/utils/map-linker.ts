export type MapProvider = 'tmap' | 'naver' | 'google' | 'kakao';

export interface MapLink {
  provider: MapProvider;
  label: string;
  emoji: string;
  webUrl: string;
}

export type ReviewProvider = 'naver' | 'google' | 'kakao';

export interface ReviewLink {
  provider: ReviewProvider;
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

export interface MobileMapLink extends MapLink {
  appUrl: string;
  iosAppUrl?: string; // platform-specific override (Google Maps on iOS uses comgooglemaps://)
}

export function getMobileMapLinks(placeName: string, address?: string | null): MobileMapLink[] {
  const query = address ? `${placeName} ${address}` : placeName;
  const encoded = encodeQuery(query);
  const placeEncoded = encodeQuery(placeName);
  const baseLinks = getMapLinks(placeName, address);

  const appUrlByProvider: Record<MapProvider, { appUrl: string; iosAppUrl?: string }> = {
    tmap:   { appUrl: `tmap://search?name=${placeEncoded}` },
    naver:  { appUrl: `nmap://search?query=${placeEncoded}&appname=com.scrave.app` },
    kakao:  { appUrl: `kakaomap://search?q=${placeEncoded}` },
    google: { appUrl: `geo:0,0?q=${encoded}`, iosAppUrl: `comgooglemaps://?q=${encoded}` },
  };

  return baseLinks.map((link) => ({ ...link, ...appUrlByProvider[link.provider] }));
}

export function getReviewLinks(placeName: string, address?: string | null): ReviewLink[] {
  const query = address ? `${placeName} ${address}` : placeName;
  const encoded = encodeQuery(query);

  return [
    {
      provider: 'naver',
      label: '네이버 리뷰',
      emoji: '🟢',
      webUrl: `https://search.naver.com/search.naver?query=${encoded}+리뷰`,
    },
    {
      provider: 'google',
      label: 'Google 리뷰',
      emoji: '🔵',
      webUrl: `https://www.google.com/search?q=${encoded}+reviews`,
    },
    {
      provider: 'kakao',
      label: '카카오 리뷰',
      emoji: '🟡',
      webUrl: `https://map.kakao.com/?q=${encoded}`,
    },
  ];
}
