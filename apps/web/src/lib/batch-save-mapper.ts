import type { AnalysisResult } from '@scrave/shared';

function clampIndex(index: number, maxIndex: number): number {
  return Math.max(0, Math.min(index, maxIndex));
}

function isValidSourceIndex(index: unknown): index is number {
  return typeof index === 'number' && Number.isFinite(index) && Number.isInteger(index);
}

export function getBatchResultImageSourceIndices(
  results: AnalysisResult[],
  imageCount: number
): number[] {
  if (imageCount <= 0) return [];
  const lastIdx = imageCount - 1;

  return results.map((result, i) => {
    const preferred = result.sourceIndices?.[0];
    const chosen = isValidSourceIndex(preferred) ? preferred : i;
    return clampIndex(chosen, lastIdx);
  });
}

export function pairResultsWithImages(
  results: AnalysisResult[],
  imageUrls: string[]
): Array<{ result: AnalysisResult; imageUrl: string }> {
  if (imageUrls.length === 0) return [];
  const indices = getBatchResultImageSourceIndices(results, imageUrls.length);

  return results.map((result, i) => {
    return { result, imageUrl: imageUrls[indices[i]] };
  });
}
