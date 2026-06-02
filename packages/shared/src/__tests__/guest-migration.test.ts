import { describe, it, expect } from 'vitest';
import { base64ToBlob, buildMigrationPayload } from '../utils/guest-migration';
import type { GuestCapture } from '../utils/guest-captures';

describe('base64ToBlob', () => {
  it('converts a data URI to a Blob', () => {
    const dataUri = 'data:image/jpeg;base64,/9j/4AAQ';
    const blob = base64ToBlob(dataUri);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
  });

  it('handles PNG data URI', () => {
    const dataUri = 'data:image/png;base64,iVBORw==';
    const blob = base64ToBlob(dataUri);
    expect(blob.type).toBe('image/png');
  });

  it('throws on invalid data URI', () => {
    expect(() => base64ToBlob('not-a-data-uri')).toThrow();
  });
});

describe('buildMigrationPayload', () => {
  const gc: GuestCapture = {
    id: -1,
    imageBase64: 'data:image/jpeg;base64,abc',
    title: 'Test',
    summary: 'Summary',
    category: 'place',
    confidence: 0.85,
    tags: ['food', 'seoul'],
    places: [{ name: 'Restaurant', address: '서울시' }],
    createdAt: '2026-03-28T00:00:00Z',
  };

  it('builds correct payload with user_id and image_url', () => {
    const payload = buildMigrationPayload(gc, 'user-123', 'https://storage.example.com/img.jpg');
    expect(payload.user_id).toBe('user-123');
    expect(payload.image_url).toBe('https://storage.example.com/img.jpg');
    expect(payload.title).toBe('Test');
    expect(payload.category).toBe('place');
    expect(payload.confidence).toBe(0.85);
    expect(payload.tags).toEqual(['food', 'seoul']);
    expect(payload.places).toEqual([{ name: 'Restaurant', address: '서울시' }]);
  });

  it('does not include guest id or imageBase64', () => {
    const payload = buildMigrationPayload(gc, 'user-123', 'https://example.com/img.jpg');
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('imageBase64');
  });

  it('preserves safe guest links in the migration payload', () => {
    const payload = buildMigrationPayload({
      ...gc,
      links: ['https://safe.example/article', 'javascript:alert(1)'],
    }, 'user-123', 'https://example.com/img.jpg');

    expect(payload.links).toEqual(['https://safe.example/article']);
  });

  it('preserves extracted text in the migration payload', () => {
    const payload = buildMigrationPayload({
      ...gc,
      extractedText: '영수증 합계 12000원',
    }, 'user-123', 'https://example.com/img.jpg');

    expect(payload.extracted_text).toBe('영수증 합계 12000원');
  });

  it('preserves source metadata in the migration payload', () => {
    const payload = buildMigrationPayload({
      ...gc,
      source: 'instagram',
      sourceAccountId: '@scrave_user',
    }, 'user-123', 'https://example.com/img.jpg');

    expect(payload.source).toBe('instagram');
    expect(payload.source_account_id).toBe('@scrave_user');
  });
});
