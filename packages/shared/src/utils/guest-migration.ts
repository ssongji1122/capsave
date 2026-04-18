import type { GuestCapture } from './guest-captures';

export function base64ToBlob(dataUri: string): Blob {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URI');
  }

  const mimeType = match[1];
  const base64 = match[2];
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export interface MigrationPayload {
  user_id: string;
  image_url: string;
  title: string;
  summary: string;
  category: string;
  confidence: number;
  tags: string[];
  places: GuestCapture['places'];
  source: string;
  extracted_text: string;
  links: string[];
}

export function buildMigrationPayload(
  gc: GuestCapture,
  userId: string,
  imageUrl: string,
): MigrationPayload {
  return {
    user_id: userId,
    image_url: imageUrl,
    title: gc.title,
    summary: gc.summary,
    category: gc.category,
    confidence: gc.confidence,
    tags: gc.tags,
    places: gc.places,
    source: 'other',
    extracted_text: '',
    links: [],
  };
}
