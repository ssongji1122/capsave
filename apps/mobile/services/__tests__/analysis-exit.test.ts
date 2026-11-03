import type { AnalysisResult } from '@/services/ai-analyzer';
import { requestAnalysisExit } from '../analysis-exit';

const RESULT: AnalysisResult = {
  category: 'text',
  title: '분석 결과',
  summary: '요약',
  places: [],
  extractedText: '원문',
  links: [],
  tags: [],
  source: 'other',
  confidence: 0.9,
  sourceAccountId: null,
};

describe('requestAnalysisExit', () => {
  it('exits immediately when the analysis draft is unchanged', () => {
    const confirmDiscard = jest.fn();
    const onExit = jest.fn();

    requestAnalysisExit({ original: RESULT, draft: { ...RESULT }, confirmDiscard, onExit });

    expect(confirmDiscard).not.toHaveBeenCalled();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('waits for explicit discard confirmation when the draft changed', () => {
    const confirmDiscard = jest.fn((discard: () => void) => discard());
    const onExit = jest.fn();

    requestAnalysisExit({
      original: RESULT,
      draft: { ...RESULT, title: '사용자가 고친 제목' },
      confirmDiscard,
      onExit,
    });

    expect(confirmDiscard).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
