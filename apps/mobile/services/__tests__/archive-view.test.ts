import { selectArchiveCaptures } from '../archive-view';
import { EMPTY_CAPTURE_META } from '../../../../packages/shared/src/utils/capture-intent';
const captures = [
 {id:1,category:'text' as const,title:'카페 구도',summary:'',extractedText:'',places:[],links:[],tags:[],source:'other',imageUri:'file:a',createdAt:'2026-10-30',confidence:null,sourceAccountId:null},
 {id:2,category:'text' as const,title:'항공 예약',summary:'',extractedText:'예약번호: AB12345',places:[],links:[],tags:[],source:'other',imageUri:'file:b',createdAt:'2026-10-30',confidence:null,sourceAccountId:null},
];
it('combines memo search with rediscovery and category filters',()=>{
 const meta = {1:{...EMPTY_CAPTURE_META,note:'제품 촬영 참고',reasons:['reference' as const]}};
 expect(selectArchiveCaptures(captures,meta,{query:'제품 참고',lens:'rediscover',section:'all'}).map(x=>x.id)).toEqual([1]);
 expect(selectArchiveCaptures(captures,meta,{query:'',lens:'travel-pack',section:'all'}).map(x=>x.id)).toEqual([2]);
 expect(selectArchiveCaptures(captures,meta,{query:'없는 메모',lens:'all',section:'all'})).toEqual([]);
});
