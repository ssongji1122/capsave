import { createArchiveStore, type ArchiveStorage } from '../archive-store';
import { EMPTY_CAPTURE_META } from '../../../../../packages/shared/src/utils/capture-intent';
const photo = { id: 'album-1', type: 'PHOTO' as const, dataUri: '/9j/dGVzdA==' };
function memory() {
 const values = new Map<string,string>();
 const storage: ArchiveStorage = {getItem:jest.fn(async key=>values.get(key) ?? null),setItem:jest.fn(async (key,value)=>{values.set(key,value);})};
 return {values,storage};
}
it('saves the selected photo with existing mobile capture fields and reloads the same metadata',async()=>{
 const {storage}=memory();const store=createArchiveStore(storage);
 const capture=await store.add(photo,{title:'호텔 예약',text:'예약번호: AB12345',sourceUrl:'https://example.com/trip'});
 expect(capture.imageUri).toBe('data:image/jpeg;base64,/9j/dGVzdA==');
 await store.updateMeta(capture.id,meta=>({...meta,note:'체크인',revisit:'week'}));
 const reopened=await createArchiveStore(storage).load();
 expect(reopened.captures[0]).toEqual(capture);
 expect(reopened.meta[capture.id]?.note).toBe('체크인');
});
it('keeps the previous snapshot on write failure and allows retry',async()=>{
 const {storage}=memory();const store=createArchiveStore(storage);await store.load();
 (storage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
 await expect(store.add(photo,{title:'여행',text:'',sourceUrl:''})).rejects.toThrow();
 expect((await store.load()).captures).toHaveLength(0);
 await store.add(photo,{title:'여행',text:'',sourceUrl:''});expect((await store.load()).captures).toHaveLength(1);
});
it('serializes simultaneous metadata edits without losing either change',async()=>{
 const {storage}=memory();const store=createArchiveStore(storage);
 const capture=await store.add(photo,{title:'예약',text:'',sourceUrl:''});
 await Promise.all([store.updateMeta(capture.id,m=>({...m,note:'메모'})),store.updateMeta(capture.id,m=>({...m,pinnedToTravelPack:true}))]);
 expect((await store.load()).meta[capture.id]).toEqual(expect.objectContaining({note:'메모',pinnedToTravelPack:true}));
 expect(EMPTY_CAPTURE_META.note).toBe('');
});
it('refuses to overwrite malformed saved data',async()=>{
 const {storage,values}=memory();values.set('scrave:toss:archive:v1','{"captures":null}');
 const store=createArchiveStore(storage);await expect(store.load()).rejects.toThrow();
 await expect(store.add(photo,{title:'보존',text:'',sourceUrl:''})).rejects.toThrow();
 expect(storage.setItem).not.toHaveBeenCalled();
});
it('rejects unsafe source links, missing titles and unsupported image content before writing',async()=>{
 const {storage}=memory();const store=createArchiveStore(storage);
 await expect(store.add(photo,{title:'사진',text:'',sourceUrl:'javascript:alert(1)'})).rejects.toThrow();
 await expect(store.add(photo,{title:' ',text:'',sourceUrl:''})).rejects.toThrow();
 await expect(store.add({...photo,dataUri:'file:///temporary'},{title:'사진',text:'',sourceUrl:''})).rejects.toThrow();
 expect(storage.setItem).not.toHaveBeenCalled();
});
it('reuses identical selected photo rather than adding duplicates',async()=>{
 const {storage}=memory();const store=createArchiveStore(storage);
 const a=await store.add(photo,{title:'사진',text:'',sourceUrl:''});
 const b=await store.add(photo,{title:'사진',text:'',sourceUrl:''});
 expect(a.id).toBe(b.id);expect((await store.load()).captures).toHaveLength(1);
});
it('shares the initial storage read so a late load cannot replace a successful save',async()=>{
 let release:(value:string|null)=>void=()=>{};
 const read=jest.fn(()=>new Promise<string|null>(resolve=>{release=resolve;}));
 const store=createArchiveStore({getItem:read,setItem:async()=>{}});
 const initial=store.load();
 await Promise.resolve();
 const addition=store.add(photo,{title:'새 캡처',text:'',sourceUrl:''});
 await Promise.resolve();
 expect(read).toHaveBeenCalledTimes(1);
 release(null);await initial;await addition;
 expect((await store.load()).captures).toHaveLength(1);
});
