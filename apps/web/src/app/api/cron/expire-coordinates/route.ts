import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractBearerToken } from '@scrave/shared';
import { expireStoredCoordinates } from '@/lib/expire-coordinates';

/**
 * Daily cleanup for Google Geocoding results: coordinates may be kept for at most
 * 30 consecutive days, so expired ones are removed from every capture.
 * Call via Vercel Cron. Requires CRON_SECRET env var.
 */
export async function GET(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('authorization'));
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const result = await expireStoredCoordinates(supabase, new Date());
    return NextResponse.json(result);
  } catch (error) {
    console.error('Coordinate expiry error:', error);
    return NextResponse.json({ error: 'Coordinate expiry failed' }, { status: 500 });
  }
}
