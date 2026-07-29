import { NextRequest, NextResponse } from 'next/server';
import { isGuideReferencePreviewImageUrl } from '@/lib/public-guides';

const PREVIEW_IMAGE_CACHE_SECONDS = 60 * 60 * 24;
const REQUEST_TIMEOUT_MS = 10_000;
const SCRAVE_PREVIEW_USER_AGENT = 'ScraveLinkPreview/1.0';

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get('src');

  if (!sourceUrl || !isGuideReferencePreviewImageUrl(sourceUrl)) {
    return NextResponse.json({ error: 'Invalid preview image' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'user-agent': SCRAVE_PREVIEW_USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Preview image not found' }, { status: 404 });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Preview response is not an image' },
        { status: 502 }
      );
    }

    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        'cache-control': `public, max-age=${PREVIEW_IMAGE_CACHE_SECONDS}, s-maxage=${PREVIEW_IMAGE_CACHE_SECONDS}`,
        'content-type': contentType,
      },
      status: 200,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Preview image request timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Preview image request failed' },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
