import { describe, expect, it } from 'vitest';
import { calibrateConfidence, parseAnalysisResult } from '../ai/parse-result';

describe('calibrateConfidence (F1 heuristic)', () => {
  it('routes place captures with 0 extracted places into UncertainQueue (< 0.5)', () => {
    expect(
      calibrateConfidence(0.92, {
        category: 'place',
        title: '성수 맛집',
        summary: '요약',
        extractedText: '본문',
        places: [],
      }),
    ).toBe(0.35);
  });

  it('penalizes place captures when all extracted places lack an address', () => {
    expect(
      calibrateConfidence(0.6, {
        category: 'place',
        title: '어딘가의 카페',
        summary: '',
        extractedText: '',
        places: [{ name: '무명 카페' }],
      }),
    ).toBe(0.45);
  });

  it('preserves high confidence when place has an address', () => {
    expect(
      calibrateConfidence(0.9, {
        category: 'place',
        title: '오브젝트 성수',
        summary: '소품샵',
        extractedText: '서울 성동구 연무장길',
        places: [{ name: '오브젝트 성수', address: '서울 성동구 연무장길' }],
      }),
    ).toBe(0.9);
  });
});

it('applies confidence correction in the real analysis parser', () => {
 expect(parseAnalysisResult(JSON.stringify({category:'place',title:'카페',places:[],confidence:0.92})).confidence).toBe(0.35);
});
it('keeps flight timestamps out of geographic addresses', () => {
 const result=parseAnalysisResult(JSON.stringify({category:'place',title:'항공권',places:[{name:'인천국제공항',address:'2026-11-05 20:20'}],confidence:0.9}));
 expect(result.places[0].address).toBeUndefined();
 expect(result.places[0].date).toBe('2026-11-05 20:20');
});
