// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { isDataUri, fileToBase64 } from '@/lib/image-utils';

describe('isDataUri', () => {
  it('returns true for data:image URI', () => {
    expect(isDataUri('data:image/jpeg;base64,abc')).toBe(true);
  });

  it('returns true for any data: URI', () => {
    expect(isDataUri('data:text/plain;base64,xyz')).toBe(true);
  });

  it('returns false for http URL', () => {
    expect(isDataUri('https://example.com/image.jpg')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDataUri('')).toBe(false);
  });
});

describe('fileToBase64', () => {
  it('converts a file to base64 data URI', async () => {
    const blob = new Blob(['hello'], { type: 'image/jpeg' });
    const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });
    const result = await fileToBase64(file);
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });
});
