import { describe, it, expect } from 'vitest';
import { relatedCaptures, sortCaptures } from '../utils/capture-discovery';
import type { CaptureItem } from '../types/capture';
const make = (id:number, extra:Partial<CaptureItem> = {}):CaptureItem => ({id,category:'text',title:'커피 공부',summary:'',places:[],extractedText:'',links:[],tags:[],source:'instagram',imageUrl:'test.jpg',createdAt:'2026-11-01',userId:null,confidence:1,reclassifiedAt:null,deletedAt:null,sourceAccountId:null,...extra});
describe('capture discovery',()=>{
 it('sorts recent without mutating input and puts invalid timestamps last',()=>{const items=[make(1,{createdAt:'invalid'}),make(2,{createdAt:'2026-10-01'}),make(3)];expect(sortCaptures(items,'recent').map(x=>x.id)).toEqual([3,2,1]);expect(items[0].id).toBe(1);});
 it('orders future explicit dates before past and undated; rejects impossible dates',()=>{const items=[make(1),make(2,{places:[{name:'여행',date:'2026-11-05 20:20'}]}),make(3,{places:[{name:'여행',date:'2026-10-10'}]}),make(4,{places:[{name:'여행',date:'2026-11-03'}]}),make(5,{places:[{name:'여행',date:'2026-02-30'}]})];expect(sortCaptures(items,'upcoming',undefined,'2026-11-01').map(x=>x.id)).toEqual([4,2,3,1,5]);});
 it('requires evidence, excludes self and other categories, explains matching tags',()=>{const anchor=make(1,{tags:['AI','커피']});const related=make(2,{tags:['ai']});const other=make(3,{title:'항공권',tags:['AI']});expect(relatedCaptures(anchor,[anchor,related,other,make(4)])).toEqual([{capture:related,reasons:['같은 태그 · AI'],score:3}]);});
 it('keeps anchor first in relevance mode and uses recent order for unmatched items',()=>{const a=make(1,{tags:['AI']}),b=make(2,{tags:['ai']}),c=make(3);expect(sortCaptures([c,b,a],'related',a).map(x=>x.id)).toEqual([1,2,3]);});
});
