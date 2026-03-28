import { describe, it, expect } from 'vitest';
import { isUrlSafe, sanitizeUrl } from '../utils/url-validator';

describe('isUrlSafe', () => {
  it('allows https URLs', () => {
    expect(isUrlSafe('https://example.com')).toBe(true);
  });

  it('allows http URLs', () => {
    expect(isUrlSafe('http://example.com')).toBe(true);
  });

  it('blocks javascript: scheme', () => {
    expect(isUrlSafe('javascript:alert(1)')).toBe(false);
  });

  it('blocks data: scheme', () => {
    expect(isUrlSafe('data:text/html,<h1>hi</h1>')).toBe(false);
  });

  it('blocks tel: scheme', () => {
    expect(isUrlSafe('tel:+1234567890')).toBe(false);
  });

  it('blocks mailto: scheme', () => {
    expect(isUrlSafe('mailto:test@test.com')).toBe(false);
  });

  it('blocks empty string', () => {
    expect(isUrlSafe('')).toBe(false);
  });

  it('handles null-like inputs', () => {
    expect(isUrlSafe(null as unknown as string)).toBe(false);
    expect(isUrlSafe(undefined as unknown as string)).toBe(false);
  });

  it('is case-insensitive for allowed schemes', () => {
    expect(isUrlSafe('HTTPS://example.com')).toBe(true);
    expect(isUrlSafe('Http://example.com')).toBe(true);
  });

  it('is case-insensitive for blocked schemes', () => {
    expect(isUrlSafe('JavaScript:alert(1)')).toBe(false);
  });

  it('handles whitespace-padded URLs', () => {
    expect(isUrlSafe('  https://example.com  ')).toBe(true);
  });

  it('blocks strings without scheme', () => {
    expect(isUrlSafe('not-a-url')).toBe(false);
  });
});

describe('sanitizeUrl', () => {
  it('returns URL when safe', () => {
    expect(sanitizeUrl('https://google.com')).toBe('https://google.com');
  });

  it('returns null when unsafe', () => {
    expect(sanitizeUrl('javascript:void(0)')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(sanitizeUrl('')).toBeNull();
  });
});
