// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks=vi.hoisted(()=>({auth:vi.fn(),search:vi.fn(),save:vi.fn(),client:vi.fn()}));
vi.mock('@/lib/api-auth',()=>({getAuthUserAndTouch:mocks.auth}));
vi.mock('@/lib/archive-sources',()=>({collectArchiveSources:mocks.search}));
vi.mock('@/lib/supabase/request-client',()=>({createRequestClient:mocks.client}));
vi.mock('@/lib/saved-archive-sources',()=>({findAndSaveArchiveSources:mocks.save}));
import { POST } from '@/app/api/capture-sources/route';
const request=(body:unknown)=>new NextRequest('http://localhost/api/capture-sources',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-token'},body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({id:'user-1'});});
it('rejects unauthenticated callers before a network search',async()=>{mocks.auth.mockResolvedValue(null);expect((await POST(request({query:'카페'}))).status).toBe(401);expect(mocks.search).not.toHaveBeenCalled();});
it('bounds query size',async()=>{expect((await POST(request({query:'a'.repeat(101)}))).status).toBe(400);expect(mocks.search).not.toHaveBeenCalled();});
it('uses existing request authentication and marks results as candidates',async()=>{mocks.search.mockResolvedValue([{title:'카페',url:'https://example.com',status:'candidate'}]);const req=request({query:'카페'});const response=await POST(req);expect(mocks.auth).toHaveBeenCalledWith(req);expect(response.status).toBe(200);expect((await response.json()).status).toBe('candidate');expect(response.headers.get('cache-control')).toContain('no-store');});
it('returns a recoverable failure when search is unavailable',async()=>{mocks.search.mockRejectedValue(new Error('offline'));expect((await POST(request({query:'카페'}))).status).toBe(502);});

it('saves sources with request scoped RLS for a stored capture',async()=>{
 const scoped={};mocks.client.mockResolvedValue(scoped);mocks.save.mockResolvedValue({results:[],saved:true,status:'candidate'});
 const req=request({captureId:7,query:'ignored'});const res=await POST(req);
 expect(mocks.client).toHaveBeenCalledWith(req);expect(mocks.save).toHaveBeenCalledWith(scoped,'user-1',7);expect((await res.json()).saved).toBe(true);
});
it('rejects invalid capture ids without mutation',async()=>{expect((await POST(request({captureId:-1}))).status).toBe(400);expect(mocks.save).not.toHaveBeenCalled();});
