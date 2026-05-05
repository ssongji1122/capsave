import { NextRequest, NextResponse } from 'next/server';
import {
  SYSTEM_PROMPT,
  BATCH_ANALYSIS_INSTRUCTION,
  parseBatchAnalysisResult,
  AI_MODEL_ENDPOINT,
  countUserCaptures,
  MAX_FREE_CAPTURES,
} from '@scrave/shared';
import { MAX_BATCH_FILES } from '@/lib/constants';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { extractGeminiText } from '@/lib/gemini';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { checkGuestRateLimit, incrementGuestRateLimit } from '@/lib/rate-limit';

async function getRemainingCapacity(userId: string): Promise<number> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return MAX_FREE_CAPTURES; // fail open if key not configured

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );
  const count = await countUserCaptures(admin, userId);
  return Math.max(0, MAX_FREE_CAPTURES - count);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserAndTouch(request);

    if (!user) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const rateLimit = await checkGuestRateLimit(ip);
      if (!rateLimit.allowed) {
        return NextResponse.json({ error: '일일 체험 한도를 초과했습니다' }, { status: 429 });
      }
      await incrementGuestRateLimit(ip);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const images: string[] = body.images;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    if (images.length > MAX_BATCH_FILES) {
      return NextResponse.json({ error: `한번에 최대 ${MAX_BATCH_FILES}장까지 업로드 가능합니다` }, { status: 400 });
    }

    if (user) {
      // Authenticated: enforce free tier limit — reject if no capacity for any image
      const remaining = await getRemainingCapacity(user.id);
      if (remaining === 0) {
        return NextResponse.json(
          { error: `무료 플랜 저장 한도(${MAX_FREE_CAPTURES}개)에 도달했습니다` },
          { status: 403 }
        );
      }
      if (images.length > remaining) {
        return NextResponse.json(
          { error: `저장 가능한 캡처가 ${remaining}개 남았습니다 (요청: ${images.length}개)` },
          { status: 403 }
        );
      }
    }

    // Images are already resized + base64-encoded on the client
    const imageParts = images.map((base64Data) => {
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      };
    });

    // Build Gemini request with multiple images
    const parts = [
      { text: `${BATCH_ANALYSIS_INSTRUCTION}\n\nI'm uploading ${images.length} screenshots. Analyze them together.` },
      ...imageParts,
    ];

    const response = await fetch(
      `${AI_MODEL_ENDPOINT}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 16384,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[batch-analyze] Gemini API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = extractGeminiText(data.candidates);

    if (!content) {
      console.error('[batch-analyze] Empty AI response, raw candidates:', JSON.stringify(data.candidates));
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    const results = parseBatchAnalysisResult(content);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Batch analyze error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch analysis failed' },
      { status: 500 }
    );
  }
}
