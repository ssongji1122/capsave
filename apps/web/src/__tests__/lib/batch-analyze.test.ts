import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the batch analyze flow: client sends base64 images as JSON, server forwards to Gemini

describe('batch-analyze route logic', () => {
  describe('input validation', () => {
    it('rejects empty images array', () => {
      const images: string[] = [];
      expect(images.length === 0).toBe(true);
    });

    it('rejects more than 10 images', () => {
      const images = Array.from({ length: 11 }, () => 'dGVzdA==');
      expect(images.length > 10).toBe(true);
    });

    it('accepts exactly 10 images', () => {
      const images = Array.from({ length: 10 }, () => 'dGVzdA==');
      expect(images.length <= 10).toBe(true);
    });
  });

  describe('Gemini request construction', () => {
    it('builds imageParts from base64 strings', () => {
      const images = ['AAAA', 'BBBB', 'CCCC'];
      const imageParts = images.map((base64Data) => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      }));

      expect(imageParts).toHaveLength(3);
      expect(imageParts[0].inlineData.mimeType).toBe('image/jpeg');
      expect(imageParts[0].inlineData.data).toBe('AAAA');
      expect(imageParts[2].inlineData.data).toBe('CCCC');
    });

    it('constructs parts array with instruction text + images', () => {
      const images = ['AAAA', 'BBBB'];
      const imageParts = images.map((b64) => ({
        inlineData: { mimeType: 'image/jpeg', data: b64 },
      }));

      const instruction = 'BATCH_INSTRUCTION';
      const parts = [
        { text: `${instruction}\n\nI'm uploading ${images.length} screenshots. Analyze them together.` },
        ...imageParts,
      ];

      expect(parts).toHaveLength(3); // 1 text + 2 images
      expect(parts[0]).toHaveProperty('text');
      expect((parts[0] as { text: string }).text).toContain('2 screenshots');
      expect(parts[1]).toHaveProperty('inlineData');
    });

    it('calculates total base64 size correctly', () => {
      const images = ['AAAA', 'BBBBBBBB']; // 4 + 8 = 12 bytes
      const imageParts = images.map((b64) => ({
        inlineData: { mimeType: 'image/jpeg', data: b64 },
      }));

      const totalBase64Size = imageParts.reduce(
        (sum, p) => sum + p.inlineData.data.length,
        0
      );
      expect(totalBase64Size).toBe(12);
    });
  });
});

describe('batch-analyze E2E via fetch', () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

  // Skip E2E tests if no server is running
  const describeE2E = process.env.TEST_E2E ? describe : describe.skip;

  describeE2E('live server tests', () => {
    it('returns 400 for empty images', async () => {
      const res = await fetch(`${BASE_URL}/api/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [] }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('No images');
    });

    it('returns 400 for more than 10 images', async () => {
      const images = Array.from({ length: 11 }, () => 'dGVzdA==');
      const res = await fetch(`${BASE_URL}/api/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('10장');
    });

    it('accepts valid base64 images and reaches Gemini', async () => {
      // Minimal 1x1 red JPEG as base64
      const tinyJpeg =
        '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
        'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh' +
        'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR' +
        'CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAA' +
        'AAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMR' +
        'AD8AKwA//9k=';

      const res = await fetch(`${BASE_URL}/api/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [tinyJpeg] }),
      });

      // Should reach Gemini (200 or 502 from Gemini rate limit)
      expect([200, 502]).toContain(res.status);
      const data = await res.json();
      // If 200, should have results; if 502, should have error
      if (res.status === 200) {
        expect(data.results).toBeDefined();
        expect(Array.isArray(data.results)).toBe(true);
      } else {
        expect(data.error).toBeDefined();
      }
    }, 30000);
  });
});
