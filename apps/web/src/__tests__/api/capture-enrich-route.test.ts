// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks=vi.hoisted(()=>({auth:vi.fn(),client:vi.fn(),enrich:vi.fn()}));
vi.mock('@/lib/api-auth',()=>({getAuthUserAndTouch:mocks.auth}));
vi.mock('@/lib/supabase/request-client',()=>({createRequestClient:mocks.client}));
vi.mock('@/lib/enrich-capture',()=>({enrichCaptureSources:mocks.enrich}));
import { POST } from '@/app/api/capture-enrich/route';
const req=(captureId:unknown)=>new NextRequest('https://scrave.vercel.app/api/capture-enrich',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test-token'},body:JSON.stringify({captureId})});
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue({id:'owner'});});
it('rejects unauthenticated callers without starting discovery',async()=>{mocks.auth.mockResolvedValue(null);expect((await POST(req(7))).status).toBe(401);expect(mocks.enrich).not.toHaveBeenCalled();});
it('rejects invalid identifiers without access to storage',async()=>{expect((await POST(req(-1))).status).toBe(400);expect(mocks.client).not.toHaveBeenCalled();});
it('uses the request scoped bearer or cookie client and returns private saved links',async()=>{const scoped={};mocks.client.mockResolvedValue(scoped);mocks.enrich.mockResolvedValue({saved:true,status:'matched',links:['https://instagram.com/p/Test/']});const request=req(7);const res=await POST(request);expect(mocks.client).toHaveBeenCalledWith(request);expect(mocks.enrich).toHaveBeenCalledWith(scoped,'owner',7,{force:false});expect(res.headers.get('cache-control')).toContain('no-store');expect((await res.json()).saved).toBe(true);});
it('preserves a recoverable source error without claiming save succeeded',async()=>{mocks.enrich.mockRejectedValue(new Error('offline'));expect((await POST(req(7))).status).toBe(502);});
