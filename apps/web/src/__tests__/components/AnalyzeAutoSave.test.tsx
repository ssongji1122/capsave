import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({analyze:vi.fn(),save:vi.fn()}));
vi.mock('@/lib/single-capture-flow',()=>({analyzeSingleCaptureFile:mocks.analyze,saveSingleCaptureFile:mocks.save}));
vi.mock('@/hooks/useModalFocusTrap',()=>({useModalFocusTrap:()=>({current:null})}));
vi.mock('next/image',()=>({default:()=>null}));
import { AnalyzeModal } from '@/components/upload/AnalyzeModal';
const result={category:'text',title:'콘텐츠',summary:'정리',places:[],extractedText:'원문',links:[],tags:[],source:'instagram',sourceAccountId:'someone',confidence:0.9};
beforeEach(()=>{vi.resetAllMocks();URL.createObjectURL=vi.fn().mockReturnValue('blob:preview');URL.revokeObjectURL=vi.fn();mocks.analyze.mockResolvedValue({result,imageUrl:''});mocks.save.mockResolvedValue(undefined);});
afterEach(cleanup);
it('authenticated analysis waits for explicit confirmation before saving exactly once',async()=>{
 const file=new File(['original'],'capture.png',{type:'image/png'});render(<AnalyzeModal file={file} onSave={vi.fn()} onCancel={vi.fn()}/>);
 await screen.findByText('콘텐츠');
 expect(mocks.save).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'확인하고 저장'}));
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));expect(mocks.save.mock.calls[0][0].file).toBe(file);expect(mocks.save.mock.calls[0][0].prepareUploadFile).toBeUndefined();
});
it('guest analysis retains explicit save rather than claiming account persistence',async()=>{
 render(<AnalyzeModal file={new File(['a'],'a.png')} isGuest onSave={vi.fn()} onCancel={vi.fn()}/>);
 await waitFor(()=>expect(mocks.analyze).toHaveBeenCalledTimes(1));expect(mocks.save).not.toHaveBeenCalled();
});

it('saves the corrected result while preserving analysis metadata',async()=>{
 render(<AnalyzeModal file={new File(['a'],'a.png')} onSave={vi.fn()} onCancel={vi.fn()}/>);
 await screen.findByText('콘텐츠');
 fireEvent.click(screen.getByRole('button',{name:'내용 수정'}));
 fireEvent.change(screen.getByLabelText('제목'),{target:{value:'수정한 제목'}});
 fireEvent.change(screen.getByLabelText('요약'),{target:{value:'수정한 요약'}});
 fireEvent.click(screen.getByRole('button',{name:'수정 완료'}));
 fireEvent.click(screen.getByRole('button',{name:'확인하고 저장'}));
 await waitFor(()=>expect(mocks.save).toHaveBeenCalledTimes(1));
 expect(mocks.save.mock.calls[0][0].result).toMatchObject({
  title:'수정한 제목',summary:'수정한 요약',source:'instagram',sourceAccountId:'someone',confidence:0.9,
 });
});

it('keeps the corrected draft visible after a save failure',async()=>{
 mocks.save.mockRejectedValueOnce(new Error('offline'));
 render(<AnalyzeModal file={new File(['a'],'a.png')} onSave={vi.fn()} onCancel={vi.fn()}/>);
 await screen.findByText('콘텐츠');
 fireEvent.click(screen.getByRole('button',{name:'내용 수정'}));
 fireEvent.change(screen.getByLabelText('제목'),{target:{value:'남아야 하는 제목'}});
 fireEvent.click(screen.getByRole('button',{name:'수정 완료'}));
 fireEvent.click(screen.getByRole('button',{name:'확인하고 저장'}));

 expect((await screen.findByRole('alert')).textContent).toContain('수정한 내용은 그대로 남아 있습니다');
 expect(screen.getByText('남아야 하는 제목')).toBeTruthy();
});
