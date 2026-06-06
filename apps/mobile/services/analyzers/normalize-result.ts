import { sanitizeUrl } from '@scrave/shared';
import { AnalysisResult, PlaceInfo, SourceApp } from './types';

const SOURCE_APPS: SourceApp[] = ['instagram', 'threads', 'naver', 'google', 'youtube', 'other'];

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asSafeLinkArray(value: unknown): string[] {
  return asStringArray(value)
    .map((link) => sanitizeUrl(link))
    .filter((link): link is string => link !== null);
}

function asSourceApp(value: unknown): SourceApp {
  return typeof value === 'string' && SOURCE_APPS.includes(value as SourceApp)
    ? value as SourceApp
    : 'other';
}

function asPlaceArray(value: unknown): PlaceInfo[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((place): place is Record<string, unknown> => {
      return typeof place === 'object' && place !== null && typeof place.name === 'string';
    })
    .map((place) => {
      const links = asSafeLinkArray(place.links);
      return {
        name: place.name as string,
        ...(typeof place.address === 'string' && { address: place.address }),
        ...(typeof place.date === 'string' && { date: place.date }),
        ...(typeof place.description === 'string' && { description: place.description }),
        ...(links.length > 0 && { links }),
        ...(typeof place.lat === 'number' && { lat: place.lat }),
        ...(typeof place.lng === 'number' && { lng: place.lng }),
      };
    });
}

export function normalizeAnalysisResult(result: Record<string, unknown>): AnalysisResult {
  const rawConfidence = typeof result.confidence === 'number' ? result.confidence : 1.0;

  return {
    category: result.category === 'place' ? 'place' : 'text',
    title: asString(result.title, '제목 없음'),
    summary: asString(result.summary, ''),
    places: asPlaceArray(result.places),
    extractedText: asString(result.extractedText, ''),
    links: asSafeLinkArray(result.links),
    tags: asStringArray(result.tags),
    source: asSourceApp(result.source),
    confidence: Math.max(0, Math.min(1, rawConfidence)),
    sourceAccountId: typeof result.sourceAccountId === 'string' ? result.sourceAccountId : null,
  };
}
