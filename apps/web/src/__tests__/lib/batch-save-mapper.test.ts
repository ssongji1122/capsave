import { describe, it, expect } from 'vitest';
import {
  getBatchResultImageSourceIndices,
  pairResultsWithImages,
} from '@/lib/batch-save-mapper';
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

describe('getBatchResultImageSourceIndices', () => {
  it('returns one source image index per analysis result', () => {
    const results = [
      r({ sourceIndices: [2] }),
      r({ sourceIndices: [0] }),
    ];
    expect(getBatchResultImageSourceIndices(results, 3)).toEqual([2, 0]);
  });

  it('uses the first source index for merged results', () => {
    const results = [r({ sourceIndices: [1, 2, 3] })];
    expect(getBatchResultImageSourceIndices(results, 4)).toEqual([1]);
  });

  it('falls back to result index when source indices are missing', () => {
    const results = [r(), r()];
    expect(getBatchResultImageSourceIndices(results, 3)).toEqual([0, 1]);
  });

  it('clamps invalid source indices to available files', () => {
    const results = [
      r({ sourceIndices: [-1] }),
      r({ sourceIndices: [99] }),
    ];
    expect(getBatchResultImageSourceIndices(results, 3)).toEqual([0, 2]);
  });

  it('falls back to result index for non-integer source indices', () => {
    const results = [
      r({ sourceIndices: [1.5] }),
      r({ sourceIndices: [Number.NaN] }),
    ];
    expect(getBatchResultImageSourceIndices(results, 3)).toEqual([0, 1]);
  });

  it('returns no indices when there are no source files', () => {
    const results = [r(), r()];
    expect(getBatchResultImageSourceIndices(results, 0)).toEqual([]);
  });
});
