import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { buildGuideSlug, createGuideDraft, validateGuideDraftInput } from '@/lib/guide-draft';
import { createGuideModelCaller, getUserCapturesByIds } from '@/lib/guide-draft-sources';
import { parseJsonBody } from '@/lib/http-json';
import { GUIDE_DRAFT_DAILY_LIMIT, consumeGuideDraftLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

/**
 * Builds a guide draft from 2-10 of the signed-in user's place captures.
 * Gemini orders the places and writes relative visit windows; when it is
 * missing or breaks the rules the draft falls back to distance order.
 * Each signed-in user gets GUIDE_DRAFT_DAILY_LIMIT drafts per UTC day,
 * counted just before the model call; requests that fail input checks are
 * not counted. Nothing else is written to the database.
 */
export async function POST(request: NextRequest) {
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.valid) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const input = validateGuideDraftInput(parsedBody.body);
  if (!input.valid) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const captures = await getUserCapturesByIds(supabase, user.id, input.captureIds);
    if (captures.length !== input.captureIds.length) {
      return NextResponse.json({ error: 'Some captures are not available' }, { status: 400 });
    }

    let limit = null as Awaited<ReturnType<typeof consumeGuideDraftLimit>> | null;
    const result = await createGuideDraft(captures, {
      nights: input.nights,
      slug: buildGuideSlug(),
      now: new Date(),
      callModel: createGuideModelCaller(process.env.GEMINI_API_KEY),
      beforeGenerate: async () => {
        limit = await consumeGuideDraftLimit(user.id);
        return limit.allowed;
      },
    });

    if (result.status === 'limited') {
      const { remaining, resetAt } = limit ?? { remaining: 0, resetAt: null };
      return NextResponse.json(
        {
          error: 'daily-limit',
          limit: GUIDE_DRAFT_DAILY_LIMIT,
          remaining,
          resetAt: resetAt?.toISOString() ?? null,
        },
        { status: 429 }
      );
    }

    if (result.status === 'not-enough-places') {
      return NextResponse.json(
        { error: result.status, unresolved: result.unresolved },
        { status: 422 }
      );
    }
    if (result.status === 'too-many-places') {
      return NextResponse.json({ error: result.status }, { status: 422 });
    }

    return NextResponse.json({
      guide: result.guide,
      fallback: result.fallback,
      unresolved: result.unresolved,
      coverImageUrl: captures[0]?.imageUrl ?? null,
    });
  } catch (error) {
    console.error('Guide draft error:', error);
    return NextResponse.json({ error: 'Guide draft failed' }, { status: 500 });
  }
}
