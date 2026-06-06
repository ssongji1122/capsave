import { getAnalyzeStatusErrorMessage } from '../analyzers/server-analyzer';

describe('getAnalyzeStatusErrorMessage', () => {
  it('matches the web analyze payload size limit for 413 responses', () => {
    expect(getAnalyzeStatusErrorMessage(413)).toBe('이미지 크기가 5MB를 초과합니다.');
  });

  it('returns auth guidance for 401 responses', () => {
    expect(getAnalyzeStatusErrorMessage(401)).toBe('인증이 필요합니다. 다시 로그인해주세요.');
  });

  it('returns null for statuses handled by the generic error path', () => {
    expect(getAnalyzeStatusErrorMessage(500)).toBeNull();
  });
});
