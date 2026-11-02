import type { CaptureItem } from '../types/capture';
export function canonicalInstagramPost(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !['instagram.com', 'www.instagram.com'].includes(url.hostname)) return null;
    const match = url.pathname.match(/^\/(?:[\w.]+\/)?(p|reel)\/([\w-]+)\/?$/);
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/` : null;
  } catch { return null; }
}
/** Saved image links use the authenticated app endpoint rather than expiring CDN URLs. */
export function savedImagePath(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== 'https://scrave.vercel.app' || url.pathname !== '/api/image') return null;
    const path = url.searchParams.get('path');
    return path && !path.includes('..') && !path.includes('\\') && /^[\w-]+\/[\w./-]+$/.test(path) ? path : null;
  } catch { return null; }
}
export function captureImages(item: CaptureItem): NonNullable<CaptureItem['gallery']> {
  const images = item.gallery ?? [{ imageUrl: item.imageUrl, label: '올린 캡처', captureId: item.id }];
  const linked = item.links.flatMap(link => {
    const path = savedImagePath(link);
    return path ? [{ imageUrl: path, label: '게시물 원본', captureId: item.id }] : [];
  });
  const seen = new Set<string>();
  return [...images, ...linked].filter(image => image.imageUrl && !seen.has(image.imageUrl) && Boolean(seen.add(image.imageUrl)));
}
export function groupCapturePosts(items: CaptureItem[]): CaptureItem[] {
  const groups = new Map<string, CaptureItem>();
  for (const item of items) {
    const posts = [...new Set(item.links.map(canonicalInstagramPost).filter(Boolean))];
    const key = posts.length === 1 ? posts[0]! : `capture:${item.id}`;
    const previous = groups.get(key);
    if (!previous) { groups.set(key, { ...item, gallery: captureImages(item) }); continue; }
    const places = [...previous.places, ...item.places];
    groups.set(key, {
      ...previous,
      summary: [...new Set([previous.summary, item.summary].filter(Boolean))].join('\n\n'),
      extractedText: [...new Set([previous.extractedText, item.extractedText].filter(Boolean))].join('\n\n'),
      places: places.filter((place, index) => places.findIndex(p => p.name === place.name && p.address === place.address) === index),
      links: [...new Set([...previous.links, ...item.links])],
      tags: [...new Set([...previous.tags, ...item.tags])],
      gallery: [...captureImages(previous), ...captureImages(item)].filter((image,index,all) => all.findIndex(i => i.imageUrl === image.imageUrl) === index),
    });
  }
  return [...groups.values()];
}
