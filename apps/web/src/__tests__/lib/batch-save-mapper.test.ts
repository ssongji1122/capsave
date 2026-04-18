import { describe, it, expect } from 'vitest';
import { pairResultsWithImages } from '@/lib/batch-save-mapper';
import type { AnalysisResult } from '@scrave/shared';

const r = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
  category: 'text',
  title: 't',
  summary: '',
  places: [],
  extractedText: '',
  links: [],
  tags: [],
  source: 'other',
  confidence: 1,
  sourceAccountId: null,
  ...overrides,
});

describe('pairResultsWithImages', () => {
  it('pairs identity-mapped results when no merging', () => {
    const results = [r(), r(), r()];
    const urls = ['a', 'b', 'c'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
      { result: results[1], imageUrl: 'b' },
      { result: results[2], imageUrl: 'c' },
    ]);
  });

  it('uses sourceIndices[0] for a merged result', () => {
    const results = [r({ sourceIndices: [0, 1, 2] })];
    const urls = ['a', 'b', 'c'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
    ]);
  });

  it('uses sourceIndices when results are partially merged', () => {
    const results = [
      r({ sourceIndices: [0, 2] }),
      r({ sourceIndices: [1] }),
    ];
    const urls = ['a', 'b', 'c'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
      { result: results[1], imageUrl: 'b' },
    ]);
  });

  it('falls back to result-array index when sourceIndices missing', () => {
    const results = [r(), r()];
    const urls = ['a', 'b'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
      { result: results[1], imageUrl: 'b' },
    ]);
  });

  it('falls back to result-array index when sourceIndices empty array', () => {
    const results = [r({ sourceIndices: [] }), r({ sourceIndices: [] })];
    const urls = ['a', 'b'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'a' },
      { result: results[1], imageUrl: 'b' },
    ]);
  });

  it('clamps out-of-range index to last image URL', () => {
    const results = [r({ sourceIndices: [99] })];
    const urls = ['a', 'b'];
    expect(pairResultsWithImages(results, urls)).toEqual([
      { result: results[0], imageUrl: 'b' },
    ]);
  });

  it('clamps when imageUrls is empty (defensive — should never happen)', () => {
    const results = [r()];
    expect(pairResultsWithImages(results, [])).toEqual([]);
  });
});
