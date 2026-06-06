import type { GuestCapture } from './guest-captures';
import { sanitizeUrl } from './url-validator';

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
  source_account_id: string | null;
  extracted_text: string;
  links: string[];
}

function sanitizeLinks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((link): link is string => typeof link === 'string')
    .map((link) => sanitizeUrl(link))
    .filter((link): link is string => link !== null);
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
    source: gc.source ?? 'other',
    source_account_id: gc.sourceAccountId ?? null,
    extracted_text: gc.extractedText ?? '',
    links: sanitizeLinks(gc.links),
  };
}
