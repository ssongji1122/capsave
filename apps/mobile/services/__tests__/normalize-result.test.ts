import { normalizeAnalysisResult } from '../analyzers/normalize-result';

describe('normalizeAnalysisResult', () => {
  it('filters unsafe top-level and place links', () => {
    const result = normalizeAnalysisResult({
      category: 'place',
      title: '링크 캡처',
      summary: '링크 포함',
      places: [
        {
          name: '카페',
          links: ['https://safe.example/place', 'javascript:alert(1)'],
        },
      ],
      extractedText: '',
      links: ['https://safe.example/article', 'data:text/html,<h1>x</h1>'],
      tags: ['링크'],
      source: 'instagram',
      confidence: 0.8,
      sourceAccountId: '@safe',
    });

    expect(result.links).toEqual(['https://safe.example/article']);
    expect(result.places[0].links).toEqual(['https://safe.example/place']);
  });

  it('normalizes malformed optional fields to safe defaults', () => {
    const result = normalizeAnalysisResult({
      category: 'unknown',
      title: 123,
      confidence: 2,
      source: 'unknown-source',
      places: [{ address: '이름 없음' }, { name: '정상 장소' }],
      links: 'not-an-array',
      tags: [1, '태그'],
    });

    expect(result.category).toBe('text');
    expect(result.title).toBe('제목 없음');
    expect(result.confidence).toBe(1);
    expect(result.source).toBe('other');
    expect(result.places).toEqual([{ name: '정상 장소' }]);
    expect(result.links).toEqual([]);
    expect(result.tags).toEqual(['태그']);
  });
});
