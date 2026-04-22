import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserAndTouch } from '@/lib/api-auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserAndTouch(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // File validation
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기가 5MB를 초과합니다.' }, { status: 413 });
    }

    const contentType = file.type;
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ error: '지원하지 않는 파일 형식입니다. (jpeg, png, webp만 가능)' }, { status: 400 });
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = contentType.split('/')[1];
    const fileName = `${user.id}/${timestamp}_${random}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('captures')
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    return NextResponse.json({ path: fileName });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
