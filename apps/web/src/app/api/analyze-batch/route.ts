import { NextRequest, NextResponse } from 'next/server';
import {
  SYSTEM_PROMPT,
  BATCH_ANALYSIS_INSTRUCTION,
  parseBatchAnalysisResult,
  AI_MODEL_ENDPOINT,
  createSupabaseClient,
  extractBearerToken,
} from '@scrave/shared';
import { createClient } from '@/lib/supabase/server';
import { extractGeminiText } from '@/lib/gemini';

async function getAuthUser(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('authorization'));
  if (token) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    return user;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    // Guests can use batch analysis too

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const images: string[] = body.images;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    if (images.length > 10) {
      return NextResponse.json({ error: '한번에 최대 10장까지 업로드 가능합니다' }, { status: 400 });
    }

    // Images are already resized + base64-encoded on the client
    console.log(`[batch-analyze] Received ${images.length} pre-resized images`);
    const imageParts = images.map((base64Data, idx) => {
      console.log(`[batch-analyze] Image ${idx}: ${(base64Data.length / 1024).toFixed(0)}KB base64`);
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

    const totalBase64Size = imageParts.reduce((sum, p) => sum + p.inlineData.data.length, 0);
    console.log(`[batch-analyze] Sending to Gemini: ${images.length} images, total base64 size: ${(totalBase64Size / 1024 / 1024).toFixed(1)}MB`);

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
            maxOutputTokens: 4096,
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
    console.log(`[batch-analyze] Gemini response received, content length: ${content?.length ?? 0}`);

    if (!content) {
      console.error('[batch-analyze] Empty AI response, raw candidates:', JSON.stringify(data.candidates));
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    const results = parseBatchAnalysisResult(content);
    console.log(`[batch-analyze] Parsed ${results.length} results`);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Batch analyze error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch analysis failed' },
      { status: 500 }
    );
  }
}
