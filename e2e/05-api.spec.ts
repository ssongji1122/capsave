import { test, expect } from '@playwright/test';

/**
 * Flow 5: API 엔드포인트 직접 호출
 * - 인증 없이 보호된 API 호출 시 401/403/400 확인
 * - 게스트 허용 API 응답 구조 확인
 */
test.describe('API 엔드포인트', () => {
  test('POST /api/geocode — body 없이 호출 시 400', async ({ request }) => {
    const res = await request.post('/api/geocode', { data: {}, headers: { 'Content-Type': 'application/json' } });
    expect(res.status()).toBe(400);
  });

  test('POST /api/geocode — 미인증 유효한 장소명은 외부 지오코딩 전에 차단', async ({ request }) => {
    const res = await request.post('/api/geocode', {
      data: { name: '서울시청', address: '서울특별시 중구' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/analyze — body 없이 호출 시 에러', async ({ request }) => {
    const res = await request.post('/api/analyze', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/capture — 미인증 시 401/403', async ({ request }) => {
    const res = await request.post('/api/capture', {
      multipart: {
        file: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake'),
        },
      },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/upload — 미인증 시 401/403', async ({ request }) => {
    const res = await request.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake'),
        },
      },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/analyze-batch — body 없이 호출 시 에러', async ({ request }) => {
    const res = await request.post('/api/analyze-batch', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });
});
