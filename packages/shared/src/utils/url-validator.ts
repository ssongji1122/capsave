const ALLOWED_SCHEMES = [
  'https:',
  'http:',
];

export function isUrlSafe(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase().trim();
  return ALLOWED_SCHEMES.some((scheme) => lower.startsWith(scheme));
}

export function sanitizeUrl(url: string): string | null {
  return isUrlSafe(url) ? url : null;
}
