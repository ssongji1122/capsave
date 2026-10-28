import { NextRequest, NextResponse } from 'next/server';
import {
  MAX_GUIDES_PER_USER,
  listMyGuides,
  saveGuide,
} from '@scrave/shared';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { validateSaveGuidePayload } from '@/lib/guide-persistence';
import { parseJsonBody } from '@/lib/http-json';
import { createRequestClient } from '@/lib/supabase/request-client';

export async function GET(request: NextRequest) {
  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createRequestClient(request);
    const guides = await listMyGuides(supabase);
    return NextResponse.json({ guides, maxGuides: MAX_GUIDES_PER_USER });
  } catch (error) {
    console.error('[GET /api/guides] failed:', error);
    return NextResponse.json({ error: 'Failed to load guides' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.valid) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const validated = validateSaveGuidePayload(parsedBody.body);
  if (!validated.valid) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createRequestClient(request);
    const existing = await listMyGuides(supabase);
    if (existing.length >= MAX_GUIDES_PER_USER) {
      return NextResponse.json(
        { error: 'guide-limit-reached', maxGuides: MAX_GUIDES_PER_USER },
        { status: 422 },
      );
    }

    const saved = await saveGuide(supabase, user.id, validated.input);
    return NextResponse.json({ guide: saved }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/guides] failed:', error);
    return NextResponse.json({ error: 'Failed to save guide' }, { status: 500 });
  }
}
