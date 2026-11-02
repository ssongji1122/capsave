import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { createRequestClient } from '@/lib/supabase/request-client';
import { getJsonRecord, parseJsonBody } from '@/lib/http-json';
import { enrichCaptureSources } from '@/lib/enrich-capture';
export const maxDuration = 120;
export async function POST(request: NextRequest) {
  const user = await getAuthUserAndTouch(request);
  if (!user) return NextResponse.json({error:'로그인이 필요합니다.'},{status:401});
  const parsed = await parseJsonBody(request);
  if (!parsed.valid) return NextResponse.json({error:parsed.error},{status:400});
  const {captureId,force} = getJsonRecord(parsed.body);
  if (!Number.isSafeInteger(captureId) || Number(captureId)<=0) return NextResponse.json({error:'캡처 번호를 확인하십시오.'},{status:400});
  try {
    return NextResponse.json(await enrichCaptureSources(await createRequestClient(request),user.id,Number(captureId),{force:force === true}),{headers:{'Cache-Control':'private, no-store'}});
  } catch { return NextResponse.json({error:'캡처는 보존했습니다. 원본 찾기·저장을 다시 시도하십시오.'},{status:502}); }
}
