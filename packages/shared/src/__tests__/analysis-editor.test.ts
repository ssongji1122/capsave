import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../types/capture';
import {
  addAnalysisPlace,
  prepareAnalysisForSave,
  removeAnalysisPlace,
  updateAnalysisPlace,
  validateAnalysisDraft,
} from '../utils/analysis-editor';

const RESULT: AnalysisResult = {
  category: 'place',
  title: ' 서울 여행 ',
  summary: ' 하루 코스 ',
  places: [{
    name: '서울시청',
    address: '서울 중구',
    date: '2026-11-04',
    links: ['https://maps.example/old'],
    lat: 37.5665,
    lng: 126.978,
    placeId: 'old-place',
    geocodedAt: '2026-11-04T00:00:00.000Z',
  }],
  extractedText: ' 원문 ',
  links: ['https://example.com'],
  tags: ['여행'],
  source: 'instagram',
  confidence: 0.91,
  sourceAccountId: 'account',
  sourceIndices: [0],
};

describe('analysis editor', () => {
  it('requires a title and at least one named place for place results', () => {
    expect(validateAnalysisDraft({ ...RESULT, title: '   ' })).toEqual({
      field: 'title',
      message: '제목을 입력해 주세요.',
    });
    expect(validateAnalysisDraft({ ...RESULT, places: [{ name: '  ' }] })).toEqual({
      field: 'places',
      message: '장소로 저장하려면 장소 이름을 하나 이상 입력해 주세요.',
    });
  });

  it('removes stale coordinates and place links after identity fields change', () => {
    const updated = updateAnalysisPlace(RESULT, 0, 'address', '서울 종로구');

    expect(updated.places[0]).toEqual({
      name: '서울시청',
      address: '서울 종로구',
      date: '2026-11-04',
    });
    expect(updated.sourceAccountId).toBe('account');
    expect(updated.sourceIndices).toEqual([0]);
  });

  it('can add and remove a place without mutating the original result', () => {
    const added = addAnalysisPlace(RESULT);
    const removed = removeAnalysisPlace(added, 0);

    expect(RESULT.places).toHaveLength(1);
    expect(added.places).toHaveLength(2);
    expect(removed.places).toEqual([{ name: '', address: '', date: '' }]);
  });

  it('normalizes editable text and removes places only when saving as text', () => {
    const prepared = prepareAnalysisForSave({ ...RESULT, category: 'text' });

    expect(prepared).toMatchObject({
      category: 'text',
      title: '서울 여행',
      summary: '하루 코스',
      extractedText: '원문',
      places: [],
      source: 'instagram',
      confidence: 0.91,
      sourceAccountId: 'account',
      sourceIndices: [0],
    });
  });
});
