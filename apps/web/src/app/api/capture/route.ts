import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { SYSTEM_PROMPT, parseAnalysisResult, AI_MODEL_ENDPOINT } from '@scrave/shared';
import { createClient } from '@/lib/supabase/server';
import { extractGeminiText } from '@/lib/gemini';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_SIZE,
  ANALYZE_MAX_WIDTH,
  ANALYZE_JPEG_QUALITY_SHARP,
} from '@/lib/constants';

/**
 * Single capture endpoint for authenticated users:
 * - Validates and stores the original to Supabase Storage
 * - Resizes/compresses for Gemini (preserves OCR-critical text quality)
 * - Calls Gemini and returns parsed AnalysisResult + storagePath
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: '파일 크기가 5MB를 초과합니다.' }, { status: 413 });
    }
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as typeof ALLOWED_UPLOAD_MIME_TYPES[number])) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. (jpeg, png, webp만 가능)' },
        { status: 400 }
      );
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

    // Upload original to Storage
    const supabase = await createClient();
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

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error: ${geminiResponse.status}` },
        { status: 502 }
      );
    }

    const data = await geminiResponse.json();
    const content = extractGeminiText(data.candidates);
    if (!content) {
      console.error('No text content in response:', JSON.stringify(data.candidates?.[0]?.content));
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    const result = parseAnalysisResult(content);
    return NextResponse.json({ result, storagePath });
  } catch (error) {
    console.error('Capture error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Capture failed' },
      { status: 500 }
    );
  }
}
