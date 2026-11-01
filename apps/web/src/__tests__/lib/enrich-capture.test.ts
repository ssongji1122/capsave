// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { enrichCaptureSources } from '@/lib/enrich-capture';
function db(row:any, references:any[] = [row]) {
 const writes:any[]=[]; const chain:any={select:()=>chain,eq:()=>chain,is:()=>chain,limit:()=>chain,single:async()=>({data:row,error:null}),update:(value:any)=>{writes.push(value);return chain;},then:(resolve:any)=>Promise.resolve({data:writes.length?[{id:7}]:references,error:null}).then(resolve)};
 return {from:()=>chain,writes};
}
const row={id:7,user_id:'owner',category:'place',title:'낙산공원',summary:'서울 야경',extracted_text:'낙산공원 가을',links:[],tags:[],places:[{name:'낙산공원',address:'서울 종로구 낙산길 41'}],source:'instagram'};
const post={url:'https://www.instagram.com/p/Abcd/',author:'seoulpick._',caption:'낙산공원 서울 야경 가을',images:[{url:'https://scontent.cdninstagram.com/1.jpg',kind:'image' as const}]};
it('saves original and durable image plus map links on the existing single row',async()=>{
 const client=db(row);const store=vi.fn().mockResolvedValue('https://scrave.vercel.app/api/image?path=owner%2Foriginal.jpg');
 const result=await enrichCaptureSources(client as any,'owner',7,{find:vi.fn().mockResolvedValue(post),store});
 expect(result.status).toBe('matched');expect(result.imageCount).toBe(1);expect(client.writes[0].links).toContain(post.url);expect(client.writes[0].links.some((url:string)=>url.includes('google.com/maps'))).toBe(true);
});
it('retains screenshot and marks unresolved rather than inventing an original',async()=>{
 const client=db(row);const store=vi.fn();const result=await enrichCaptureSources(client as any,'owner',7,{find:vi.fn().mockResolvedValue(null),store});
 expect(result.status).toBe('unresolved');expect(store).not.toHaveBeenCalled();expect(client.writes[0].links.some((url:string)=>url.includes('instagram'))).toBe(false);
});
it('does no network or storage work for an inaccessible row',async()=>{
 const find=vi.fn();const store=vi.fn();await expect(enrichCaptureSources(db(null) as any,'other',7,{find,store})).rejects.toThrow();expect(find).not.toHaveBeenCalled();expect(store).not.toHaveBeenCalled();
});
it('reports partial media failure while preserving matched source and screenshot',async()=>{
 const result=await enrichCaptureSources(db(row) as any,'owner',7,{find:vi.fn().mockResolvedValue(post),store:vi.fn().mockRejectedValue(new Error('offline'))});
 expect(result.status).toBe('partial');expect(result.imageCount).toBe(0);expect(result.links).toContain(post.url);
});

it('reuses an already stored original at the same post index instead of duplicating media',async()=>{
 const reference={...row,id:9,title:'서울 · 원본 1/1',image_url:'owner/old.jpg',links:[post.url]};
 const store=vi.fn();const result=await enrichCaptureSources(db(row,[reference]) as any,'owner',7,{find:vi.fn().mockResolvedValue(post),store});
 expect(store).not.toHaveBeenCalled();expect(result.status).toBe('matched');expect(result.links).toContain('https://scrave.vercel.app/api/image?path=owner%2Fold.jpg');
});
