import { describe, it, expect } from 'vitest';
import { getMapLinks, getReviewLinks, getMobileMapLinks, MapProvider } from '../utils/map-linker';

describe('getMapLinks', () => {
  it('returns 4 providers', () => {
    const links = getMapLinks('카페');
    expect(links).toHaveLength(4);
    const providers = links.map((l) => l.provider);
    expect(providers).toContain('tmap');
    expect(providers).toContain('naver');
    expect(providers).toContain('google');
    expect(providers).toContain('kakao');
  });

  it('encodes place name in URLs', () => {
    const links = getMapLinks('블루보틀 성수');
    const encoded = encodeURIComponent('블루보틀 성수');

    const tmap = links.find((l) => l.provider === 'tmap')!;
    expect(tmap.webUrl).toContain(encoded);

    const naver = links.find((l) => l.provider === 'naver')!;
    expect(naver.webUrl).toContain(encoded);

    const google = links.find((l) => l.provider === 'google')!;
    expect(google.webUrl).toContain(encoded);

    const kakao = links.find((l) => l.provider === 'kakao')!;
    expect(kakao.webUrl).toContain(encoded);
  });

  it('includes address in query when provided', () => {
    const links = getMapLinks('스타벅스', '강남구 역삼동');
    const encoded = encodeURIComponent('스타벅스 강남구 역삼동');

    for (const link of links) {
      expect(link.webUrl).toContain(encoded);
    }
  });

  it('uses only place name when address is null', () => {
    const links = getMapLinks('맛집', null);
    const encoded = encodeURIComponent('맛집');

    for (const link of links) {
      expect(link.webUrl).toContain(encoded);
    }
  });

  it('each link has label and provider', () => {
    const links = getMapLinks('test');
    for (const link of links) {
      expect(link.label).toBeTruthy();
      expect(link.provider).toBeTruthy();
    }
  });

  it('tmap URL uses tmap.life domain', () => {
    const links = getMapLinks('test');
    const tmap = links.find((l) => l.provider === 'tmap')!;
    expect(tmap.webUrl).toMatch(/^https:\/\/tmap\.life/);
  });

  it('naver URL uses map.naver.com', () => {
    const links = getMapLinks('test');
    const naver = links.find((l) => l.provider === 'naver')!;
    expect(naver.webUrl).toMatch(/^https:\/\/map\.naver\.com/);
  });

  it('google URL uses google.com/maps', () => {
    const links = getMapLinks('test');
    const google = links.find((l) => l.provider === 'google')!;
    expect(google.webUrl).toMatch(/^https:\/\/www\.google\.com\/maps/);
  });

  it('kakao URL uses map.kakao.com', () => {
    const links = getMapLinks('test');
    const kakao = links.find((l) => l.provider === 'kakao')!;
    expect(kakao.webUrl).toMatch(/^https:\/\/map\.kakao\.com/);
  });

  it('handles special characters in place name', () => {
    const links = getMapLinks('카페 & 레스토랑 (강남)');
    for (const link of links) {
      expect(link.webUrl).toBeTruthy();
      expect(() => new URL(link.webUrl)).not.toThrow();
    }
  });

  it('returns only Google Maps for an international place', () => {
    const links = getMapLinks(
      'Single Fin Bali',
      'Pantai Suluban, Pecatu, Bali',
      {
        countryCode: 'ID',
        coordinates: { latitude: -8.814972, longitude: 115.088896 },
      }
    );

    expect(links).toHaveLength(1);
    expect(links[0]?.provider).toBe('google');
    expect(links[0]?.webUrl).toContain(encodeURIComponent('-8.814972,115.088896'));
  });

  it('keeps all Korean providers when country is South Korea', () => {
    const links = getMapLinks('서울시청', '서울 중구', { countryCode: 'KR' });

    expect(links.map((link) => link.provider)).toEqual([
      'tmap',
      'naver',
      'google',
      'kakao',
    ]);
  });
});

