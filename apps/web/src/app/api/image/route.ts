import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractStoragePath } from '@scrave/shared';

const SIGNED_URL_EXPIRY = 3600; // 1 hour

export async function GET(request: NextRequest) {
  try {
    const pathParam = request.nextUrl.searchParams.get('path');
    if (!pathParam) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storagePath = extractStoragePath(pathParam);

    const { data, error } = await supabase.storage
      .from('captures')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      console.error('[image-route] Signed URL error:', error);
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error('[image-route] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
