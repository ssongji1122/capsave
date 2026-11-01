import { render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({analyze:vi.fn(),save:vi.fn()}));
vi.mock('@/lib/single-capture-flow',()=>({analyzeSingleCaptureFile:mocks.analyze,saveSingleCaptureFile:mocks.save}));
vi.mock('@/hooks/useModalFocusTrap',()=>({useModalFocusTrap:()=>({current:null})}));
vi.mock('next/image',()=>({default:()=>null}));
import { AnalyzeModal } from '@/components/upload/AnalyzeModal';
const result={category:'text',title:'콘텐츠',summary:'정리',places:[],extractedText:'원문',links:[],tags:[],source:'instagram',sourceAccountId:'someone',confidence:0.9};
beforeEach(()=>{vi.resetAllMocks();URL.createObjectURL=vi.fn().mockReturnValue('blob:preview');URL.revokeObjectURL=vi.fn();mocks.analyze.mockResolvedValue({result,imageUrl:''});mocks.save.mockResolvedValue(undefined);});
afterEach(cleanup);
it('authenticated upload automatically saves exactly once without an extra tap, retaining original file',async()=>{
 const file=new File(['original'],'capture.png',{type:'image/png'});render(<AnalyzeModal file={file} onSave={vi.fn()} onCancel={vi.fn()}/>);
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));expect(mocks.save.mock.calls[0][0].file).toBe(file);expect(mocks.save.mock.calls[0][0].prepareUploadFile).toBeUndefined();
});
it('guest analysis retains explicit save rather than claiming account persistence',async()=>{
 render(<AnalyzeModal file={new File(['a'],'a.png')} isGuest onSave={vi.fn()} onCancel={vi.fn()}/>);
 await waitFor(()=>expect(mocks.analyze).toHaveBeenCalledTimes(1));expect(mocks.save).not.toHaveBeenCalled();
});
