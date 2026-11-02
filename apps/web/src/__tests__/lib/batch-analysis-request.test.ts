import { describe,it,expect,vi } from 'vitest';
import { prepareBatchAnalysis, batchAnalysisError, BATCH_REQUEST_MAX_BYTES } from '@/lib/batch-analysis-request';
describe('batch analysis transport',()=>{
 it('counts the JSON envelope and reduces analysis copies before sending',async()=>{
  const encode=vi.fn().mockResolvedValueOnce('A'.repeat(BATCH_REQUEST_MAX_BYTES)).mockResolvedValueOnce('AAAA');
  const body=await prepareBatchAnalysis([new File(['original'],'a.jpg')],encode);
  expect(JSON.parse(body).images).toEqual(['AAAA']);expect(encode).toHaveBeenCalledTimes(2);
 });
 it('stops oversized requests without unbounded compression',async()=>{
  const encode=vi.fn().mockResolvedValue('A'.repeat(BATCH_REQUEST_MAX_BYTES));
  await expect(prepareBatchAnalysis([new File(['x'],'a.jpg')],encode)).rejects.toThrow('나누어');
  expect(encode.mock.calls.length).toBe(2);
  for(const [,width,quality] of encode.mock.calls) {expect(width).toBe(2048);expect(quality).toBeGreaterThanOrEqual(0.85);}
 });
 it('preserves quality when the first request fits',async()=>{
  const encode=vi.fn().mockResolvedValue('AAAA');expect(JSON.parse(await prepareBatchAnalysis([new File(['x'],'a.jpg')],encode)).images).toEqual(['AAAA']);expect(encode).toHaveBeenCalledTimes(1);
 });
 it('explains plaintext platform failures',async()=>{
  expect(await batchAnalysisError(new Response('FUNCTION_PAYLOAD_TOO_LARGE',{status:413}))).toContain('용량');
  expect(await batchAnalysisError(new Response('timeout',{status:504}))).toContain('시간');
  expect(await batchAnalysisError(new Response(JSON.stringify({error:'일일 체험 한도를 초과했습니다'}),{status:429}))).toContain('체험 한도');
 });
});
