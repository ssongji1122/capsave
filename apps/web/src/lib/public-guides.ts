import { getMapLinks, type MapLink } from '@scrave/shared';

export type GuideReferenceKind = 'government' | 'official' | 'editorial' | 'video';
export type GuidePlaceCategory = 'culture' | 'beach' | 'food';

export interface GuideReference {
  kind: GuideReferenceKind;
  label: string;
  publisher: string;
  url: string;
  checkedAt: string;
  note: string;
  preview: GuideReferencePreview;
}

export interface GuideReferencePreview {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
}

export interface GuideCoordinates {
  latitude: number;
  longitude: number;
}

export interface GuidePlace {
  id: string;
  sequence: number;
  name: string;
  localName: string;
  category: GuidePlaceCategory;
  address: string;
  coordinates: GuideCoordinates;
  scene: string;
  summary: string;
  visitWindow: string;
  practicalNote: string;
  hours?: string[];
  references: GuideReference[];
}

export interface PublicGuide {
  slug: string;
  status: 'published';
  title: string;
  eyebrow: string;
  description: string;
  location: string;
  countryCode: string;
  center: GuideCoordinates;
  updatedAt: string;
  curator: string;
  places: GuidePlace[];
}

const REFERENCE_CHECKED_AT = '2026-07-29';
const INDONESIA_COUNTRY_CODE = 'ID';

