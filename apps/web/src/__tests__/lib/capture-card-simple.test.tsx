import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CaptureCard } from '@/components/captures/CaptureCard';
vi.mock('@/components/stickers/StickerDecoration', () => ({StickerDecoration:()=>null}));
vi.mock('@/components/captures/ArchiveSources', () => ({ArchiveSources:()=> <div>상세 출처</div>}));
vi.mock('@/components/captures/PlaceReviews', () => ({PlaceReviews:()=>null}));
afterEach(cleanup);
it('keeps summary and primary actions visible, with details behind more',()=>{
 const item:any={id:7,title:'낙산공원',summary:'서울 야경 산책',category:'place',imageUrl:'owner/photo.jpg',places:[{name:'낙산공원',address:'서울 종로구 낙산길 41'}],links:[],tags:[],extractedText:'낙산공원',createdAt:'2026-11-01'};
 render(<CaptureCard item={item} onDelete={vi.fn()}/>);
 expect(screen.getByText('서울 야경 산책')).toBeTruthy();
 expect(screen.getByRole('link',{name:'지도 보기'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'원본 보기'})).toBeTruthy();
 expect(screen.queryByText('상세 출처')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'더 보기'}));
 expect(screen.getByText('상세 출처')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'접기'}));
 expect(screen.queryByText('상세 출처')).toBeNull();
});
it('counts source images separately and preserves access to the uploaded capture',()=>{
 const item:any={id:8,title:'게시물',summary:'요약',category:'text',imageUrl:'owner/capture.jpg',places:[],links:['https://scrave.vercel.app/api/image?path=owner%2Foriginal.jpg'],tags:[],extractedText:'',createdAt:'2026-11-01'};
 render(<CaptureCard item={item} onDelete={vi.fn()}/>);
 expect(screen.getByRole('img').getAttribute('alt')).toContain('1/1');
 expect(screen.getByRole('button',{name:'내 캡처 보기'})).toBeTruthy();
});
