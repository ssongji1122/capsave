import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { SYSTEM_PROMPT, parseAnalysisResult } from '@capsave/shared';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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

    // Call Gemini Vision API (2.5-flash with thinking disabled for structured output)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

    // Extract text part (skip thinking parts)
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const textPart = parts.find((p: { text?: string; thought?: boolean }) => p.text && !p.thought);
    const content = textPart?.text;

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
