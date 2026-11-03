// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildSocialLinkCaptures,
  classifySocialLink,
  saveSocialLinkCapture,
} from '@/lib/social-link-intake';

const post = {
  url: 'https://www.instagram.com/p/Abcd_12/',
  author: 'seoulpick',
  caption: '서울 카페 여행 기록\n창가가 좋은 장소입니다.',
  selectedIndex: 2,
  images: [
    { url: 'https://scontent.cdninstagram.com/a.jpg', kind: 'image' as const },
    { url: 'https://scontent.cdninstagram.com/b.jpg', kind: 'video-preview' as const },
  ],
};

describe('social link intake', () => {
  it.each([
    ['서울 카페 주소', 'place', '여행·장소'],
    ['새 광고 캠페인 전략', 'marketing_reference', '마케팅'],
    ['브랜드 아이덴티티 로고', 'branding_reference', '브랜딩'],
    ['튜토리얼 공부 방법', 'learning_reference', '학습'],
    ['워크숍 수업자료', 'lesson_candidate', '수업자료 후보'],
    ['주말에 읽은 글', 'general_reference', '일반 참고자료'],
  ])('%s를 %s로 분류한다', (caption, kind, label) => {
    expect(classifySocialLink(caption)).toMatchObject({ kind, label });
  });

  it('preserves author, canonical URL, media order, and captured status without AI', () => {
    const captures = buildSocialLinkCaptures(post);

    expect(captures).toHaveLength(2);
    expect(captures.map((capture) => capture.imageUrl)).toEqual([
      post.images[0].url,
      post.images[1].url,
    ]);
    expect(captures[0].analysis).toMatchObject({
      category: 'place',
      links: [post.url],
      source: 'instagram',
      sourceAccountId: 'seoulpick',
      confidence: 0,
      sourceIndices: [0],
    });
    expect(captures[1].analysis.sourceIndices).toEqual([1]);
    expect(captures[1].selected).toBe(true);
    expect(captures[0].analysis.tags).toEqual(
      expect.arrayContaining(['수집됨', '검증 전', '여행·장소'])
    );
  });

  it('rejects posts without preservable media', () => {
    expect(() => buildSocialLinkCaptures({ ...post, images: [] })).toThrow(
      '보존할 공개 미디어를 찾지 못했습니다.'
    );
  });

  it('downloads, uploads, and saves the original through the compensation flow', async () => {
    const [capture] = buildSocialLinkCaptures(post);
    const order: string[] = [];

    await saveSocialLinkCapture(capture, {
      download: async (url) => {
        order.push(`download:${url}`);
        return new File([new Uint8Array([1, 2, 3])], 'instagram.jpg', {
          type: 'image/jpeg',
        });
      },
      upload: async (file) => {
        order.push(`upload:${file.type}`);
        return 'owner/original.jpg';
      },
      save: async (analysis, path) => {
        order.push(`save:${path}:${analysis.links[0]}`);
      },
      cleanup: async () => {
        order.push('cleanup');
      },
    });

    expect(order).toEqual([
      `download:${capture.imageUrl}`,
      'upload:image/jpeg',
      `save:owner/original.jpg:${post.url}`,
    ]);
  });

  it('cleans up the uploaded original if row saving fails', async () => {
    const [capture] = buildSocialLinkCaptures(post);
    let cleaned = '';

    await expect(
      saveSocialLinkCapture(capture, {
        download: async () => new File([new Uint8Array([1])], 'instagram.jpg', { type: 'image/jpeg' }),
        upload: async () => 'owner/new.jpg',
        save: async () => {
          throw new Error('row failed');
        },
        cleanup: async (path) => {
          cleaned = path;
        },
      })
    ).rejects.toThrow('row failed');
    expect(cleaned).toBe('owner/new.jpg');
  });
});
