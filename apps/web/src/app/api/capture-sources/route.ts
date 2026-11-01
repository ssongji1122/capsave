import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { getJsonRecord, parseJsonBody } from '@/lib/http-json';
import { createRequestClient } from '@/lib/supabase/request-client';
import { findAndSaveArchiveSources } from '@/lib/saved-archive-sources';
import { collectArchiveSources } from '@/lib/archive-sources';
const MAX_QUERY_LENGTH = 100;
export async function POST(request: NextRequest) {
  const user = await getAuthUserAndTouch(request);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const parsed = await parseJsonBody(request);
  if (!parsed.valid) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = getJsonRecord(parsed.body);
  if (body.captureId !== undefined) {
    if (!Number.isSafeInteger(body.captureId) || Number(body.captureId) <= 0) return NextResponse.json({ error: '캡처 번호를 확인하십시오.' }, { status: 400 });
    try {
      const result = await findAndSaveArchiveSources(await createRequestClient(request), user.id, Number(body.captureId));
      return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch {
      return NextResponse.json({ error: '출처 검색·저장을 완료하지 못했습니다. 다시 시도하십시오.' }, { status: 502 });
    }
  }
  const query = body.query;
  if (typeof query !== 'string' || query.trim().length < 2 || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: '검색할 이름을 확인하십시오.' }, { status: 400 });
  }
  try {
    const results = await collectArchiveSources(query.trim());
    return NextResponse.json({ results, query, status: 'candidate' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: '출처 검색을 완료하지 못했습니다. 검색 링크를 이용하십시오.' }, { status: 502 });
  }
}
