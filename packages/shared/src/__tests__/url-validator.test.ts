import { describe, it, expect } from 'vitest';
import { isUrlSafe, sanitizeUrl, MOBILE_DEEP_LINK_SCHEMES } from '../utils/url-validator';

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

  describe('with extraSchemes', () => {
    it('blocks deep-link schemes by default (no extras)', () => {
      expect(isUrlSafe('nmap://search?q=test')).toBe(false);
      expect(isUrlSafe('tmap://search?name=foo')).toBe(false);
    });

    it('allows nmap when MOBILE_DEEP_LINK_SCHEMES is passed', () => {
      expect(isUrlSafe('nmap://search?q=test', MOBILE_DEEP_LINK_SCHEMES)).toBe(true);
    });

    it('allows tmap when MOBILE_DEEP_LINK_SCHEMES is passed', () => {
      expect(isUrlSafe('tmap://search?name=foo', MOBILE_DEEP_LINK_SCHEMES)).toBe(true);
    });

    it('allows kakaomap, comgooglemaps, geo when extras are passed', () => {
      expect(isUrlSafe('kakaomap://search?q=x', MOBILE_DEEP_LINK_SCHEMES)).toBe(true);
      expect(isUrlSafe('comgooglemaps://?q=x', MOBILE_DEEP_LINK_SCHEMES)).toBe(true);
      expect(isUrlSafe('geo:0,0?q=x', MOBILE_DEEP_LINK_SCHEMES)).toBe(true);
    });

    it('still blocks javascript even when extras are passed (extras add, never override)', () => {
      expect(isUrlSafe('javascript:alert(1)', MOBILE_DEEP_LINK_SCHEMES)).toBe(false);
    });

    it('exports the 5 expected mobile deep-link schemes', () => {
      expect(MOBILE_DEEP_LINK_SCHEMES).toEqual([
        'nmap:',
        'kakaomap:',
        'comgooglemaps:',
        'geo:',
        'tmap:',
      ]);
    });
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
