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
const SENTENCE_END_MARKS = '.!?';

// Splits after . ! ? that are followed by whitespace or the end, keeping the original separator.
// A scan instead of a lookbehind regex, because Safari before 16.4 cannot parse lookbehind and would fail the whole bundle.
function splitSentences(text: string): { sentence: string; separator: string }[] {
  const out: { sentence: string; separator: string }[] = [];
  let start = 0;
  let i = 0;
  while (i < text.length) {
    const endsSentence = SENTENCE_END_MARKS.includes(text[i]) && (i + 1 === text.length || /\s/.test(text[i + 1]));
    if (!endsSentence) { i++; continue; }
    let j = i + 1;
    while (j < text.length && /\s/.test(text[j])) j++;
    out.push({ sentence: text.slice(start, i + 1), separator: text.slice(i + 1, j) });
    start = j;
    i = j;
  }
  if (start < text.length) out.push({ sentence: text.slice(start), separator: '' });
  return out;
}

/** Joins summaries as paragraphs, showing each exact sentence once so a notice repeated across a post's images does not stack. */
function uniqueSentences(texts: string[]): string {
  const seen = new Set<string>();
  return texts.map(text => {
    let out = '';
    let separatorBefore = '';
    for (const { sentence, separator } of splitSentences(text)) {
      const key = sentence.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out += (out ? separatorBefore : '') + key;
      separatorBefore = separator || ' ';
    }
    return out;
  }).filter(Boolean).join('\n\n');
}
export function groupCapturePosts(items: CaptureItem[]): CaptureItem[] {
  const groups = new Map<string, CaptureItem>();
  for (const item of items) {
    const posts = [...new Set(item.links.map(canonicalInstagramPost).filter(Boolean))];
    const key = posts.length === 1 ? posts[0]! : `capture:${item.id}`;
    const previous = groups.get(key);
    if (!previous) { groups.set(key, { ...item, summary: uniqueSentences([item.summary]), gallery: captureImages(item) }); continue; }
    const places = [...previous.places, ...item.places];
    groups.set(key, {
      ...previous,
      summary: uniqueSentences([previous.summary, item.summary]),
      extractedText: [...new Set([previous.extractedText, item.extractedText].filter(Boolean))].join('\n\n'),
      places: places.filter((place, index) => places.findIndex(p => p.name === place.name && p.address === place.address) === index),
      links: [...new Set([...previous.links, ...item.links])],
      tags: [...new Set([...previous.tags, ...item.tags])],
      gallery: [...captureImages(previous), ...captureImages(item)].filter((image,index,all) => all.findIndex(i => i.imageUrl === image.imageUrl) === index),
    });
  }
  return [...groups.values()];
}
