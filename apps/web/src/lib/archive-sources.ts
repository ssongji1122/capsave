import { safeArchiveUrl } from '@scrave/shared';
export interface ArchiveSourceCandidate { title: string; url: string; status: 'candidate' }
const MAX_CANDIDATES = 4;
const MIN_COMPOUND_QUERY_MATCHES = 2;
const MAX_FEED_BYTES = 512_000;
const SEARCH_TIMEOUT_MS = 8_000;
function decodeXml(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}
export function parseArchiveSourceFeed(xml: string, query: string): ArchiveSourceCandidate[] {
  const tokens = [...new Set(query.toLocaleLowerCase().match(/[가-힣a-z0-9]{2,}/g) ?? [])];
  const requiredMatches = Math.min(MIN_COMPOUND_QUERY_MATCHES, tokens.length);
  const seen = new Set<string>();
  const candidates: ArchiveSourceCandidate[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = decodeXml(match[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    const url = safeArchiveUrl(decodeXml(match[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ''));
    const matchedTokens = tokens.filter(token => title.toLocaleLowerCase().includes(token)).length;
    if (!url || seen.has(url) || requiredMatches === 0 || matchedTokens < requiredMatches) continue;
    seen.add(url); candidates.push({ title, url, status: 'candidate' });
    if (candidates.length === MAX_CANDIDATES) break;
  }
  return candidates;
}
export async function collectArchiveSources(query: string): Promise<ArchiveSourceCandidate[]> {
  const url = new URL('https://www.bing.com/search');
  url.searchParams.set('q', query); url.searchParams.set('format', 'rss');
  const response = await fetch(url, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS), redirect: 'error', cache: 'no-store' });
  if (!response.ok) throw new Error('출처 검색을 완료하지 못했습니다.');
  const reader = response.body?.getReader();
  if (!reader) return [];
  let bytes = 0; let xml = ''; const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_FEED_BYTES) throw new Error('검색 응답이 너무 큽니다.');
      xml += decoder.decode(part.value, { stream: true });
    }
    xml += decoder.decode();
  } finally { await reader.cancel(); }
  return parseArchiveSourceFeed(xml, query);
}
