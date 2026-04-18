import type { AnalysisResult } from '@scrave/shared';

export function pairResultsWithImages(
  results: AnalysisResult[],
  imageUrls: string[]
): Array<{ result: AnalysisResult; imageUrl: string }> {
  if (imageUrls.length === 0) return [];
  const lastIdx = imageUrls.length - 1;

  return results.map((result, i) => {
    const preferred = result.sourceIndices?.[0];
    const chosen = typeof preferred === 'number' ? preferred : i;
    const clamped = Math.max(0, Math.min(chosen, lastIdx));
    return { result, imageUrl: imageUrls[clamped] };
  });
}
