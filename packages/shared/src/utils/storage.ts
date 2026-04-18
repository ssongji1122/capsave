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
