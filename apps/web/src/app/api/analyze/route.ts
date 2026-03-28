import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { SYSTEM_PROMPT, parseAnalysisResult, AI_MODEL_ENDPOINT, createSupabaseClient, extractBearerToken } from '@capsave/shared';
import { createClient } from '@/lib/supabase/server';
import { extractGeminiText } from '@/lib/gemini';
import { createRateLimiter } from '@/lib/rate-limit';

const guestRateLimiter = createRateLimiter(5, 24 * 60 * 60 * 1000); // 5 requests per day

async function getAuthUser(request: NextRequest) {
  // 1. Try Bearer token auth (mobile clients)
  const token = extractBearerToken(request.headers.get('authorization'));
  if (token) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    return user;
  }

  // 2. Try cookie-based auth (web clients)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      // Guest: apply rate limit
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      if (!guestRateLimiter.isAllowed(ip)) {
        return NextResponse.json({ error: '일일 체험 한도를 초과했습니다' }, { status: 429 });
      }
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Enforce 1MB size limit (CEO plan: server rejects > 1MB)
    if (file.size > 1_048_576) {
      return NextResponse.json({ error: 'Image exceeds 1MB limit' }, { status: 413 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Resize image to max 1024px width
    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await sharp(buffer)
      .resize(1024, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const base64Image = resized.toString('base64');

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
            maxOutputTokens: 2048,
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
