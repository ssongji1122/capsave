import type { AnalysisResult } from '@scrave/shared';

const GEMINI_RATE_LIMIT_STATUS = 429;

export const PENDING_ANALYSIS_TITLE = '분석 대기 캡처';
export const PENDING_ANALYSIS_TAG = '분석대기';

export function shouldReturnPendingAnalysis(status: number): boolean {
  return status === GEMINI_RATE_LIMIT_STATUS;
}

export function createPendingAnalysisResult(sourceIndices?: readonly number[]): AnalysisResult {
  return {
    category: 'text',
    title: PENDING_ANALYSIS_TITLE,
    summary: 'AI 분석 한도가 초과되어 원본 캡처로 먼저 저장합니다. 나중에 다시 분석할 수 있습니다.',
    places: [],
    extractedText: '',
    links: [],
    tags: [PENDING_ANALYSIS_TAG],
    source: 'other',
    confidence: 0,
    sourceAccountId: null,
    ...(sourceIndices ? { sourceIndices: [...sourceIndices] } : {}),
  };
}
