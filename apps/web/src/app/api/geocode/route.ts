import { NextRequest, NextResponse } from 'next/server';
import { validateGeocodingInput, buildGeocodingQuery, parseGoogleGeocodeResponse } from '@/lib/geocoding';
import { getAuthUserAndTouch } from '@/lib/api-auth';
import { getJsonRecord, parseJsonBody } from '@/lib/http-json';

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.valid) {
      return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    }

    const body = getJsonRecord(parsedBody.body);
    const nameInput = body.name;
    const addressInput = body.address;

    const validation = validateGeocodingInput(nameInput, addressInput);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const name = nameInput as string;
    const address = typeof addressInput === 'string' ? addressInput : undefined;

    const user = await getAuthUserAndTouch(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = buildGeocodingQuery(name, address);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=ko`;
    const res = await fetch(url);
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
