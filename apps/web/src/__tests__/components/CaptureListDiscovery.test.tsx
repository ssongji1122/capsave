import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CaptureList } from '@/components/captures/CaptureList';
import { SAMPLE_CAPTURES } from '@/lib/sample-captures';
vi.mock('@/components/captures/CaptureCard',()=>({CaptureCard:({item}:{item:{title:string}})=><h2>{item.title}</h2>}));
afterEach(cleanup);
it('sorts dates and shows only evidenced same-category related originals',()=>{
 const first={...SAMPLE_CAPTURES[0],id:10,title:'기준 카페',tags:['커피'],createdAt:'2026-11-01'};
 const second={...first,id:11,title:'연결 카페',createdAt:'2026-10-01',places:[{name:'카페',date:'2099-11-03'}]};
 render(<CaptureList captures={[first,second]} isLoading={false} onDelete={vi.fn()} emptyIcon={null} emptyTitle="" emptySubtitle=""/>);
 fireEvent.change(screen.getByLabelText('카드 정렬'),{target:{value:'upcoming'}});
 expect(screen.getAllByRole('heading')[0].textContent).toBe('연결 카페');
 fireEvent.change(screen.getByLabelText('카드 정렬'),{target:{value:'related'}});
 expect(screen.getByLabelText('연관 기준 카드')).toBeTruthy();
 expect(screen.getByText(/같은 태그 · 커피/)).toBeTruthy();
 expect(screen.getByAltText('연결 카페 원본')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/연결 카페.*같은 태그/}));
 expect((screen.getByLabelText('연관 기준 카드') as HTMLSelectElement).value).toBe('11');
});
