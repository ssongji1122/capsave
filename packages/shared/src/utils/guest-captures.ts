import type { CaptureCategory, CaptureItem, PlaceInfo, SourceApp } from '../types/capture';
import { sanitizeUrl } from './url-validator';

export interface GuestCapture {
  id: number;
  imageBase64: string;
  title: string;
  summary: string;
  category: CaptureCategory;
  confidence: number;
  tags: string[];
  links?: string[];
  source?: SourceApp;
  sourceAccountId?: string | null;
  places: PlaceInfo[];
  createdAt: string;
  extractedText?: string;
  keyInsights?: string[];
  relatedSearchTerms?: string[];
}

function sanitizeLinks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((link): link is string => typeof link === 'string')
    .map((link) => sanitizeUrl(link))
    .filter((link): link is string => link !== null);
}

export function parseGuestCaptures(raw: string | null): GuestCapture[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function serializeGuestCaptures(captures: GuestCapture[]): string {
  return JSON.stringify(captures);
}

export function getNextGuestId(captures: GuestCapture[]): number {
  if (captures.length === 0) return -1;
  const minId = Math.min(...captures.map((c) => c.id));
  return minId - 1;
}

export function addGuestCapture(
  captures: GuestCapture[],
  newCapture: GuestCapture,
  maxSlots: number,
): GuestCapture[] {
  if (captures.length >= maxSlots) {
    throw new Error('Guest capture limit reached');
  }
  return [newCapture, ...captures];
}

export function guestCaptureToItem(gc: GuestCapture): CaptureItem {
  return {
    id: gc.id,
    category: gc.category,
    title: gc.title,
    summary: gc.summary,
    places: gc.places,
    extractedText: gc.extractedText || '',
    links: sanitizeLinks(gc.links),
    tags: gc.tags,
    source: gc.source ?? 'other',
    imageUrl: gc.imageBase64,
    createdAt: gc.createdAt,
    userId: null,
    confidence: gc.confidence,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: gc.sourceAccountId ?? null,
    ...(gc.keyInsights && { keyInsights: gc.keyInsights }),
    ...(gc.relatedSearchTerms && { relatedSearchTerms: gc.relatedSearchTerms }),
  };
}
