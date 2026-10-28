import { describe, expect, it } from 'vitest';
import { classifyArchiveCapture, buildArchiveLinks, ARCHIVE_SECTIONS, buildSourceQuery } from '../utils/capture-archive';
const base = { category: 'text' as const, title: '', summary: '', extractedText: '', tags: [] as string[], links: [] as string[], places: [] as {name:string;address?:string}[] };
describe('capture archive', () => {
 it('keeps four browsing sections without changing persisted categories', () => expect(ARCHIVE_SECTIONS.map(x=>x.id)).toEqual(['shopping','places','questions','travel']));
 it('classifies tickets before places and shopping before generic prices', () => {
  expect(classifyArchiveCapture({...base,title:'항공권',places:[{name:'인천공항'}]})).toBe('travel');
  expect(classifyArchiveCapture({...base,title:'무선 이어폰',extractedText:'상품 배송 옵션 장바구니 29,000원'})).toBe('shopping');
  expect(classifyArchiveCapture({...base,category:'place',title:'카페'})).toBe('places');
  expect(classifyArchiveCapture({...base,title:'사진 촬영 방법'})).toBe('questions');
  expect(classifyArchiveCapture({...base,title:'여행 준비 메모'})).toBe('travel');
 });
 it('rejects unsafe source URLs and labels searches separately', () => {
  const links=buildArchiveLinks({...base,title:'이어폰 상품',links:['javascript:alert(1)','https://example.com/item','https://example.com/item']});
  expect(links.filter(x=>x.kind==='source')).toHaveLength(1);
  expect(links.find(x=>x.kind==='shopping')?.url).toContain('search.shopping.naver.com');
  expect(links.every(x=>/^https?:/.test(x.url))).toBe(true);
 });
 it('preserves exact place names and encodes addresses in map searches', () => {
  const links=buildArchiveLinks({...base,category:'place',places:[{name:'A&B 카페',address:'서울 성동구'}]});
  expect(links.some(x=>x.kind==='map'&&decodeURIComponent(x.url).includes('A&B 카페 서울 성동구'))).toBe(true);
 });
 it('does not send reservation codes, phone numbers or body text as search query', () => {
  const query=buildSourceQuery({...base,title:'예약번호 ABC123 연락처 010-1234-5678',extractedText:'PRIVATE',summary:'private'});
  expect(query).toBe('');
  expect(buildSourceQuery({...base,title:'이어폰 상품',links:['https://example.com/private?token=SECRET']})).not.toContain('SECRET');
 });
});

it('deduplicates map destinations repeated across outbound and return flights',()=>{
 const links=buildArchiveLinks({...base,title:'항공권',places:[{name:'인천국제공항'},{name:'인천국제공항'}]});
 expect(links.filter(x=>x.kind==='map')).toHaveLength(2);
});

it('does not send an old flight timestamp to map search as an address',()=>{
 const links=buildArchiveLinks({...base,title:'항공권',places:[{name:'인천공항',address:'2026-11-05 20:20'}]});
 expect(links.filter(x=>x.kind==='map').every(x=>!decodeURIComponent(x.url).includes('2026-11-05'))).toBe(true);
});
