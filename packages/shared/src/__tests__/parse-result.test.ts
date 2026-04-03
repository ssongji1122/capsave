import { describe, it, expect } from 'vitest';
import { parseAnalysisResult, parseBatchAnalysisResult } from '../ai/parse-result';

describe('parseAnalysisResult', () => {
  it('parses a valid place result with places array', () => {
    const input = JSON.stringify({
      category: 'place',
      title: '강남 맛집 모음',
      summary: '강남역 근처 맛집 3곳',
      places: [
        { name: '스시오마카세', address: '강남구 역삼동 123', date: '2026-03-01' },
        { name: '파스타집', address: '강남구 논현동 456' },
      ],
      extractedText: '',
      links: ['https://example.com'],
      tags: ['맛집', '강남'],
      source: 'instagram',
      confidence: 0.85,
      sourceAccountId: '@foodie_kr',
    });

    const result = parseAnalysisResult(input);
    expect(result.category).toBe('place');
    expect(result.places).toHaveLength(2);
    expect(result.places[0].name).toBe('스시오마카세');
    expect(result.places[0].date).toBe('2026-03-01');
    expect(result.places[1].address).toBe('강남구 논현동 456');
    expect(result.confidence).toBe(0.85);
    expect(result.sourceAccountId).toBe('@foodie_kr');
  });

  it('parses legacy placeName format', () => {
    const input = JSON.stringify({
      category: 'place',
      title: '카페 추천',
      placeName: '블루보틀 성수',
      address: '성동구 성수동',
      summary: '',
      tags: [],
      source: 'other',
    });

    const result = parseAnalysisResult(input);
    expect(result.places).toHaveLength(1);
    expect(result.places[0].name).toBe('블루보틀 성수');
    expect(result.places[0].address).toBe('성동구 성수동');
  });

  it('handles text category', () => {
    const input = JSON.stringify({
      category: 'text',
      title: 'Python 팁',
      summary: 'list comprehension 활용법',
      extractedText: 'some code here',
      tags: ['python', 'coding'],
      source: 'threads',
    });

    const result = parseAnalysisResult(input);
    expect(result.category).toBe('text');
    expect(result.places).toHaveLength(0);
    expect(result.extractedText).toBe('some code here');
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"category":"text","title":"Test","summary":""}\n```';
    const result = parseAnalysisResult(raw);
    expect(result.title).toBe('Test');
  });

  it('clamps confidence above 1 to 1', () => {
    const input = JSON.stringify({
      category: 'text',
      title: 'Test',
      confidence: 1.5,
    });
    expect(parseAnalysisResult(input).confidence).toBe(1);
  });

  it('clamps confidence below 0 to 0', () => {
    const input = JSON.stringify({
      category: 'text',
      title: 'Test',
      confidence: -0.3,
    });
    expect(parseAnalysisResult(input).confidence).toBe(0);
  });

  it('defaults confidence to 1.0 when missing', () => {
    const input = JSON.stringify({
      category: 'text',
      title: 'Test',
    });
    expect(parseAnalysisResult(input).confidence).toBe(1.0);
  });

  it('defaults sourceAccountId to null when missing', () => {
    const input = JSON.stringify({
      category: 'text',
      title: 'Test',
    });
    expect(parseAnalysisResult(input).sourceAccountId).toBeNull();
  });

  it('defaults sourceAccountId to null when not a string', () => {
    const input = JSON.stringify({
      category: 'text',
      title: 'Test',
      sourceAccountId: 123,
    });
    expect(parseAnalysisResult(input).sourceAccountId).toBeNull();
  });

  it('filters out places with empty names', () => {
    const input = JSON.stringify({
      category: 'place',
      title: 'Test',
      places: [
        { name: 'Valid Place' },
        { name: '' },
        { address: 'no name here' },
      ],
    });
    const result = parseAnalysisResult(input);
    expect(result.places).toHaveLength(1);
    expect(result.places[0].name).toBe('Valid Place');
  });

  it('coerces unknown category to text', () => {
    const input = JSON.stringify({
      category: 'recipe',
      title: 'Pasta Recipe',
    });
    expect(parseAnalysisResult(input).category).toBe('text');
  });

  it('throws on missing required fields', () => {
    expect(() => parseAnalysisResult('{}')).toThrow('필수 필드');
    expect(() => parseAnalysisResult('{"category":"text"}')).toThrow('필수 필드');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseAnalysisResult('not json')).toThrow();
  });

  it('parses keyInsights when present', () => {
    const input = JSON.stringify({
      category: 'text',
      title: '감자 레시피',
      keyInsights: ['감자는 삶으면 더 맛있다', '소금을 꼭 넣어야 한다', '버터로 마무리'],
    });
    const result = parseAnalysisResult(input);
    expect(result.keyInsights).toEqual(['감자는 삶으면 더 맛있다', '소금을 꼭 넣어야 한다', '버터로 마무리']);
  });

  it('returns undefined keyInsights when field absent', () => {
    const input = JSON.stringify({ category: 'text', title: 'Test' });
    const result = parseAnalysisResult(input);
    expect(result.keyInsights).toBeUndefined();
  });

  it('returns undefined keyInsights when field is not an array', () => {
    const input = JSON.stringify({ category: 'text', title: 'Test', keyInsights: 'not an array' });
    const result = parseAnalysisResult(input);
    expect(result.keyInsights).toBeUndefined();
  });

  it('parses relatedSearchTerms when present', () => {
    const input = JSON.stringify({
      category: 'text',
      title: '감자 레시피',
      relatedSearchTerms: ['감자 반찬 레시피', '한식 밑반찬'],
    });
    const result = parseAnalysisResult(input);
    expect(result.relatedSearchTerms).toEqual(['감자 반찬 레시피', '한식 밑반찬']);
  });

  it('returns undefined relatedSearchTerms when field absent', () => {
    const input = JSON.stringify({ category: 'text', title: 'Test' });
    const result = parseAnalysisResult(input);
    expect(result.relatedSearchTerms).toBeUndefined();
  });

  it('returns undefined relatedSearchTerms when field is not an array', () => {
    const input = JSON.stringify({ category: 'text', title: 'Test', relatedSearchTerms: 42 });
    const result = parseAnalysisResult(input);
    expect(result.relatedSearchTerms).toBeUndefined();
  });
});

describe('tryParseJSON — truncated JSON recovery', () => {
  it('recovers when trailing value is truncated mid-string', () => {
    // Simulates AI output cut off: summary value never closed
    const truncated = '{"category":"text","title":"AI 뉴스","summary":"Anthropic이 새로운 모델을 발';
    const result = parseAnalysisResult(truncated);
    expect(result.category).toBe('text');
    expect(result.title).toBe('AI 뉴스');
  });

  it('recovers when trailing key-value pair is incomplete', () => {
    const truncated = '{"category":"place","title":"벚꽃 축제","tags":["봄","축제"],"summary":"전국 벚꽃 축제 일정을 정리한 이미지입니다","extractedText":"진해군항제 2026.03.27';
    const result = parseAnalysisResult(truncated);
    expect(result.category).toBe('place');
    expect(result.title).toBe('벚꽃 축제');
    expect(result.tags).toEqual(['봄', '축제']);
  });

  it('recovers batch array truncated after first complete item', () => {
    const truncated = '[{"category":"text","title":"Item 1","summary":"first"},{"category":"text","title":"Item 2","summary":"second is cut o';
    const results = parseBatchAnalysisResult(truncated);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe('Item 1');
  });

  it('recovers when object inside array is truncated', () => {
    const truncated = '[{"category":"place","title":"장소1","summary":"ok"},{"category":"place","title":"장소2","summary":"trun';
    const results = parseBatchAnalysisResult(truncated);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe('장소1');
  });

  it('recovers when nested places array is truncated', () => {
    const truncated = '{"category":"place","title":"축제 모음","places":[{"name":"진해군항제"},{"name":"여의도 벚꽃축제","date":"2026.04.03';
    const result = parseAnalysisResult(truncated);
    expect(result.title).toBe('축제 모음');
    expect(result.places.length).toBeGreaterThanOrEqual(1);
    expect(result.places[0].name).toBe('진해군항제');
  });

  it('still throws for completely unparseable content', () => {
    expect(() => parseAnalysisResult('이것은 JSON이 아닙니다')).toThrow();
  });

  it('passes through valid JSON unchanged', () => {
    const valid = '{"category":"text","title":"Valid","summary":"ok","tags":["a"]}';
    const result = parseAnalysisResult(valid);
    expect(result.title).toBe('Valid');
    expect(result.tags).toEqual(['a']);
  });
});

describe('parseBatchAnalysisResult with sourceIndices', () => {
  it('parses merged result with sourceIndices', () => {
    const merged = JSON.stringify({
      category: 'text',
      title: '합쳐진 글',
      summary: '스레드 게시글',
      places: [],
      extractedText: '전체 내용',
      links: [],
      tags: ['스레드'],
      source: 'threads',
      confidence: 0.9,
      sourceAccountId: null,
      sourceIndices: [0, 1, 2],
    });
    const results = parseBatchAnalysisResult(merged);
    expect(results).toHaveLength(1);
    expect(results[0].sourceIndices).toEqual([0, 1, 2]);
  });

  it('parses array with sourceIndices per item', () => {
    const arr = JSON.stringify([
      {
        category: 'place', title: '카페', summary: '카페 정보',
        places: [{ name: '블루보틀' }], extractedText: '', links: [], tags: [],
        source: 'instagram', confidence: 0.8, sourceAccountId: null, sourceIndices: [0],
      },
      {
        category: 'text', title: '기사', summary: '뉴스 기사',
        places: [], extractedText: '기사 내용', links: [], tags: [],
        source: 'other', confidence: 0.7, sourceAccountId: null, sourceIndices: [1],
      },
    ]);
    const results = parseBatchAnalysisResult(arr);
    expect(results).toHaveLength(2);
    expect(results[0].sourceIndices).toEqual([0]);
    expect(results[1].sourceIndices).toEqual([1]);
  });

  it('returns undefined sourceIndices when field is absent (backward compat)', () => {
    const legacy = JSON.stringify({
      category: 'text', title: '레거시', summary: '',
      places: [], extractedText: '', links: [], tags: [],
      source: 'other', confidence: 0.5, sourceAccountId: null,
    });
    const results = parseBatchAnalysisResult(legacy);
    expect(results[0].sourceIndices).toBeUndefined();
  });
});
