import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { getJsonRecord, parseJsonBody } from '@/lib/http-json';
import { collectPlaceReviews } from '@/lib/place-review-sources';

const MAX_PLACE_NAME_LENGTH = 120;

/**
 * Picked Naver blog reviews and YouTube videos for one place.
 * Uses the official Naver Search API and YouTube Data API only, then drops
 * sponsored posts, AI-voice channels, and face-heavy videos (Gemini scene check).
 * A missing key returns search links for that source instead of failing.
 */
export async function POST(request: NextRequest) {
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.valid) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const nameInput = getJsonRecord(parsedBody.body).name;
  const name = typeof nameInput === 'string' ? nameInput.trim() : '';
  if (!name || name.length > MAX_PLACE_NAME_LENGTH) {
    return NextResponse.json({ error: 'Invalid place name' }, { status: 400 });
  }

  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await collectPlaceReviews(name, {
      naverClientId: process.env.NAVER_CLIENT_ID,
      naverClientSecret: process.env.NAVER_CLIENT_SECRET,
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Place reviews error:', error);
    return NextResponse.json({ error: 'Place reviews failed' }, { status: 500 });
  }
}
