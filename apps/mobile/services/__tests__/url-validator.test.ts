import { isUrlSafe, sanitizeUrl } from '../url-validator';

describe('isUrlSafe', () => {
  it('allows https URLs', () => {
    expect(isUrlSafe('https://www.google.com')).toBe(true);
  });

  it('allows http URLs', () => {
    expect(isUrlSafe('http://example.com')).toBe(true);
  });

  it('allows naver map deep links', () => {
    expect(isUrlSafe('nmap://search?query=test')).toBe(true);
  });

  it('allows google maps deep links', () => {
    expect(isUrlSafe('comgooglemaps://?q=test')).toBe(true);
  });

  it('allows geo: scheme', () => {
    expect(isUrlSafe('geo:0,0?q=test')).toBe(true);
  });

  it('blocks tel: scheme', () => {
    expect(isUrlSafe('tel:+1234567890')).toBe(false);
  });

  it('blocks sms: scheme', () => {
    expect(isUrlSafe('sms:+1234567890')).toBe(false);
  });

  it('blocks mailto: scheme', () => {
    expect(isUrlSafe('mailto:test@test.com')).toBe(false);
  });

  it('blocks javascript: scheme', () => {
    expect(isUrlSafe('javascript:alert(1)')).toBe(false);
  });

  it('blocks empty strings', () => {
    expect(isUrlSafe('')).toBe(false);
  });

  it('blocks strings without scheme', () => {
    expect(isUrlSafe('not-a-url')).toBe(false);
  });

  it('handles case-insensitive schemes', () => {
    expect(isUrlSafe('HTTPS://example.com')).toBe(true);
  });

  it('blocks case-insensitive dangerous schemes', () => {
    expect(isUrlSafe('JavaScript:alert(1)')).toBe(false);
  });

  it('handles whitespace-padded URLs', () => {
    expect(isUrlSafe('  https://example.com  ')).toBe(true);
  });

  it('handles null-like inputs gracefully', () => {
    expect(isUrlSafe(null as any)).toBe(false);
    expect(isUrlSafe(undefined as any)).toBe(false);
  });
});

describe('sanitizeUrl', () => {
  it('returns the URL if safe', () => {
    expect(sanitizeUrl('https://google.com')).toBe('https://google.com');
  });

  it('returns null if unsafe', () => {
    expect(sanitizeUrl('tel:123')).toBeNull();
  });
});
