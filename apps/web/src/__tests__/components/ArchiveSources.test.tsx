import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ArchiveSources } from '@/components/captures/ArchiveSources';
const capture={category:'text' as const,title:'무선 이어폰 상품',summary:'',extractedText:'',tags:[],links:['https://example.com/product'],places:[]};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('shows source candidates and purchase search without claiming a verified match',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({results:[{title:'제품 공식 안내',url:'https://example.com/info'}]})}));
 render(<ArchiveSources capture={capture} />);
 await screen.findByText('출처 후보 · 제품 공식 안내');
 expect(screen.getByRole('link',{name:/구매·가격 비교 검색/}).getAttribute('href')).toContain('search.shopping.naver.com');
 expect(screen.getByRole('status').textContent).toContain('확인 전');
});
it('keeps the original source and search available after lookup fails',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
 render(<ArchiveSources capture={capture} />);
 await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('완료하지 못했습니다'));
 expect(screen.getByRole('link',{name:/캡처에 연결된 링크/}).getAttribute('href')).toBe('https://example.com/product');
});

it('explains login is required instead of reporting a generic search error',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:401}));
 render(<ArchiveSources capture={capture} />);
 await screen.findByRole('link',{name:'로그인하고 출처 찾기'});
 expect(screen.getByRole('status').textContent).toContain('로그인');
});
