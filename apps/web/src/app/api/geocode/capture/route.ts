import { NextRequest, NextResponse } from 'next/server';
import { updateCapturePlaces } from '@scrave/shared';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { getUserCapturesByIds } from '@/lib/guide-draft-sources';
import { getJsonRecord, parseJsonBody } from '@/lib/http-json';
import { createGooglePlaceGeocoder, refreshPlaceCoordinates } from '@/lib/place-coordinates';
import { createClient } from '@/lib/supabase/server';

/**
 * Fills in coordinates for one of the signed-in user's captures and stores them.
 * Only places without coordinates, or whose geocoded coordinates are older than
 * 30 days (Google Geocoding caching limit), are sent to Google.
 */
export async function POST(request: NextRequest) {
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.valid) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const captureId = getJsonRecord(parsedBody.body).captureId;
  if (typeof captureId !== 'number' || !Number.isInteger(captureId) || captureId <= 0) {
    return NextResponse.json({ error: 'captureId must be a positive integer' }, { status: 400 });
  }

  const user = await getAuthUserAndTouch(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    const supabase = await createClient();
    const [capture] = await getUserCapturesByIds(supabase, user.id, [captureId]);
    if (!capture) {
      return NextResponse.json({ error: 'Capture not found' }, { status: 404 });
    }

    const refreshed = await refreshPlaceCoordinates(capture.places, {
      now: new Date(),
      geocode: createGooglePlaceGeocoder(apiKey),
    });
    const places = refreshed.changed
      ? (await updateCapturePlaces(supabase, captureId, refreshed.places)).places
      : capture.places;

    return NextResponse.json({ captureId, places });
  } catch (error) {
    console.error('Capture geocoding error:', error);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
