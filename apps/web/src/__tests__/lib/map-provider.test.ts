import { describe, expect, it } from 'vitest';
import { pickDefaultMapProvider } from '@/lib/map-provider';

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
