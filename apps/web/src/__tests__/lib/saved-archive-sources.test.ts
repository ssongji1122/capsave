import { expect, it, vi } from 'vitest';
import { findAndSaveArchiveSources } from '@/lib/saved-archive-sources';
function client(row: unknown, saved = true) {
 const single=vi.fn().mockResolvedValue({data:row,error:null});
 const write=vi.fn().mockResolvedValue({data:saved?[{id:7}]:[],error:null});
 const chain:any={select:vi.fn(()=>chain),eq:vi.fn(()=>chain),is:vi.fn(()=>chain),single,update:vi.fn(()=>chain),then:(resolve:any)=>write().then(resolve)};
 return {from:vi.fn(()=>chain),chain};
}
const row={id:7,category:'place',title:'카페',summary:'',extracted_text:'',tags:[],links:['https://instagram.com/p/original/'],places:[{name:'메이르',address:'북한강로 1205'}]};
it('uses owned stored place and preserves original plus candidate and map links',async()=>{
 const db=client(row);const search=vi.fn().mockResolvedValue([{title:'후보',url:'https://example.com/meir',status:'candidate'}]);
 const result=await findAndSaveArchiveSources(db as any,'owner',7,search);
 expect(search).toHaveBeenCalledWith('메이르 북한강로 1205');expect(db.chain.eq).toHaveBeenCalledWith('user_id','owner');
 const links=db.chain.update.mock.calls[0][0].links;
 expect(links).toContain(row.links[0]);expect(links).toContain('https://example.com/meir');expect(links.some((x:string)=>x.includes('google.com/maps'))).toBe(true);expect(result.saved).toBe(true);
});
it('never searches or mutates a missing or inaccessible capture',async()=>{
 const db=client(null);const search=vi.fn();await expect(findAndSaveArchiveSources(db as any,'other',7,search)).rejects.toThrow();expect(search).not.toHaveBeenCalled();expect(db.chain.update).not.toHaveBeenCalled();
});
it('reports a concurrent update rather than overwriting links',async()=>{
 const db=client(row,false);await expect(findAndSaveArchiveSources(db as any,'owner',7,vi.fn().mockResolvedValue([]))).rejects.toThrow();expect(db.chain.eq).toHaveBeenCalledWith('links',JSON.stringify(row.links));
});
