import { NextRequest, NextResponse } from 'next/server';
import {
  getMyGuideById,
  softDeleteGuide,
  updateGuide,
} from '@scrave/shared';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { validateUpdateGuidePayload } from '@/lib/guide-persistence';
import { parseJsonBody } from '@/lib/http-json';
import { createRequestClient } from '@/lib/supabase/request-client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const supabase = await createRequestClient(request);
    const guide = await getMyGuideById(supabase, id);
    if (!guide) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ guide });
  } catch (error) {
    console.error('[GET /api/guides/[id]] failed:', error);
    return NextResponse.json({ error: 'Failed to load guide' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.valid) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const validated = validateUpdateGuidePayload(parsedBody.body);
  if (!validated.valid) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const supabase = await createRequestClient(request);
    const updated = await updateGuide(supabase, id, validated.input);
    return NextResponse.json({ guide: updated });
  } catch (error) {
    console.error('[PATCH /api/guides/[id]] failed:', error);
    return NextResponse.json({ error: 'Failed to update guide' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const supabase = await createRequestClient(request);
    await softDeleteGuide(supabase, id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[DELETE /api/guides/[id]] failed:', error);
    return NextResponse.json({ error: 'Failed to delete guide' }, { status: 500 });
  }
}
