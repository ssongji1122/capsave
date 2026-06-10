import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_STORAGE_PREFIXES = [
  '/storage/v1/object/public/captures/',
  '/storage/v1/object/sign/captures/',
];

export function extractStoragePath(urlOrPath: string): string {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('data:')) return urlOrPath;
  if (!urlOrPath.startsWith('http')) return urlOrPath;

  for (const prefix of SUPABASE_STORAGE_PREFIXES) {
    const idx = urlOrPath.indexOf(prefix);
    if (idx !== -1) {
      const afterPrefix = urlOrPath.slice(idx + prefix.length);
      return afterPrefix.split('?')[0];
    }
  }

  return urlOrPath;
}

export const DEFAULT_SIGNED_URL_EXPIRY = 3600;

export async function getSignedImageUrl(
  client: SupabaseClient,
  pathOrUrl: string | null | undefined,
  options: { bucket?: string; expirySeconds?: number } = {}
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('data:')) return pathOrUrl;
  if (pathOrUrl.startsWith('file://')) return pathOrUrl;
  if (pathOrUrl.startsWith('http')) return pathOrUrl;

  const bucket = options.bucket ?? 'captures';
  const expiry = options.expirySeconds ?? DEFAULT_SIGNED_URL_EXPIRY;
  const path = extractStoragePath(pathOrUrl);

  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiry);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
