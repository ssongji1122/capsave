import { useEffect, useState } from 'react';
import { getSignedImageUrl, DEFAULT_SIGNED_URL_EXPIRY } from '@scrave/shared';
import { supabase } from '@/services/supabase';

const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_MS = (DEFAULT_SIGNED_URL_EXPIRY - 600) * 1000;

function passthrough(value: string): boolean {
  return (
    value.startsWith('file://') ||
    value.startsWith('data:') ||
    value.startsWith('http')
  );
}

function getCached(path: string): string | null {
  const hit = cache.get(path);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(path);
    return null;
  }
  return hit.url;
}

export function useSignedImage(pathOrUrl: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!pathOrUrl) return null;
    if (passthrough(pathOrUrl)) return pathOrUrl;
    return getCached(pathOrUrl);
  });

  useEffect(() => {
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }

    if (passthrough(pathOrUrl)) {
      setUrl(pathOrUrl);
      return;
    }

    const cached = getCached(pathOrUrl);
    if (cached) {
      setUrl(cached);
      return;
    }

    let cancelled = false;
    getSignedImageUrl(supabase, pathOrUrl).then((signed) => {
      if (cancelled || !signed) return;
      cache.set(pathOrUrl, { url: signed, expiresAt: Date.now() + TTL_MS });
      setUrl(signed);
    });

    return () => {
      cancelled = true;
    };
  }, [pathOrUrl]);

  return url;
}
