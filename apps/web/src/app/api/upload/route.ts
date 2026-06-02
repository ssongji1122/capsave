import { NextRequest, NextResponse } from 'next/server';
import { countUserCaptures, MAX_FREE_CAPTURES } from '@scrave/shared';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { validateUploadFile } from '@/lib/upload-validation';
import { isOwnedCaptureStoragePath } from '@/lib/storage-ownership';

async function checkFreeTierLimit(userId: string): Promise<boolean> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Capture limit service not configured');
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );
  const count = await countUserCaptures(admin, userId);
  return count >= MAX_FREE_CAPTURES;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserAndTouch(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validation = validateUploadFile(file);
    if (!validation.valid) {
      const status = validation.error.includes('5MB') ? 413 : 400;
      return NextResponse.json({ error: validation.error }, { status });
    }

    const atLimit = await checkFreeTierLimit(user.id);
    if (atLimit) {
      return NextResponse.json(
        { error: `무료 플랜 저장 한도(${MAX_FREE_CAPTURES}개)에 도달했습니다` },
        { status: 403 }
      );
    }

    const contentType = file.type;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = contentType.split('/')[1];
    const fileName = `${user.id}/${timestamp}_${random}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = await createClient();

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

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUserAndTouch(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const paths = body?.paths;
    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: 'No paths provided' }, { status: 400 });
    }

    if (!paths.every((path) => isOwnedCaptureStoragePath(path, user.id))) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.storage
      .from('captures')
      .remove(paths);

    if (error) {
      throw error;
    }

    return NextResponse.json({ deleted: paths });
  } catch (error) {
    console.error('Upload cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload cleanup failed' },
      { status: 500 }
    );
  }
}
