import { describe, it, expect } from 'vitest';
import { pairResultsWithImages, findUnusedImagePaths } from '@/lib/batch-save-mapper';
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

describe('findUnusedImagePaths', () => {
  it('returns the merged-away images when 17 photos collapse to one result', () => {
    const urls = Array.from({ length: 17 }, (_, i) => `img-${i}`);
    const results = [r({ sourceIndices: [0] })];
    const unused = findUnusedImagePaths(results, urls);
    expect(unused).toHaveLength(16);
    expect(unused).not.toContain('img-0');
    expect(unused).toContain('img-1');
    expect(unused).toContain('img-16');
  });

  it('returns an empty list when every image is paired', () => {
    const urls = ['a', 'b', 'c'];
    const results = [r(), r(), r()];
    expect(findUnusedImagePaths(results, urls)).toEqual([]);
  });

  it('returns empty when imageUrls is empty', () => {
    expect(findUnusedImagePaths([r()], [])).toEqual([]);
  });

  it('treats a partial merge correctly (kept thumbnails preserved)', () => {
    // result 0 merges [0, 2] (thumbnail = a), result 1 keeps [1] (thumbnail = b)
    // → c is unused (it was merged into result 0, only a kept as thumbnail)
    const urls = ['a', 'b', 'c'];
    const results = [r({ sourceIndices: [0, 2] }), r({ sourceIndices: [1] })];
    expect(findUnusedImagePaths(results, urls)).toEqual(['c']);
  });
});
