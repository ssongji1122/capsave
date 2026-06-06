import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT, parseAnalysisResult, AI_MODEL_ENDPOINT, countUserCaptures, MAX_FREE_CAPTURES } from '@scrave/shared';
import { extractGeminiText } from '@/lib/gemini';
import { consumeGuestRateLimit } from '@/lib/rate-limit';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { ANALYZE_IMAGE_SIZE_ERROR, validateAnalyzeImageInput } from '@/lib/analyze-input';
import { createPendingAnalysisResult, shouldReturnPendingAnalysis } from '@/lib/analysis-fallback';
import { getJsonRecord, parseJsonBody } from '@/lib/http-json';
import { createClient } from '@/lib/supabase/server';

async function checkFreeTierLimit(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const count = await countUserCaptures(supabase, userId);
  return count >= MAX_FREE_CAPTURES;
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.valid) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const body = getJsonRecord(parsedBody.body);
    const base64ImageInput: unknown = body.image;
    const validation = validateAnalyzeImageInput(base64ImageInput);
    if (!validation.valid) {
      const status = validation.error === ANALYZE_IMAGE_SIZE_ERROR ? 413 : 400;
      return NextResponse.json({ error: validation.error }, { status });
    }
    const base64Image = base64ImageInput as string;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const user = await getAuthUserAndTouch(request);

    if (!user) {
      // Guest: atomically consume the DB-backed rate limit before paid AI work.
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const rateLimit = await consumeGuestRateLimit(ip);
      if (!rateLimit.allowed) {
        return NextResponse.json({ error: '일일 체험 한도를 초과했습니다' }, { status: 429 });
      }
    } else {
      // Authenticated: enforce free tier capture limit server-side
      const atLimit = await checkFreeTierLimit(user.id);
      if (atLimit) {
        return NextResponse.json(
          { error: `무료 플랜 저장 한도(${MAX_FREE_CAPTURES}개)에 도달했습니다` },
          { status: 403 }
        );
      }
    }

    const response = await fetch(
      `${AI_MODEL_ENDPOINT}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              parts: [
                { text: 'Analyze this screenshot and extract structured information.' },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      if (shouldReturnPendingAnalysis(response.status)) {
        return NextResponse.json(createPendingAnalysisResult());
      }
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = extractGeminiText(data.candidates);

    if (!content) {
      console.error('No text content in response:', JSON.stringify(data.candidates?.[0]?.content));
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    const result = parseAnalysisResult(content);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
