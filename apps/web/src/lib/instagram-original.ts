import { canonicalInstagramPost } from '@scrave/shared';
import { collectArchiveSources } from './archive-sources';
export const MAX_POST_IMAGES = 20;
const MAX_HTML_BYTES = 4 * 1024 * 1024;
const MAX_POST_INSPECTIONS = 3;
const IG_TIMEOUT_MS = 10_000;
interface SourceCapture { sourceAccountId?: string | null; title: string; summary: string; extractedText: string; links: string[]; places: { name: string }[] }
export interface InstagramOriginal { url: string; author: string; caption: string; selectedIndex: number; images: { url: string; kind: 'image' | 'video-preview' }[] }
const generic = new Set(['카페','여행','서울','명소','무료','사진','정보','추천','저장','장소','인스타그램','instagram','reel','카드','콘텐츠']);
const words = (text: string) => [...new Set(text.toLowerCase().match(/[가-힣a-z0-9]{2,}/g) ?? [])].filter(word => !generic.has(word));
const plain = (html: string) => html.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
export function trustedInstagramImage(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && (url.hostname.endsWith('.cdninstagram.com') || url.hostname.endsWith('.fbcdn.net')); } catch { return false; }
}
export async function readBoundedResponse(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.ok || Number(response.headers.get('content-length') ?? 0) > maxBytes) throw new Error('원본 응답을 읽지 못했습니다.');
  const reader = response.body?.getReader(); if (!reader) throw new Error('빈 원본 응답입니다.');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) throw new Error('원본 크기 제한을 초과했습니다.'); chunks.push(value); } }
  finally { await reader.cancel(); }
  const result = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { result.set(chunk,offset); offset += chunk.length; } return result;
}
export function parseInstagramOriginal(value: string, html: string): InstagramOriginal {
  const url = canonicalInstagramPost(value); if (!url) throw new Error('인스타그램 게시물 주소가 아닙니다.');
  const requestedIndex = Number.parseInt(new URL(value).searchParams.get('img_index') ?? '', 10);
  const selectedIndex = Number.isSafeInteger(requestedIndex) && requestedIndex > 0 ? requestedIndex : 1;
  const author = plain(html.match(/data-log-event="captionProfileClick"[^>]*>([^<]+)<\/a>/i)?.[1] ?? '');
  const caption = plain(html.match(/<div class="Caption">([\s\S]*?)<div class="CaptionComments">/i)?.[1] ?? '');
  const images: InstagramOriginal['images'] = []; const seen = new Set<string>();
  for (const match of html.replace(/\\"/g,'"').matchAll(/"is_video":(true|false),"display_url":"((?:\\.|[^"\\])*)"/g)) {
    let imageUrl = ''; try { imageUrl = JSON.parse(`"${match[2]}"`); } catch { continue; }
    // Instagram embeds can encode the JSON string twice. Backslash-slash left in
    // a URL becomes a double path separator and invalidates the CDN signature.
    try { imageUrl = JSON.parse(`"${imageUrl.replaceAll('"', '\\"')}"`); } catch { /* Already decoded. */ }
    imageUrl = imageUrl.replaceAll('\\/', '/');
    if (!trustedInstagramImage(imageUrl)) continue;
    const key = new URL(imageUrl).pathname; if (seen.has(key)) continue;
    seen.add(key); images.push({url:imageUrl,kind:match[1] === 'true' ? 'video-preview' : 'image'});
    if (images.length === MAX_POST_IMAGES) break;
  }
  return { url, author, caption, selectedIndex, images };
}
export function originalMatchesCapture(capture: SourceCapture, post: InstagramOriginal): boolean {
  const account = capture.sourceAccountId?.replace(/^@/,'').toLowerCase();
  if (!post.author || !post.caption || !post.images.length || (account && account !== post.author.toLowerCase())) return false;
  const content = `${capture.title} ${capture.extractedText} ${capture.summary}`;
  const tokens = words(content); const caption = post.caption.toLowerCase();
  const matches = tokens.filter(word => caption.includes(word));
  // An account or generic café wording alone cannot establish a post match.
  return matches.length >= 3 || (matches.length >= 2 && capture.places.some(place => place.name.length >= 3 && caption.includes(place.name.toLowerCase())));
}
export async function inspectInstagramOriginal(url: string): Promise<InstagramOriginal> {
  const canonical = canonicalInstagramPost(url); if (!canonical) throw new Error('지원하지 않는 원본 주소입니다.');
  const response = await fetch(`${canonical}embed/captioned/`, {redirect:'error',cache:'no-store',signal:AbortSignal.timeout(IG_TIMEOUT_MS),headers:{'Accept-Language':'ko-KR,ko;q=0.9,en;q=0.7','User-Agent':'Mozilla/5.0 (compatible; ScraveLinkInspector/1.0; +https://scrave.vercel.app)'}});
  return parseInstagramOriginal(canonical, new TextDecoder().decode(await readBoundedResponse(response,MAX_HTML_BYTES)));
}
export async function findInstagramOriginal(capture: SourceCapture, references: SourceCapture[], search = collectArchiveSources, inspect = inspectInstagramOriginal): Promise<InstagramOriginal | null> {
  const urls = new Set<string>(); let inspected = 0;
  const tryUrls = async (values: string[]) => {
    for (const value of values) {
      const url = canonicalInstagramPost(value); if (!url || urls.has(url) || inspected >= MAX_POST_INSPECTIONS) continue;
      urls.add(url); inspected++;
      try { const post = await inspect(url); if (originalMatchesCapture(capture,post)) return post; } catch { /* Public embeds can be unavailable; retain the screenshot. */ }
    }
    return null;
  };
  const known = references.filter(ref => capture.sourceAccountId && ref.sourceAccountId === capture.sourceAccountId && words(`${capture.title} ${capture.extractedText}`).filter(word => `${ref.title} ${ref.extractedText}`.toLowerCase().includes(word)).length >= 2);
  const local = await tryUrls([...capture.links,...known.flatMap(ref => ref.links)]); if (local) return local;
  const publicText = words(capture.title).slice(0,5).join(' ');
  if (!publicText || inspected >= MAX_POST_INSPECTIONS) return null;
  try {
    const results = await search(`site:instagram.com ${capture.sourceAccountId ?? ''} ${publicText}`.slice(0,100));
    return await tryUrls(results.map(result => result.url));
  } catch { return null; }
}
