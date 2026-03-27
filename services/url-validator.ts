const ALLOWED_SCHEMES = [
  'https:',
  'http:',
  'nmap:',
  'comgooglemaps:',
  'kakaomap:',
  'geo:',
];

export function isUrlSafe(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  const lower = url.toLowerCase().trim();

  return ALLOWED_SCHEMES.some((scheme) => {
    if (scheme === 'geo:') return lower.startsWith('geo:');
    return lower.startsWith(scheme);
  });
}

export function sanitizeUrl(url: string): string | null {
  return isUrlSafe(url) ? url : null;
}
