const DEFAULT_SCHEMES = ['https:', 'http:'] as const;

/**
 * Mobile-only deep-link schemes for native map apps. Web callers must NOT include these.
 * Pass to isUrlSafe/sanitizeUrl as the second argument when validating mobile URLs.
 */
export const MOBILE_DEEP_LINK_SCHEMES = [
  'nmap:',
  'kakaomap:',
  'comgooglemaps:',
  'geo:',
  'tmap:',
] as const;

export function isUrlSafe(url: string, extraSchemes: readonly string[] = []): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().trim();
  return [...DEFAULT_SCHEMES, ...extraSchemes].some((scheme) => lower.startsWith(scheme));
}

export function sanitizeUrl(
  url: string,
  extraSchemes: readonly string[] = []
): string | null {
  return isUrlSafe(url, extraSchemes) ? url : null;
}