describe('getReviewLinks', () => {
  it('returns 3 providers: naver, google, kakao', () => {
    const links = getReviewLinks('스시오마카세');
    expect(links).toHaveLength(3);
    const providers = links.map((l) => l.provider);
    expect(providers).toContain('naver');
    expect(providers).toContain('google');
    expect(providers).toContain('kakao');
  });

  it('encodes place name in URLs', () => {
    const links = getReviewLinks('블루보틀 성수');
    for (const link of links) {
      expect(link.webUrl).toContain(encodeURIComponent('블루보틀 성수'));
    }
  });

  it('includes address in query when provided', () => {
    const links = getReviewLinks('스타벅스', '강남구 역삼동');
    const encoded = encodeURIComponent('스타벅스 강남구 역삼동');
    for (const link of links) {
      expect(link.webUrl).toContain(encoded);
    }
  });

  it('uses only place name when address is null', () => {
    const links = getReviewLinks('맛집', null);
    const encoded = encodeURIComponent('맛집');
    for (const link of links) {
      expect(link.webUrl).toContain(encoded);
    }
  });

  it('each link has label and provider', () => {
    const links = getReviewLinks('test');
    for (const link of links) {
      expect(link.label).toBeTruthy();
      expect(link.provider).toBeTruthy();
    }
  });

  it('naver URL includes 리뷰 search term', () => {
    const links = getReviewLinks('카페');
    const naver = links.find((l) => l.provider === 'naver')!;
    expect(naver.webUrl).toContain('리뷰');
  });

  it('all URLs are valid', () => {
    const links = getReviewLinks('카페 & 레스토랑 (강남)');
    for (const link of links) {
      expect(() => new URL(link.webUrl)).not.toThrow();
    }
  });
});

describe('getMobileMapLinks', () => {
  it('returns 4 entries (tmap, naver, google, kakao)', () => {
    const links = getMobileMapLinks('스타벅스');
    expect(links).toHaveLength(4);
    const providers = links.map((l) => l.provider);
    expect(providers).toContain('tmap');
    expect(providers).toContain('naver');
    expect(providers).toContain('google');
    expect(providers).toContain('kakao');
  });

  it('each link has appUrl populated', () => {
    const links = getMobileMapLinks('카페');
    for (const link of links) {
      expect(link.appUrl).toBeTruthy();
    }
  });

  it('each link has webUrl that matches getMapLinks output', () => {
    const mobileLinks = getMobileMapLinks('블루보틀', '성수동');
    const webLinks = getMapLinks('블루보틀', '성수동');
    for (const webLink of webLinks) {
      const mobileLink = mobileLinks.find((l) => l.provider === webLink.provider)!;
      expect(mobileLink.webUrl).toBe(webLink.webUrl);
    }
  });

  it('tmap appUrl uses tmap://search?name=...', () => {
    const links = getMobileMapLinks('블루보틀');
    const tmap = links.find((l) => l.provider === 'tmap')!;
    expect(tmap.appUrl).toMatch(/^tmap:\/\/search\?name=/);
    expect(tmap.appUrl).toContain(encodeURIComponent('블루보틀'));
  });

  it('naver appUrl uses nmap://search?query=...&appname=com.scrave.app', () => {
    const links = getMobileMapLinks('블루보틀');
    const naver = links.find((l) => l.provider === 'naver')!;
    expect(naver.appUrl).toMatch(/^nmap:\/\/search\?query=/);
    expect(naver.appUrl).toContain('appname=com.scrave.app');
    expect(naver.appUrl).toContain(encodeURIComponent('블루보틀'));
  });

  it('kakao appUrl uses kakaomap://search?q=...', () => {
    const links = getMobileMapLinks('블루보틀');
    const kakao = links.find((l) => l.provider === 'kakao')!;
    expect(kakao.appUrl).toMatch(/^kakaomap:\/\/search\?q=/);
    expect(kakao.appUrl).toContain(encodeURIComponent('블루보틀'));
  });

  it('google appUrl uses geo:0,0?q=... (Android) and iosAppUrl uses comgooglemaps://', () => {
    const links = getMobileMapLinks('블루보틀');
    const google = links.find((l) => l.provider === 'google')!;
    expect(google.appUrl).toMatch(/^geo:0,0\?q=/);
    expect(google.iosAppUrl).toMatch(/^comgooglemaps:\/\//);
    expect(google.iosAppUrl).toContain(encodeURIComponent('블루보틀'));
  });

  it('non-google links have no iosAppUrl', () => {
    const links = getMobileMapLinks('카페');
    const nonGoogle = links.filter((l) => l.provider !== 'google');
    for (const link of nonGoogle) {
      expect(link.iosAppUrl).toBeUndefined();
    }
  });

  it('preserves label from base getMapLinks', () => {
    const mobileLinks = getMobileMapLinks('카페');
    const webLinks = getMapLinks('카페');
    for (const webLink of webLinks) {
      const mobileLink = mobileLinks.find((l) => l.provider === webLink.provider)!;
      expect(mobileLink.label).toBe(webLink.label);
    }
  });

  it('includes address in query when provided', () => {
    const links = getMobileMapLinks('스타벅스', '강남구 역삼동');
    const encoded = encodeURIComponent('스타벅스 강남구 역삼동');

    for (const link of links) {
      expect(link.appUrl).toContain(encoded);
      if (link.iosAppUrl) {
        expect(link.iosAppUrl).toContain(encoded);
      }
    }
  });
});
