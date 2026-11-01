import { expect, it } from 'vitest';
import { canonicalInstagramPost, groupCapturePosts, captureImages, savedImagePath } from '../utils/capture-gallery';
import type { CaptureItem } from '../types/capture';
const item=(id:number,links:string[]=[],imageUrl=`owner/${id}.jpg`)=>({id,links,imageUrl,title:`card${id}`,places:[],tags:[],category:'text',summary:'',extractedText:'',createdAt:'2026-11-01',source:'instagram',userId:'owner',confidence:null,reclassifiedAt:null,deletedAt:null,sourceAccountId:null} as CaptureItem);
it('groups only identical exact posts, ignoring tracking and profile URLs',()=>{
 const rows=[item(1,['https://instagram.com/p/AbCd/?img_index=2']),item(2,['https://www.instagram.com/p/AbCd/']),item(3,['https://instagram.com/someone/']),item(4,['https://instagram.com/someone/'])];
 const grouped=groupCapturePosts(rows);expect(grouped).toHaveLength(3);expect(captureImages(grouped[0])).toHaveLength(2);
 expect(canonicalInstagramPost('https://evil.com/p/AbCd/')).toBeNull();
 expect(canonicalInstagramPost('https://www.instagram.com/someone/reel/AbCd/')).toBe('https://www.instagram.com/reel/AbCd/');
});
it('retains all summaries, places and originals without mutating or losing member IDs',()=>{
 const a=item(1,['https://instagram.com/p/AbCd/']);const b={...item(2,a.links),summary:'다른 내용',places:[{name:'낙산공원',address:'낙산길 41'}]};
 const group=groupCapturePosts([a,b])[0];expect(group.summary).toContain('다른 내용');expect(group.places).toHaveLength(1);expect(group.gallery?.map(x=>x.captureId)).toEqual([1,2]);expect(a.places).toHaveLength(0);
});
it('recognizes only authenticated first-party image links and deduplicates images',()=>{
 const url='https://scrave.vercel.app/api/image?path=owner%2F2.jpg';
 expect(savedImagePath(url)).toBe('owner/2.jpg');expect(savedImagePath('https://evil.com/api/image?path=owner/2.jpg')).toBeNull();
 expect(captureImages(item(1,[url,url,'https://example.com/a.jpg']))).toHaveLength(2);
});
