import { describe, expect, it } from 'vitest';
import { buildGuideSharePayload } from '@/lib/guide-share';

describe('buildGuideSharePayload', () => {
  it('creates a concise share payload using the canonical guide URL', () => {
    expect(
      buildGuideSharePayload({
        title: '울루와뚜의 세 장면',
        description: '절벽 사원에서 해변과 선셋 바까지 이어지는 공개 가이드',
        url: 'https://scrave.app/g/uluwatu-afterglow',
      })
    ).toEqual({
      title: '울루와뚜의 세 장면',
      text: '절벽 사원에서 해변과 선셋 바까지 이어지는 공개 가이드',
      url: 'https://scrave.app/g/uluwatu-afterglow',
    });
  });

  it('rejects non-http share URLs', () => {
    expect(() =>
      buildGuideSharePayload({
        title: '울루와뚜',
        description: '공개 가이드',
        url: 'javascript:alert(1)',
      })
    ).toThrow('GUIDE_SHARE_URL_INVALID');
  });
});
