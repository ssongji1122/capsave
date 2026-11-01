// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseCaptureImport, saveImportedCapture } from '@/lib/capture-import';
const record = { image: 'data:image/jpeg;base64,/9j/2Q==', analysis: { category:'text',title:'인스타 원본',summary:'정리',extractedText:'본문',tags:['원본'],links:['https://www.instagram.com/p/abc/'],places:[],source:'instagram',confidence:0.8,sourceAccountId:'example' }};
describe('capture import',()=>{
 it('keeps image bytes and attribution without invoking analysis',()=>{
  const [item]=parseCaptureImport({version:1,captures:[record]});
  expect(item.image).toBe(record.image); expect(item.analysis.links).toEqual(record.analysis.links);
 });
 it('rejects executable image formats and malformed fields',()=>{
  expect(()=>parseCaptureImport({version:1,captures:[{...record,image:'data:image/svg+xml;base64,AAAA'}]})).toThrow();
  expect(()=>parseCaptureImport({version:1,captures:[{...record,analysis:{...record.analysis,title:7}}]})).toThrow();
  expect(()=>parseCaptureImport({version:1,captures:Array(51).fill(record)})).toThrow();
 });
 it('preserves original bytes through the existing save compensation flow',async()=>{
  const [item]=parseCaptureImport({version:1,captures:[record]});
  let uploaded=''; let saved='';
  await saveImportedCapture(item,{upload:async file=>{uploaded=Buffer.from(await file.arrayBuffer()).toString('base64'); return 'owner/original.jpg';},save:async(_result,path)=>{saved=path;},cleanup:async()=>{}});
  expect(uploaded).toBe('/9j/2Q=='); expect(saved).toBe('owner/original.jpg');
 });
 it('cleans up only the new upload if row saving fails',async()=>{
  const [item]=parseCaptureImport({version:1,captures:[record]}); let cleaned='';
  await expect(saveImportedCapture(item,{upload:async()=> 'owner/new.jpg',save:async()=>{throw Error('row failure')},cleanup:async path=>{cleaned=path;}})).rejects.toThrow('row failure');
  expect(cleaned).toBe('owner/new.jpg');
 });
});