export const ULUWATU_GUIDE: PublicGuide = {
  slug: 'uluwatu-afterglow',
  status: 'published',
  title: '울루와뚜, 하루의 끝을 따라가는 세 곳',
  eyebrow: 'BALI · ULUWATU',
  description:
    '작은 해변에서 시작해 절벽 사원의 해 질 녘을 지나 선셋 바로 이어지는 공개 여행 노트입니다.',
  location: 'Pecatu, South Kuta, Bali',
  countryCode: INDONESIA_COUNTRY_CODE,
  center: {
    latitude: -8.8185,
    longitude: 115.0936,
  },
  updatedAt: REFERENCE_CHECKED_AT,
  curator: 'Scrave',
  places: [
    {
      id: 'padang-padang',
      sequence: 1,
      name: 'Padang Padang Beach',
      localName: 'Pantai Padang Padang',
      category: 'beach',
      address: 'Jl. Labuan Sait, Pecatu, South Kuta, Badung, Bali',
      coordinates: {
        latitude: -8.8112154,
        longitude: 115.103637,
      },
      scene: '01 · 낮의 물빛',
      summary:
        '바위 틈의 계단을 내려가 만나는 작은 해변입니다. 인도네시아 관광청은 흰 모래, 맑은 물, 파도와 서핑 환경을 이곳의 특징으로 소개합니다.',
      visitWindow: '사람이 몰리기 전 오전',
      practicalNote:
        '해변까지 계단을 내려가야 합니다. 파도와 조수 상태는 당일 현장에서 다시 확인하세요.',
      references: [
        {
          kind: 'government',
          label: '장소 정보 확인',
          publisher: 'Indonesia Travel',
          url: 'https://www.indonesia.travel/gb/en/destination/bali-nusa-tenggara/bali/pantai-padang-padang',
          checkedAt: REFERENCE_CHECKED_AT,
          note: '지형, 계단 접근, 해변과 서핑 환경 확인',
          preview: {
            title: 'Pantai Padang-Padang',
            description:
              'Indonesia Travel의 Padang Padang Beach 소개 페이지 미리보기입니다.',
            imageUrl:
              'https://www.indonesia.travel/contentassets/0e96a63832d241d2a1d7e1ef7e185802/pantai-padang-padang.jpg',
            imageAlt: 'Padang Padang Beach 절벽과 바다 미리보기',
          },
        },
        {
          kind: 'editorial',
          label: '2025 지역 가이드',
          publisher: 'StephMyLifeTravel',
          url: 'https://www.stephmylifetravel.com/uluwatu-travel-guide/',
          checkedAt: REFERENCE_CHECKED_AT,
          note: '지역 간 이동과 체류 구역을 판단하는 참고 자료',
          preview: {
            title: 'Uluwatu Travel Guide 2025',
            description:
              'Bukit Peninsula의 해변, 선셋 포인트, 체류 구역을 정리한 지역 가이드입니다.',
            imageUrl:
              'https://www.stephmylifetravel.com/wp-content/uploads/2025/05/Facetune_17-07-2018-21-15-42-1024x838.jpg',
            imageAlt: 'Uluwatu 해안 여행 가이드 미리보기',
          },
        },
      ],
    },
    {
      id: 'uluwatu-temple',
      sequence: 2,
      name: 'Uluwatu Temple',
      localName: 'Pura Luhur Uluwatu',
      category: 'culture',
      address: 'Pecatu, South Kuta, Badung Regency, Bali',
      coordinates: {
        latitude: -8.8293693,
        longitude: 115.0843428,
      },
      scene: '02 · 절벽의 해 질 녘',
      summary:
        '인도양 위 절벽에 자리한 사원입니다. 발리 관광청은 해 질 녘 전망과 매일 열리는 케착 공연을 대표 경험으로 안내합니다.',
      visitWindow: '해 지기 1시간 30분 전',
      practicalNote:
        '종교 공간의 복장과 관람 규칙을 따르세요. 공연 시간과 입장 조건은 방문 직전 다시 확인하는 편이 안전합니다.',
      references: [
        {
          kind: 'government',
          label: '관광청 공식 안내',
          publisher: 'Bali Government Tourism Office',
          url: 'https://disparda.baliprov.go.id/en/uluwatu-clip/2020/04/',
          checkedAt: REFERENCE_CHECKED_AT,
          note: '위치, 절벽 전망, 케착 공연 정보 확인',
          preview: {
            title: 'Uluwatu Temple',
            description:
              'Bali Government Tourism Office의 Uluwatu Temple 안내 페이지입니다.',
            imageUrl:
              'https://disparda.baliprov.go.id/wp-content/uploads/2020/04/uluwatu2.jpg',
            imageAlt: 'Uluwatu Temple 절벽 전망 미리보기',
          },
        },
        {
          kind: 'video',
          label: '동선 영상 참고',
          publisher: 'Fit Nomads',
          url: 'https://www.youtube.com/watch?v=1dtDz7cO2I0',
          checkedAt: REFERENCE_CHECKED_AT,
          note: '2025 게시 영상의 제목, 설명, 게시 시점 확인',
          preview: {
            title: 'The BEST of ULUWATU 2025',
            description:
              '해변, 음식, 현지 팁을 영상으로 확인하는 Uluwatu 여행 참고 자료입니다.',
            imageUrl: 'https://i.ytimg.com/vi/1dtDz7cO2I0/maxresdefault.jpg',
            imageAlt: 'Uluwatu 2025 여행 영상 미리보기',
          },
        },
      ],
    },
    {
      id: 'single-fin',
      sequence: 3,
      name: 'Single Fin Bali',
      localName: 'Single Fin',
      category: 'food',
      address: 'Pantai Suluban, Jl. Labuan Sait, Pecatu, Bali 80361',
      coordinates: {
        latitude: -8.814972,
        longitude: 115.088896,
      },
      scene: '03 · 해가 진 뒤',
      summary:
        '술루반 절벽 위에 있는 바입니다. 공식 사이트에서 주소, 예약 경로, 요일별 영업시간을 직접 확인할 수 있습니다.',
      visitWindow: '노을 직전부터 저녁',
      practicalNote:
        '수요일과 일요일은 공식 표기상 늦게까지 운영합니다. 행사와 좌석은 공식 예약 페이지에서 다시 확인하세요.',
      hours: [
        '월·화·목·금·토 08:00–22:00',
        '수·일 08:00–02:00',
      ],
      references: [
        {
          kind: 'official',
          label: '공식 운영 정보',
          publisher: 'Single Fin Bali',
          url: 'https://www.singlefinbali.com/contact/',
          checkedAt: REFERENCE_CHECKED_AT,
          note: '주소, 연락처, 요일별 영업시간 확인',
          preview: {
            title: 'Single Fin Contact',
            description:
              'Single Fin Bali의 주소, 연락처, 예약 경로를 확인하는 공식 페이지입니다.',
            imageUrl:
              'https://www.singlefinbali.com/wp-content/uploads/2024/06/contact-hero.webp',
            imageAlt: 'Single Fin Bali 절벽 바 미리보기',
          },
        },
        {
          kind: 'video',
          label: '최근 여행 영상',
          publisher: 'Dane and Stacey',
          url: 'https://www.youtube.com/watch?v=cHAfb0SmKaA',
          checkedAt: REFERENCE_CHECKED_AT,
          note: '2026 게시 영상의 제목, 설명, 게시 시점 확인',
          preview: {
            title: 'How is ULUWATU Bali in 2026?',
            description:
              'Uluwatu의 숙소, 해변, 식음료 비용을 최근 여행 영상으로 확인합니다.',
            imageUrl: 'https://i.ytimg.com/vi/cHAfb0SmKaA/maxresdefault.jpg',
            imageAlt: 'Uluwatu Bali 2026 여행 영상 미리보기',
          },
        },
      ],
    },
  ],
};

const PUBLISHED_GUIDES = new Map<string, PublicGuide>([
  [ULUWATU_GUIDE.slug, ULUWATU_GUIDE],
]);

const GUIDE_REFERENCE_PREVIEW_IMAGE_URLS = new Set(
  ULUWATU_GUIDE.places.flatMap((place) =>
    place.references.map((reference) => reference.preview.imageUrl)
  )
);

export function findPublicGuide(slug: string): PublicGuide | null {
  return PUBLISHED_GUIDES.get(slug) ?? null;
}

export function isGuideReferencePreviewImageUrl(url: string): boolean {
  return GUIDE_REFERENCE_PREVIEW_IMAGE_URLS.has(url);
}

export function getGuideReferencePreviewImagePath(
  reference: GuideReference,
): string {
  return `/api/guide-preview-image?src=${encodeURIComponent(reference.preview.imageUrl)}`;
}

export function getGuideMapLinks(place: GuidePlace): MapLink[] {
  return getMapLinks(place.name, place.address, {
    countryCode: INDONESIA_COUNTRY_CODE,
    coordinates: place.coordinates,
  });
}
