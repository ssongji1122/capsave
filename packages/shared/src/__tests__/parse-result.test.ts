import { describe, it, expect } from 'vitest';
import { parseAnalysisResult } from '../ai/parse-result';

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
});
