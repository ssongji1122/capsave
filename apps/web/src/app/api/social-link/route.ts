import { NextRequest, NextResponse } from 'next/server';
import { canonicalInstagramPost } from '@scrave/shared';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { getJsonRecord, parseJsonBody } from '@/lib/http-json';
import {
  inspectInstagramOriginal,
  readBoundedResponse,
  trustedInstagramImage,
} from '@/lib/instagram-original';
import { buildSocialLinkCaptures } from '@/lib/social-link-intake';

const MAX_LINK_IMAGE_BYTES = 5 * 1024 * 1024;
const LINK_IMAGE_TIMEOUT_MS = 10_000;
const ALLOWED_LINK_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const parsed = await parseJsonBody(request);
  if (!parsed.valid) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { url } = getJsonRecord(parsed.body);
  if (typeof url !== 'string' || url.length > 2_048 || !canonicalInstagramPost(url)) {
    return NextResponse.json(
      { error: '공개 Instagram 게시물 또는 릴스 주소를 확인해 주세요.' },
      { status: 400 }
    );
  }

  try {
    const post = await inspectInstagramOriginal(url);
    const captures = buildSocialLinkCaptures(post);
    return NextResponse.json(
      { post, captures },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === '보존할 공개 미디어를 찾지 못했습니다.') {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    return NextResponse.json(
      { error: '공개 게시물을 불러오지 못했습니다. 주소와 공개 상태를 확인해 주세요.' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const sourceUrl = request.nextUrl.searchParams.get('src') ?? '';
  if (!trustedInstagramImage(sourceUrl)) {
    return NextResponse.json({ error: '지원하지 않는 미디어 주소입니다.' }, { status: 400 });
  }

  try {
    const response = await fetch(sourceUrl, {
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(LINK_IMAGE_TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? '';
    if (!ALLOWED_LINK_IMAGE_TYPES.has(contentType)) {
      return NextResponse.json({ error: '지원하지 않는 미디어 형식입니다.' }, { status: 502 });
    }
    const image = await readBoundedResponse(response, MAX_LINK_IMAGE_BYTES);
    const body = new ArrayBuffer(image.byteLength);
    new Uint8Array(body).set(image);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': contentType,
        'Content-Length': String(image.byteLength),
      },
    });
  } catch {
    return NextResponse.json(
      { error: '공개 미디어를 내려받지 못했습니다. 다시 검사해 주세요.' },
      { status: 502 }
    );
  }
}
