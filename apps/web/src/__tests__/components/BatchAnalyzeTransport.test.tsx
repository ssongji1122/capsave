import { cleanup,render,screen,waitFor } from '@testing-library/react';
import { afterEach,it,expect,vi } from 'vitest';
import { BatchAnalyzeModal } from '@/components/upload/BatchAnalyzeModal';
const mocks=vi.hoisted(()=>({prepare:vi.fn()}));
vi.mock('@/lib/batch-analysis-request',async importOriginal=>({...await importOriginal<typeof import('@/lib/batch-analysis-request')>(),prepareBatchAnalysis:mocks.prepare}));
vi.mock('@/hooks/useModalFocusTrap',()=>({useModalFocusTrap:()=>({current:null})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('does not send oversized requests and keeps a readable recovery message',async()=>{
 vi.stubGlobal('URL',class extends URL { static createObjectURL(){return 'blob:preview';} static revokeObjectURL(){} });
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 mocks.prepare.mockRejectedValueOnce(new Error('사진을 나누어 추가해 주세요.'));
 render(<BatchAnalyzeModal files={[new File(['original'],'a.jpg')]} onSave={vi.fn()} onCancel={vi.fn()}/>);
 await waitFor(()=>expect(screen.getByText('사진을 나누어 추가해 주세요.')).toBeTruthy());
 expect(fetch).not.toHaveBeenCalled();
});
it('shows the platform payload limit instead of a generic AI failure',async()=>{
 vi.stubGlobal('URL',class extends URL { static createObjectURL(){return 'blob:preview';} static revokeObjectURL(){} });
 mocks.prepare.mockResolvedValueOnce('{"images":["AAAA"]}');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('Request Entity Too Large',{status:413})));
 render(<BatchAnalyzeModal files={[new File(['original'],'a.jpg')]} onSave={vi.fn()} onCancel={vi.fn()}/>);
 await waitFor(()=>expect(screen.getByText(/전송 용량/)).toBeTruthy());
 expect(screen.queryByText('AI 통합 분석 실패')).toBeNull();
});
