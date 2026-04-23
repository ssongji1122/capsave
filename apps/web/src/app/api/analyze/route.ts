import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT, parseAnalysisResult, AI_MODEL_ENDPOINT, countUserCaptures, MAX_FREE_CAPTURES } from '@scrave/shared';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { extractGeminiText } from '@/lib/gemini';
import { checkGuestRateLimit, incrementGuestRateLimit } from '@/lib/rate-limit';
import { getAuthUserAndTouch } from '@/lib/api-auth';

async function checkFreeTierLimit(userId: string): Promise<boolean> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return false; // fail open if key not configured

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
      // Guest: apply rate limit (DB-based)
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const rateLimit = await checkGuestRateLimit(ip);
      if (!rateLimit.allowed) {
        return NextResponse.json({ error: '일일 체험 한도를 초과했습니다' }, { status: 429 });
      }
      await incrementGuestRateLimit(ip);
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

    const body = await request.json();
    const base64Image: string = body.image;

    if (!base64Image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
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
