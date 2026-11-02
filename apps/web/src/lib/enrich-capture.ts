import { createHash } from 'node:crypto';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildArchiveLinks, mapRowToCapture, savedImagePath, canonicalInstagramPost, extractStoragePath, type CaptureRow } from '@scrave/shared';
import { findAndSaveArchiveSources } from './saved-archive-sources';
import { isOwnedCaptureStoragePath } from './storage-ownership';
import { findInstagramOriginal, readBoundedResponse, trustedInstagramImage, type InstagramOriginal } from './instagram-original';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MEDIA_BUDGET_MS = 45_000;
const MAX_LIBRARY_ROWS = 100;
async function storeOriginalImage(client: SupabaseClient, userId: string, post: InstagramOriginal, image: InstagramOriginal['images'][number]): Promise<string> {
  if (!trustedInstagramImage(image.url)) throw new Error('허용되지 않은 이미지 주소입니다.');
  const hash = createHash('sha256').update(`${post.url}:${new URL(image.url).pathname}`).digest('hex');
  const storagePath = `${userId}/originals/${hash}.jpg`;
  const response = await fetch(image.url,{redirect:'error',signal:AbortSignal.timeout(10_000)});
  const bytes = await readBoundedResponse(response,MAX_IMAGE_BYTES);
  const metadata = await sharp(bytes,{limitInputPixels:40_000_000}).metadata();
  const contentTypes: Record<string,string> = {jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
  const contentType = contentTypes[metadata.format ?? '']; if (!contentType) throw new Error('지원하지 않는 원본 이미지입니다.');
  const {error} = await client.storage.from('captures').upload(storagePath,bytes,{contentType,upsert:false});
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return `https://scrave.vercel.app/api/image?path=${encodeURIComponent(storagePath)}`;
}
export async function enrichCaptureSources(client: SupabaseClient, userId: string, captureId: number, deps?: {
  force?: boolean;
  find?: typeof findInstagramOriginal;
  store?: (post: InstagramOriginal, image: InstagramOriginal['images'][number]) => Promise<string>;
}) {
  const {data,error} = await client.from('captures').select('*').eq('id',captureId).eq('user_id',userId).is('deleted_at',null).single();
  if (error || !data) throw new Error('캡처를 찾을 수 없습니다.');
  const capture = mapRowToCapture(data as CaptureRow);
  if (capture.source !== 'instagram') return findAndSaveArchiveSources(client,userId,captureId);
  const savedImages = capture.links.filter(link => savedImagePath(link));
  const savedPost = capture.links.map(canonicalInstagramPost).find(Boolean);
  if (!deps?.force && savedImages.length && savedPost) return {saved:true,links:capture.links,places:capture.places,imageCount:savedImages.length,sourceUrl:savedPost,status:'saved' as const};
  const {data: rows,error: libraryError} = await client.from('captures').select('*').eq('user_id',userId).is('deleted_at',null).limit(MAX_LIBRARY_ROWS);
  if (libraryError) throw libraryError;
  const references = (rows ?? []).map(row => mapRowToCapture(row as CaptureRow));
  const post = capture.source === 'instagram' ? await (deps?.find ?? findInstagramOriginal)(capture,references) : null;
  const links = new Set([...capture.links,...buildArchiveLinks(capture).filter(link=>link.kind==='map').map(link=>link.url)]);
  let imageCount = 0; let partial = false;
  if (post) {
    links.add(post.url);
    const deadline = Date.now()+MEDIA_BUDGET_MS;
    for (const [index,image] of post.images.entries()) {
      const existing = references.find(ref => {
        const ordinal = ref.title.match(/원본\s+(\d+)\/(\d+)/);
        return ordinal && Number(ordinal[1]) === index+1 && Number(ordinal[2]) === post.images.length
          && ref.links.some(link => canonicalInstagramPost(link) === post.url)
          && isOwnedCaptureStoragePath(extractStoragePath(ref.imageUrl ?? ''), userId);
      });
      if (existing) {
        links.add(`https://scrave.vercel.app/api/image?path=${encodeURIComponent(extractStoragePath(existing.imageUrl))}`);
        imageCount++; continue;
      }
      if (Date.now() >= deadline) {partial = true; break;}
      try { links.add(await (deps?.store ?? ((p,i)=>storeOriginalImage(client,userId,p,i)))(post,image)); imageCount++; }
      catch { partial = true; }
    }
  }
  const savedLinks = [...links];
  const {data: updated,error: saveError} = await client.from('captures').update({links:savedLinks})
    .eq('id',captureId).eq('user_id',userId).is('deleted_at',null).eq('links',JSON.stringify(data.links)).select('id');
  if (saveError || !updated?.length) throw new Error('다른 변경이 있어 출처를 저장하지 못했습니다. 다시 시도하십시오.');
  return {saved:true,links:savedLinks,places:capture.places,imageCount,sourceUrl:post?.url ?? null,status:post ? partial ? 'partial' as const : 'matched' as const : 'unresolved' as const};
}
