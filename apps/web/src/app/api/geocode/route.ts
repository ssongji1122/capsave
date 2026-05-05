import { NextRequest, NextResponse } from 'next/server';
import { validateGeocodingInput, buildGeocodingQuery, parseGoogleGeocodeResponse } from '@/lib/geocoding';
import { getAuthUserAndTouch } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    void getAuthUserAndTouch(request); // fire-and-forget DAU tracking
    const { name, address } = await request.json();

    const validation = validateGeocodingInput(name, address);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const query = buildGeocodingQuery(name, address);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=ko`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding API returned ${res.status}`);
    const data = await res.json();

    const result = parseGoogleGeocodeResponse(data);
    if (result) {
      return NextResponse.json(result);
    }

    return NextResponse.json({ lat: null, lng: null, formattedAddress: null });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
