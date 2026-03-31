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

/** Build closing sequence by scanning open brackets/braces in order */
function buildClosingSequence(s: string): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  return stack.reverse().join('');
}

/** Try to repair truncated JSON by progressively trimming and closing brackets */
function tryParseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    let repaired = raw;
    for (let attempt = 0; attempt < 15; attempt++) {
      // Close any unterminated string
      const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quotes % 2 !== 0) repaired += '"';
      // Remove trailing incomplete key-value or object
      repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"?\s*$/, '');
      repaired = repaired.replace(/,\s*\{[^}]*$/, '');
      repaired = repaired.replace(/,\s*$/, '');
      // Close open brackets/braces in correct nesting order
      const candidate = repaired + buildClosingSequence(repaired);
      try {
        return JSON.parse(candidate);
      } catch {
        // Trim one more trailing token and retry
        repaired = repaired.replace(/[,\s]*"?[^,\[\]{}]*$/, '');
        if (!repaired.trim()) break;
      }
    }
    return JSON.parse(raw);
  }
}

export function parseAnalysisResult(content: string): AnalysisResult {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const result = tryParseJSON(cleaned) as Record<string, unknown>;
  return parseSingleResult(result);
}

/** Parse batch analysis response — may return single merged result or multiple separate results */
export function parseBatchAnalysisResult(content: string): AnalysisResult[] {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = tryParseJSON(cleaned);

  if (Array.isArray(parsed)) {
    return parsed.map((item: Record<string, unknown>) => parseSingleResult(item));
  }
  // Single merged object
  return [parseSingleResult(parsed as Record<string, unknown>)];
}
