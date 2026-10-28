import { describe, expect, it } from 'vitest';
import type { CaptureItem } from '@scrave/shared';
import {
  extractCaptureActions,
  isTravelPackCandidate,
  buildGoogleCalendarUrl,
} from '@/lib/capture-actions';

function makeCapture(overrides: Partial<CaptureItem> = {}): CaptureItem {
  return {
    id: 101,
    category: 'text',
    title: '기본 캡처',
    summary: '',
    places: [],
    extractedText: '',
    links: [],
    tags: [],
    source: 'instagram',
    imageUrl: 'data:image/png;base64,aW1hZ2U=',
    createdAt: '2026-10-09T09:00:00.000Z',
    userId: 'user-1',
    confidence: 0.92,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
    ...overrides,
  };
}

describe('extractCaptureActions', () => {
  it('extracts Korean mobile and landline phone numbers from extractedText and summary', () => {
    const item = makeCapture({
      title: '치과 예약 안내',
      summary: '문의 전화 02-555-1234',
      extractedText: '예약 변경은 010-8765-4321 또는 0507-1400-9988로 연락 바랍니다.',
    });

    const actions = extractCaptureActions(item);
    const phoneActions = actions.filter((a) => a.kind === 'phone');

    expect(phoneActions.map((a) => a.value)).toEqual([
      '010-8765-4321',
      '0507-1400-9988',
      '02-555-1234',
    ]);
    expect(phoneActions[0]?.href).toBe('tel:01087654321');
  });

  it('extracts reservation codes and flight numbers without false positives on dates', () => {
    const item = makeCapture({
      title: '발리 항공권 및 숙소 예약 확인서',
      extractedText: '예약번호: KX9482M\n편명 KE629\n체크인: 2026-11-03',
    });

    const actions = extractCaptureActions(item);
    const codeActions = actions.filter((a) => a.kind === 'reservation_code');

    expect(codeActions.map((a) => a.value)).toContain('KX9482M');
    expect(codeActions.map((a) => a.value)).toContain('KE629');
  });

  it('extracts dates and builds a Google Calendar action URL', () => {
    const item = makeCapture({
      title: '서울라이트 DDP 오픈식',
      summary: '동대문디자인플라자 방문 일정',
      extractedText: '일시: 2026-10-28 오후 7시',
    });

    const actions = extractCaptureActions(item);
    const dateAction = actions.find((a) => a.kind === 'date');

    expect(dateAction).toBeDefined();
    expect(dateAction?.value).toBe('2026-10-28');
    expect(dateAction?.href).toContain('calendar.google.com/calendar/render');
    expect(dateAction?.href).toContain('20261028');
  });

  it('extracts addresses from places and links from capture', () => {
    const item = makeCapture({
      category: 'place',
      title: '성수 소바 식당',
      places: [{ name: '성수소바', address: '서울 성동구 연무장길 45', date: '2026-11-01' }],
      links: ['https://catchtable.co.kr/seongsusoba'],
    });

    const actions = extractCaptureActions(item);

    expect(actions.some((a) => a.kind === 'address' && a.value === '서울 성동구 연무장길 45')).toBe(true);
    expect(actions.some((a) => a.kind === 'date' && a.value === '2026-11-01')).toBe(true);
    expect(actions.some((a) => a.kind === 'link' && a.href === 'https://catchtable.co.kr/seongsusoba')).toBe(true);
  });
});

describe('isTravelPackCandidate', () => {
  it('returns true for captures with reservation codes, travel tags, or booking keywords', () => {
    const flight = makeCapture({
      title: '대한항공 탑승권',
      extractedText: '예약번호: AB12CD · 게이트 24',
    });
    const jeju = makeCapture({
      title: '제주 동쪽 숙소 체크인 안내',
      tags: ['제주', '여행준비'],
    });
    const plain = makeCapture({
      title: '타입스크립트 유틸리티 타입 정리',
      extractedText: 'Partial<T>와 Pick<T, K> 비교',
      tags: ['개발', 'TS'],
    });

    expect(isTravelPackCandidate(flight)).toBe(true);
    expect(isTravelPackCandidate(jeju)).toBe(true);
    expect(isTravelPackCandidate(plain)).toBe(false);
  });
});

describe('buildGoogleCalendarUrl', () => {
  it('creates an all-day calendar template link for YYYY-MM-DD', () => {
    const url = buildGoogleCalendarUrl('전시 관람', '2026-11-15', ' 국립현대미술관 ');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('dates=20261115%2F20261116');
    expect(new URL(url).searchParams.get('text')).toBe('전시 관람');
    expect(new URL(url).searchParams.get('details')).toBe('국립현대미술관');
  });
});
