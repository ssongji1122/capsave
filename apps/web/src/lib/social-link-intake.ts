import type { AnalysisResult } from '@scrave/shared';
import type { InstagramOriginal } from '@/lib/instagram-original';

export type SocialLinkRouteKind =
  | 'place'
  | 'marketing_reference'
  | 'branding_reference'
  | 'learning_reference'
  | 'lesson_candidate'
  | 'general_reference';

export interface SocialLinkRoute {
  kind: SocialLinkRouteKind;
  label: string;
}

export interface SocialLinkCapture {
  imageUrl: string;
  imageKind: 'image' | 'video-preview';
  selected: boolean;
  analysis: AnalysisResult;
}

const MAX_TITLE_LENGTH = 80;
const MAX_SUMMARY_LENGTH = 240;
const CAPTURED_TAG = '수집됨';
const UNVERIFIED_TAG = '검증 전';

const ROUTES: Array<SocialLinkRoute & { keywords: string[] }> = [
  {
    kind: 'place',
    label: '여행·장소',
    keywords: [
      '맛집', '카페', '여행', '관광', '숙소', '호텔', '해변', '주소', '위치',
      'restaurant', 'cafe', 'travel', 'hotel',
    ],
  },
  {
    kind: 'marketing_reference',
    label: '마케팅',
    keywords: ['마케팅', '마케터', '캠페인', '광고', '바이럴', '콘텐츠', '채널', '전략', 'marketing', 'campaign'],
  },
  {
    kind: 'branding_reference',
    label: '브랜딩',
    keywords: ['브랜드', '브랜딩', '리브랜딩', '아이덴티티', '로고', '패키지', 'branding', 'identity'],
  },
  {
    kind: 'learning_reference',
    label: '학습',
    keywords: ['공부', '학습', '강의', '튜토리얼', '개념', '사용법', '교육', 'learning', 'tutorial'],
  },
  {
    kind: 'lesson_candidate',
    label: '수업자료 후보',
    keywords: ['수업자료', '커리큘럼', '워크숍', '실습', 'lesson', 'curriculum'],
  },
];

const GENERAL_ROUTE: SocialLinkRoute = {
  kind: 'general_reference',
  label: '일반 참고자료',
};

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function classifySocialLink(text: string): SocialLinkRoute {
  const normalized = text.toLocaleLowerCase('ko-KR');
  const ranked = ROUTES.map((route, index) => ({
    route,
    index,
    score: route.keywords.filter((keyword) => normalized.includes(keyword)).length,
  }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const best = ranked[0]?.route;
  return best ? { kind: best.kind, label: best.label } : GENERAL_ROUTE;
}

export function buildSocialLinkCaptures(post: InstagramOriginal): SocialLinkCapture[] {
  if (!post.images.length) throw new Error('보존할 공개 미디어를 찾지 못했습니다.');

  const caption = compactText(post.caption);
  const route = classifySocialLink(`${post.author}\n${caption}`);
  const titleSource = caption || (post.author ? `@${post.author}의 Instagram 게시물` : 'Instagram 게시물');
  const title = truncate(titleSource, MAX_TITLE_LENGTH);
  const summary = truncate(caption || '공개 게시물의 원문과 미디어를 저장했습니다.', MAX_SUMMARY_LENGTH);

  return post.images.map((image, index) => ({
    imageUrl: image.url,
    imageKind: image.kind,
    selected: post.selectedIndex === index + 1,
    analysis: {
      category: route.kind === 'place' ? 'place' : 'text',
      title,
      summary,
      extractedText: post.caption,
      tags: [CAPTURED_TAG, UNVERIFIED_TAG, route.label],
      links: [post.url],
      places: [],
      source: 'instagram',
      confidence: 0,
      sourceAccountId: post.author || null,
      sourceIndices: [index],
    },
  }));
}

interface SocialLinkSaveDependencies {
  download: (url: string) => Promise<File>;
  upload: (file: File) => Promise<string>;
  save: (analysis: AnalysisResult, path: string) => Promise<unknown>;
  cleanup: (path: string) => Promise<unknown>;
}

export async function saveSocialLinkCapture(
  capture: SocialLinkCapture,
  deps: SocialLinkSaveDependencies
) {
  const file = await deps.download(capture.imageUrl);
  const path = await deps.upload(file);
  try {
    await deps.save(capture.analysis, path);
  } catch (error) {
    try {
      await deps.cleanup(path);
    } catch {
      // Preserve the database failure if compensating storage cleanup is unavailable.
    }
    throw error;
  }
}
