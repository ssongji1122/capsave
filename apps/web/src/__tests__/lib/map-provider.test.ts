import { describe, expect, it } from 'vitest';
import { pickDefaultMapProvider, resolveMapProvider } from '@/lib/map-provider';

const SEOUL = { lat: 37.5665, lng: 126.978 };
const JEJU = { lat: 33.4996, lng: 126.5312 };
const ULUWATU = { lat: -8.8291, lng: 115.0849 };
const TOKYO = { lat: 35.6762, lng: 139.6503 };

describe('pickDefaultMapProvider', () => {
  it('keeps Naver when there is nothing to show yet', () => {
    expect(pickDefaultMapProvider([])).toBe('naver');
  });

  it('keeps Naver when any pin is in Korea', () => {
    expect(pickDefaultMapProvider([SEOUL])).toBe('naver');
    expect(pickDefaultMapProvider([JEJU, ULUWATU])).toBe('naver');
  });

  it('switches to Google when every pin is abroad', () => {
    expect(pickDefaultMapProvider([ULUWATU])).toBe('google');
    expect(pickDefaultMapProvider([ULUWATU, TOKYO])).toBe('google');
  });
});

describe('resolveMapProvider', () => {
  it('keeps the requested provider while its SDK has not failed', () => {
    expect(resolveMapProvider('naver', new Set())).toBe('naver');
    expect(resolveMapProvider('google', new Set(['naver']))).toBe('google');
    expect(resolveMapProvider('archive', new Set(['naver', 'google']))).toBe('archive');
  });

  it('falls back to the archive map when the requested provider failed to authenticate', () => {
    expect(resolveMapProvider('naver', new Set(['naver']))).toBe('archive');
    expect(resolveMapProvider('google', new Set(['google']))).toBe('archive');
  });
});
