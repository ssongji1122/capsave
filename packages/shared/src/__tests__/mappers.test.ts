import { describe, it, expect } from 'vitest';
import { mapRowToCapture, mapCaptureToRow } from '../supabase/mappers';
import { CaptureRow } from '../types/capture';

const FULL_ROW: CaptureRow = {
  id: 1,
  category: 'place',
  title: '강남 맛집',
  summary: '맛집 3곳 정리',
  places: [{ name: '스시오마카세', address: '강남구 역삼동' }],
  extracted_text: '',
  links: ['https://example.com'],
  tags: ['맛집'],
  source: 'instagram',
  image_url: 'https://storage.example.com/img.jpg',
  created_at: '2026-03-28T12:00:00Z',
  user_id: 'user-abc-123',
  confidence: 0.92,
  reclassified_at: null,
  deleted_at: null,
  source_account_id: '@foodie_kr',
};

describe('mapRowToCapture', () => {
  it('maps all fields from snake_case to camelCase', () => {
    const result = mapRowToCapture(FULL_ROW);

    expect(result.id).toBe(1);
    expect(result.category).toBe('place');
    expect(result.title).toBe('강남 맛집');
    expect(result.summary).toBe('맛집 3곳 정리');
    expect(result.places).toEqual([{ name: '스시오마카세', address: '강남구 역삼동' }]);
    expect(result.extractedText).toBe('');
    expect(result.links).toEqual(['https://example.com']);
    expect(result.tags).toEqual(['맛집']);
    expect(result.source).toBe('instagram');
    expect(result.imageUrl).toBe('https://storage.example.com/img.jpg');
    expect(result.createdAt).toBe('2026-03-28T12:00:00Z');
    expect(result.userId).toBe('user-abc-123');
    expect(result.confidence).toBe(0.92);
    expect(result.reclassifiedAt).toBeNull();
    expect(result.deletedAt).toBeNull();
    expect(result.sourceAccountId).toBe('@foodie_kr');
  });

  it('handles null nullable fields', () => {
    const row: CaptureRow = {
      ...FULL_ROW,
      confidence: null,
      deleted_at: null,
      source_account_id: null,
      user_id: null,
      reclassified_at: null,
    };
    const result = mapRowToCapture(row);

    expect(result.confidence).toBeNull();
    expect(result.deletedAt).toBeNull();
    expect(result.sourceAccountId).toBeNull();
    expect(result.userId).toBeNull();
    expect(result.reclassifiedAt).toBeNull();
  });

  it('defaults places to empty array when null', () => {
    const row: CaptureRow = { ...FULL_ROW, places: null as unknown as [] };
    const result = mapRowToCapture(row);
    expect(result.places).toEqual([]);
  });

  it('defaults links and tags to empty arrays when null', () => {
    const row: CaptureRow = {
      ...FULL_ROW,
      links: null as unknown as string[],
      tags: null as unknown as string[],
    };
    const result = mapRowToCapture(row);
    expect(result.links).toEqual([]);
    expect(result.tags).toEqual([]);
  });
});

describe('mapCaptureToRow', () => {
  it('maps all camelCase fields to snake_case', () => {
    const row = mapCaptureToRow({
      category: 'place',
      title: '카페',
      summary: '요약',
      places: [{ name: '블루보틀' }],
      extractedText: 'text',
      links: ['https://a.com'],
      tags: ['커피'],
      source: 'threads',
      imageUrl: 'https://img.com/1.jpg',
      userId: 'user-1',
      confidence: 0.8,
      reclassifiedAt: '2026-03-28T00:00:00Z',
      deletedAt: null,
      sourceAccountId: '@cafe',
    });

    expect(row.category).toBe('place');
    expect(row.title).toBe('카페');
    expect(row.extracted_text).toBe('text');
    expect(row.image_url).toBe('https://img.com/1.jpg');
    expect(row.user_id).toBe('user-1');
    expect(row.confidence).toBe(0.8);
    expect(row.reclassified_at).toBe('2026-03-28T00:00:00Z');
    expect(row.deleted_at).toBeNull();
    expect(row.source_account_id).toBe('@cafe');
  });

  it('excludes undefined fields for partial updates', () => {
    const row = mapCaptureToRow({ title: '새 제목' });

    expect(row.title).toBe('새 제목');
    expect(row).not.toHaveProperty('category');
    expect(row).not.toHaveProperty('summary');
    expect(row).not.toHaveProperty('image_url');
    expect(row).not.toHaveProperty('confidence');
  });

  it('includes explicitly null fields', () => {
    const row = mapCaptureToRow({ deletedAt: null, confidence: null });

    expect(row.deleted_at).toBeNull();
    expect(row.confidence).toBeNull();
  });
});
