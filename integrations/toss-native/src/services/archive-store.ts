import type { ActionableCaptureInput } from '../../../../packages/shared/src/utils/capture-actions';
import type { ArchiveCapture } from '../../../../packages/shared/src/utils/capture-archive';
import { safeArchiveUrl } from '../../../../packages/shared/src/utils/capture-archive';
import { EMPTY_CAPTURE_META, getCaptureMeta, saveCaptureMeta, type CaptureUserMeta } from '../../../../packages/shared/src/utils/capture-intent';

const ARCHIVE_KEY = 'scrave:toss:archive:v1';
const STORAGE_VERSION = 1;
export interface ArchiveStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface SelectedPhoto { id: string; type: 'PHOTO' | 'VIDEO'; dataUri: string }
export interface CaptureDraft { title: string; text: string; sourceUrl: string }
export interface TossCapture extends ArchiveCapture, ActionableCaptureInput {
  id: number;
  imageUri: string;
  albumId: string;
  createdAt: string;
  source: string;
}
export interface ArchiveSnapshot { captures: TossCapture[]; meta: Record<number,CaptureUserMeta> }
interface Document { version: number; captures: TossCapture[]; metadata: Record<string,string> }
export function selectedPhotoUri(photo: SelectedPhoto): string {
  if (photo.type !== 'PHOTO') throw new Error('사진을 선택해 주십시오.');
  const raw = photo.dataUri.replace(/^data:image\/(jpeg|png|webp);base64,/, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw new Error('선택한 사진 데이터를 읽지 못했습니다.');
  const mime = raw.startsWith('/9j/') ? 'jpeg' : raw.startsWith('iVBORw0KGgo') ? 'png' : raw.startsWith('UklGR') ? 'webp' : null;
  if (!mime) throw new Error('JPEG·PNG·WebP 사진을 선택해 주십시오.');
  return `data:image/${mime};base64,${raw}`;
}
function decode(raw: string | null): Document {
  if (raw === null) return {version:STORAGE_VERSION,captures:[],metadata:{}};
  const value = JSON.parse(raw);
  if (value?.version !== STORAGE_VERSION || !Array.isArray(value.captures) ||
    !value.metadata || typeof value.metadata !== 'object' || Array.isArray(value.metadata) ||
    !Object.values(value.metadata).every(item=>typeof item === 'string') ||
    !value.captures.every((c: TossCapture)=>c && Number.isSafeInteger(c.id) && c.id>0 &&
      typeof c.title==='string' && typeof c.summary==='string' && typeof c.extractedText==='string' &&
      typeof c.imageUri==='string' && c.imageUri.startsWith('data:image/') &&
      typeof c.createdAt==='string' && typeof c.albumId==='string' && c.category==='text' &&
      Array.isArray(c.tags) && c.tags.every(x=>typeof x==='string') &&
      Array.isArray(c.links) && c.links.every(x=>typeof x==='string') && Array.isArray(c.places) && c.places.length===0)) {
    throw new Error('저장한 보관함을 읽지 못했습니다. 기존 데이터는 유지합니다.');
  }
  if (new Set(value.captures.map((c:TossCapture)=>c.id)).size!==value.captures.length) throw new Error('보관함 번호를 확인하지 못했습니다.');
  return value;
}
export function createArchiveStore(storage: ArchiveStorage) {
  let document: Document | undefined;
  let loading: Promise<Document> | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const loadDocument = async ():Promise<Document> => {
    if (document) return document;
    if (!loading) loading=storage.getItem(ARCHIVE_KEY).then(raw=>document=decode(raw));
    try {return await loading;}
    finally {loading=undefined;}
  };
  const snapshot = (value: Document): ArchiveSnapshot => ({
    captures:value.captures.map(c=>({...c,tags:[...c.tags],links:[...c.links],places:[...c.places]})),
    meta:Object.fromEntries(value.captures.map(c=>[c.id,getCaptureMeta({getItem:key=>value.metadata[key] ?? null},c.id)])),
  });
  function enqueue<T>(operation:(current:Document)=>Promise<T>): Promise<T> {
    const result=queue.then(async()=>operation(await loadDocument()));
    queue=result.catch(()=>undefined);
    return result;
  }
  const write=async(next:Document)=>{await storage.setItem(ARCHIVE_KEY,JSON.stringify(next));document=next;};
  return {
    load: async ():Promise<ArchiveSnapshot> => {await queue;return snapshot(await loadDocument());},
    add: (photo:SelectedPhoto,draft:CaptureDraft):Promise<TossCapture> => enqueue(async current=>{
      const title=draft.title.trim();
      if (!title) throw new Error('제목을 적어 주십시오.');
      const source=draft.sourceUrl.trim();
      const url=source ? safeArchiveUrl(source) : null;
      if (source && !url) throw new Error('출처는 http 또는 https 주소로 적어 주십시오.');
      const uri=selectedPhotoUri(photo);
      const existing=current.captures.find(c=>c.imageUri===uri);
      if (existing) return {...existing};
      const id=Math.max(0,...current.captures.map(c=>c.id))+1;
      const capture:TossCapture={id,title,summary:'',category:'text',extractedText:draft.text.trim(),
        tags:[],links:url?[url]:[],places:[],source:'other',imageUri:uri,albumId:photo.id,createdAt:new Date().toISOString()};
      await write({...current,captures:[capture,...current.captures]});
      return {...capture};
    }),
    updateMeta:(id:number,change:(meta:CaptureUserMeta)=>CaptureUserMeta):Promise<ArchiveSnapshot> => enqueue(async current=>{
      if (!current.captures.some(c=>c.id===id)) throw new Error('캡처를 찾지 못했습니다.');
      const meta=snapshot(current).meta[id] ?? EMPTY_CAPTURE_META;
      const metadata={...current.metadata};
      if (!saveCaptureMeta({setItem:(key,value)=>{metadata[key]=value;}},id,change(meta))) throw new Error('메모를 저장하지 못했습니다.');
      const next={...current,metadata};await write(next);return snapshot(next);
    }),
  };
}
