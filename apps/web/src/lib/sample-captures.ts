import type { CaptureItem } from '@scrave/shared';

export const SAMPLE_USER_ID = 'scrave-sample';

const SAMPLE_PLACE_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%23EAE4D7'/%3E%3Crect x='48' y='48' width='544' height='324' rx='28' fill='%23F3EFE6' stroke='%23DDD7CC'/%3E%3Crect x='82' y='82' width='210' height='258' rx='20' fill='%23EAE4D7'/%3E%3Cpath d='M186 126c-39 0-70 30-70 68 0 52 70 120 70 120s70-68 70-120c0-38-31-68-70-68zm0 94a28 28 0 1 1 0-56 28 28 0 0 1 0 56z' fill='%23F0383C'/%3E%3Crect x='318' y='96' width='200' height='22' rx='11' fill='%23161513'/%3E%3Crect x='318' y='142' width='226' height='14' rx='7' fill='%236B675E' opacity='.7'/%3E%3Crect x='318' y='172' width='180' height='14' rx='7' fill='%236B675E' opacity='.45'/%3E%3Crect x='318' y='226' width='120' height='32' rx='16' fill='%23F0383C' opacity='.14'/%3E%3Crect x='318' y='286' width='220' height='12' rx='6' fill='%23DDD7CC'/%3E%3C/svg%3E";
const SAMPLE_TEXT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%23EAE4D7'/%3E%3Crect x='54' y='44' width='532' height='332' rx='28' fill='%23F3EFE6' stroke='%23DDD7CC'/%3E%3Crect x='92' y='82' width='150' height='26' rx='13' fill='%238EA8F2' opacity='.35'/%3E%3Crect x='92' y='136' width='420' height='20' rx='10' fill='%23161513'/%3E%3Crect x='92' y='178' width='360' height='14' rx='7' fill='%236B675E' opacity='.7'/%3E%3Crect x='92' y='210' width='404' height='14' rx='7' fill='%236B675E' opacity='.5'/%3E%3Crect x='92' y='242' width='310' height='14' rx='7' fill='%236B675E' opacity='.5'/%3E%3Crect x='92' y='300' width='128' height='34' rx='17' fill='%231D63C6' opacity='.14'/%3E%3Crect x='242' y='300' width='116' height='34' rx='17' fill='%238EA8F2' opacity='.25'/%3E%3C/svg%3E";

export const SAMPLE_CAPTURES: readonly CaptureItem[] = [
  {
    id: -9001,
    category: 'place',
    title: '성수 브런치 저장 샘플',
    summary: 'SNS 캡처에서 장소명, 주소, 태그를 뽑아 지도와 리뷰 검색으로 이어지는 예시입니다.',
    places: [
      {
        name: '오브젝트 성수',
        address: '서울 성동구 연무장길',
        lat: 37.5446,
        lng: 127.0557,
      },
    ],
    extractedText: '성수 브런치 카페 오브젝트 성수, 연무장길 근처 저장',
    links: ['https://example.com/scrave-place-sample'],
    tags: ['성수', '브런치', '지도'],
    source: 'instagram',
    imageUrl: SAMPLE_PLACE_IMAGE,
    createdAt: '2026-06-22T09:00:00.000Z',
    userId: SAMPLE_USER_ID,
    confidence: 0.94,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: '@scrave_sample',
    keyInsights: ['장소명과 주소가 지도 핀으로 연결됩니다'],
    relatedSearchTerms: ['성수 브런치', '성수 카페 지도'],
  },
  {
    id: -9002,
    category: 'text',
    title: '여행 준비 메모 샘플',
    summary: '텍스트 캡처에서 핵심 문장과 관련 검색어를 추출해 나중에 다시 찾는 예시입니다.',
    places: [],
    extractedText: '제주 동쪽 여행 준비: 우도 배 시간, 렌터카 충전소, 비 오는 날 실내 코스 확인',
    links: ['https://example.com/scrave-text-sample'],
    tags: ['제주', '여행준비', '메모'],
    source: 'naver',
    imageUrl: SAMPLE_TEXT_IMAGE,
    createdAt: '2026-06-21T12:30:00.000Z',
    userId: SAMPLE_USER_ID,
    confidence: 0.91,
    reclassifiedAt: null,
    deletedAt: null,
    sourceAccountId: null,
    keyInsights: ['관련 검색어를 눌러 후속 조사를 이어갈 수 있습니다', '긴 텍스트는 전문보기로 확인합니다'],
    relatedSearchTerms: ['제주 동쪽 여행 코스', '우도 배 시간', '제주 전기차 충전소'],
  },
];

export function isSampleCapture(capture: CaptureItem): boolean {
  return capture.userId === SAMPLE_USER_ID;
}

export function getVisibleArchiveCaptures(
  captures: readonly CaptureItem[],
): CaptureItem[] {
  return captures.length > 0 ? [...captures] : [...SAMPLE_CAPTURES];
}
