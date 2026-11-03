import type { AnalysisResult } from './ai-analyzer';

interface AnalysisExitRequest {
  original: AnalysisResult | null;
  draft: AnalysisResult | null;
  confirmDiscard: (discard: () => void) => void;
  onExit: () => void;
}

export function hasUnsavedAnalysisDraft(
  original: AnalysisResult | null,
  draft: AnalysisResult | null
): boolean {
  if (!original || !draft) return false;
  return JSON.stringify(original) !== JSON.stringify(draft);
}

export function requestAnalysisExit({
  original,
  draft,
  confirmDiscard,
  onExit,
}: AnalysisExitRequest): void {
  if (!hasUnsavedAnalysisDraft(original, draft)) {
    onExit();
    return;
  }

  confirmDiscard(onExit);
}
