import { describe, it, expect } from 'vitest';
import { getMapLinks, MapProvider } from '../utils/map-linker';

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

  it('each link has label and emoji', () => {
    const links = getMapLinks('test');
    for (const link of links) {
      expect(link.label).toBeTruthy();
      expect(link.emoji).toBeTruthy();
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
});
