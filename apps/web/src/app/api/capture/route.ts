import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import {
  SYSTEM_PROMPT,
  parseAnalysisResult,
  AI_MODEL_ENDPOINT,
  countUserCaptures,
  MAX_FREE_CAPTURES,
} from '@scrave/shared';
import { createClient } from '@/lib/supabase/server';
import { extractGeminiText } from '@/lib/gemini';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import {
  ANALYZE_MAX_WIDTH,
  ANALYZE_JPEG_QUALITY_SHARP,
} from '@/lib/constants';
import { createPendingAnalysisResult, shouldReturnPendingAnalysis } from '@/lib/analysis-fallback';
import { validateUploadFile } from '@/lib/upload-validation';

async function checkFreeTierLimit(userId: string, supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const count = await countUserCaptures(supabase, userId);
  return count >= MAX_FREE_CAPTURES;
}

/**
 * Single capture endpoint for authenticated users:
 * - Resizes/compresses for Gemini (preserves OCR-critical text quality)
 * - Calls Gemini
 * - Stores the original to Supabase Storage only after analysis succeeds
 * - Returns parsed AnalysisResult + storagePath
 *
 * Replaces the parallel /api/upload + /api/analyze flow that sent the file twice.
 * /api/upload remains for batch uploads, /api/analyze remains for guests.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserAndTouch(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const validation = validateUploadFile(file);
    if (!validation.valid) {
      const status = validation.error.includes('5MB') ? 413 : 400;
      return NextResponse.json({ error: validation.error }, { status });
    }

    const supabase = await createClient();
    const atLimit = await checkFreeTierLimit(user.id, supabase);
    if (atLimit) {
      return NextResponse.json(
        { error: `무료 플랜 저장 한도(${MAX_FREE_CAPTURES}개)에 도달했습니다` },
        { status: 403 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer());

    // Resize/compress in-memory for Gemini using the OCR-friendly quality floor
    const meta = await sharp(originalBuffer).metadata();
    const needsResize = (meta.width ?? 0) > ANALYZE_MAX_WIDTH;
    const analyzeBuffer = needsResize
      ? await sharp(originalBuffer)
          .resize({ width: ANALYZE_MAX_WIDTH })
          .jpeg({ quality: ANALYZE_JPEG_QUALITY_SHARP })
          .toBuffer()
      : await sharp(originalBuffer).jpeg({ quality: ANALYZE_JPEG_QUALITY_SHARP }).toBuffer();

    const base64Image = analyzeBuffer.toString('base64');

    // Call Gemini
    const geminiResponse = await fetch(`${AI_MODEL_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    const result = geminiResponse.ok
      ? null
      : shouldReturnPendingAnalysis(geminiResponse.status)
        ? createPendingAnalysisResult()
        : null;

    if (!geminiResponse.ok && !result) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error: ${geminiResponse.status}` },
        { status: 502 }
      );
    }

    let analysisResult = result;
    if (!analysisResult) {
      const data = await geminiResponse.json();
      const content = extractGeminiText(data.candidates);
      if (!content) {
        console.error('No text content in response:', JSON.stringify(data.candidates?.[0]?.content));
        return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
      }

      analysisResult = parseAnalysisResult(content);
    }

    // Upload original to Storage after Gemini succeeds to avoid orphaned files
    // when analysis fails or returns an empty response.
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.type.split('/')[1];
    const storagePath = `${user.id}/${timestamp}_${random}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('captures')
      .upload(storagePath, originalBuffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      throw uploadError;
    }

    return NextResponse.json({ result: analysisResult, storagePath });
  } catch (error) {
    console.error('Capture error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Capture failed' },
      { status: 500 }
    );
  }
}
