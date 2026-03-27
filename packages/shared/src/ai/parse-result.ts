import { AnalysisResult, PlaceInfo } from '../types/capture';

export function parseAnalysisResult(content: string): AnalysisResult {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const result = JSON.parse(cleaned);

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
    places = [{ name: result.placeName, ...(result.address && { address: result.address }) }];
  }

  return {
    category: result.category === 'place' ? 'place' : 'text',
    title: result.title || '제목 없음',
    summary: result.summary || '',
    places,
    extractedText: result.extractedText || '',
    links: Array.isArray(result.links) ? result.links : [],
    tags: Array.isArray(result.tags) ? result.tags : [],
    source: result.source || 'other',
  };
}
