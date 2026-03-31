export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^bearer\s+(.+)$/i);
  if (!match || !match[1].trim()) return null;
  return match[1].trim();
}
