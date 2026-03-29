import { AnalysisResult, PlaceInfo, SourceApp } from '../types/capture';

const VALID_SOURCES: SourceApp[] = ['instagram', 'threads', 'naver', 'google', 'youtube', 'other'];

function validateSource(raw: unknown): SourceApp {
  if (typeof raw === 'string' && VALID_SOURCES.includes(raw as SourceApp)) {
    return raw as SourceApp;
  }
  return 'other';
}

function parseSingleResult(result: Record<string, unknown>): AnalysisResult {
  if (!result.category || !result.title) {
    throw new Error('필수 필드가 누락되었습니다.');
  }

  // Parse places array (support both new format and legacy placeName)
  let places: PlaceInfo[] = [];
  if (Array.isArray(result.places)) {
    places = result.places.map((p: { name?: string; address?: string; date?: string; links?: string[] }) => ({
      name: p.name || '',
      ...(p.address && { address: p.address }),
      ...(p.date && { date: p.date }),
      ...(Array.isArray(p.links) && p.links.length > 0 && { links: p.links }),
    })).filter((p: PlaceInfo) => p.name);
  } else if (result.placeName) {
    places = [{ name: (result as Record<string, string>).placeName, ...((result as Record<string, string>).address && { address: (result as Record<string, string>).address }) }];
  }

  // Clamp confidence to 0.0–1.0 (guard against model drift)
  const rawConfidence = typeof result.confidence === 'number' ? result.confidence : 1.0;
  const confidence = Math.max(0, Math.min(1, rawConfidence));

  return {
    category: result.category === 'place' ? 'place' : 'text',
    title: (result.title as string) || '제목 없음',
    summary: (result.summary as string) || '',
    places,
    extractedText: (result.extractedText as string) || '',
    links: Array.isArray(result.links) ? result.links : [],
    tags: Array.isArray(result.tags) ? result.tags : [],
    source: validateSource(result.source),
    confidence,
    sourceAccountId: typeof result.sourceAccountId === 'string' ? result.sourceAccountId : null,
    ...(Array.isArray(result.keyInsights) && { keyInsights: result.keyInsights as string[] }),
    ...(Array.isArray(result.relatedSearchTerms) && { relatedSearchTerms: result.relatedSearchTerms as string[] }),
  };
}

export function parseAnalysisResult(content: string): AnalysisResult {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const result = JSON.parse(cleaned);
  return parseSingleResult(result);
}

/** Parse batch analysis response — may return single merged result or multiple separate results */
export function parseBatchAnalysisResult(content: string): AnalysisResult[] {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (Array.isArray(parsed)) {
    return parsed.map((item: Record<string, unknown>) => parseSingleResult(item));
  }
  // Single merged object
  return [parseSingleResult(parsed)];
}
