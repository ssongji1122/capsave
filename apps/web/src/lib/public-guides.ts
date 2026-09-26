import {
  getMapLinks,
  type GuideCoordinates,
  type GuidePlace,
  type GuidePlaceCategory,
  type GuideReference,
  type GuideReferenceKind,
  type GuideReferencePreview,
  type GuideStatus,
  type MapLink,
  type PublicGuide,
} from '@scrave/shared';

export type {
  GuideReferenceKind,
  GuidePlaceCategory,
  GuideStatus,
  GuideReferencePreview,
  GuideReference,
  GuideCoordinates,
  GuidePlace,
  PublicGuide,
};

const REFERENCE_CHECKED_AT = '2026-07-29';
const INDONESIA_COUNTRY_CODE = 'ID';
const VERIFIED_IMAGE_REFERENCE_KINDS: GuideReferenceKind[] = [
  'government',
  'official',
];

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
  routeEyebrow: 'ONE DAY · THREE SCENES',
  routeTitle: '낮에서 밤으로 이어지는 순서',
  mapLabel: 'PECATU COAST',
  connectRoute: true,
  shareTitleLines: ['울루와뚜,', '하루의 끝을 따라가는', '세 곳'],
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

const CAPTURE_CHECKED_AT = '2026-09-26';

export const ULUWATU_CAPTURE_GUIDE: PublicGuide = {
  slug: 'uluwatu-cliff-captures',
  status: 'published',
  title: '울루와뚜, 캡처에서 고른 절벽 일곱 곳',
  eyebrow: 'BALI · ULUWATU · CAPTURES',
  description:
    '인스타그램 캡처 네 장에서 찾은 장소와 숙소 후보 세 곳을 3박 동선으로 묶은 공개 여행 노트입니다.',
  location: 'Pecatu & Ungasan, South Kuta, Bali',
  countryCode: INDONESIA_COUNTRY_CODE,
  center: {
    latitude: -8.8275,
    longitude: 115.1229,
  },
  updatedAt: CAPTURE_CHECKED_AT,
  curator: 'Scrave',
  routeEyebrow: 'THREE NIGHTS · SEVEN PLACES',
  routeTitle: '숙소를 옮기며 절벽을 따라가는 순서',
  mapLabel: 'BUKIT PENINSULA',
  connectRoute: false,
  shareTitleLines: ['울루와뚜,', '캡처에서 고른', '절벽 일곱 곳'],
  places: [
    {
      id: 'four-points-ungasan',
      sequence: 1,
      name: 'Four Points by Sheraton Bali, Ungasan',
      localName: '포포인츠 바이 쉐라톤 웅아산',
      category: 'stay',
      address: 'Jl. Raya Uluwatu, Ungasan, South Kuta, Badung, Bali 80364',
      coordinates: {
        latitude: -8.8090429,
        longitude: 115.1588136,
      },
      scene: '01 · 첫 숙소',
      summary:
        '웅아산 언덕에 있는 메리어트 계열 호텔입니다. 숙소 후보 세 곳 가운데 가격대가 가장 낮은 편이라 첫날 숙소로 둡니다.',
      visitWindow: '첫날 체크인',
      practicalNote:
        '울루와뚜 절벽 쪽 식당까지는 차로 이동해야 합니다. 요금은 날짜마다 달라 예약 사이트에서 다시 확인하세요.',
      references: [
        {
          kind: 'official',
          label: '호텔 공식 페이지',
          publisher: 'Marriott',
          url: 'https://www.marriott.com/en-us/hotels/dpsfg-four-points-bali-ungasan/overview/',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '객실 종류와 부대시설 확인',
          preview: {
            title: 'Four Points by Sheraton Bali, Ungasan',
            description: 'Marriott의 호텔 공식 소개 페이지입니다.',
          },
        },
        {
          kind: 'review',
          label: '네이버 블로그 후기',
          publisher: '네이버 블로그 kiesbird',
          url: 'https://blog.naver.com/kiesbird/224191616522',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '2026-02-22 작성. 조식, 수영장, 마사지 경험',
          preview: {
            title: '포포인츠 바이 쉐라톤 웅가산 - 조식, 수영장, 마사지',
            description: '투숙객이 조식과 수영장, 마사지를 직접 이용하고 쓴 후기입니다.',
          },
        },
        {
          kind: 'video',
          label: '호텔 둘러보기 영상',
          publisher: '트래블러 최여사tv',
          url: 'https://www.youtube.com/watch?v=bwerdwi3LMA',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '영상 25·50·75% 지점이 음식과 수영장 장면인 것을 확인',
          preview: {
            title: '발리 포포인츠 쉐라톤 웅가산',
            description: '한 달 살기 중 머문 투숙객이 객실과 수영장, 식사를 보여 주는 영상입니다.',
            imageUrl: 'https://i.ytimg.com/vi/bwerdwi3LMA/hqdefault.jpg',
            imageAlt: '포포인츠 쉐라톤 웅가산 둘러보기 영상 미리보기',
          },
        },
      ],
    },
    {
      id: 'malini',
      sequence: 2,
      name: 'Malini Uluwatu - Seafood & Sunset',
      localName: '말리니 울루와뚜',
      category: 'food',
      address: 'Jalan Raya Malini No.151, Karangboma, Pecatu, Badung, Bali 80361',
      coordinates: {
        latitude: -8.832232,
        longitude: 115.087023,
      },
      scene: '02 · 절벽 위 저녁',
      summary:
        '울루와뚜 사원 근처 절벽 위 해산물 식당입니다. 캡처 글은 해 지는 시간에 맞춰 가라고 권합니다.',
      visitWindow: '해 지기 1시간 전',
      practicalNote:
        '난간 쪽 자리는 일몰 시간대에 빨리 찹니다. 음식 평은 신선하다는 쪽과 기름지거나 미지근했다는 쪽으로 갈립니다.',
      hours: ['매일 08:00–23:00'],
      hoursLabel: '캡처 글 표기 영업시간',
      references: [
        {
          kind: 'official',
          label: '공식 링크 모음',
          publisher: 'Malini Uluwatu',
          url: 'https://linktr.ee/malini_uluwatu',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '메뉴와 예약 경로 확인',
          preview: {
            title: 'malini_uluwatu',
            description: '식당이 직접 운영하는 메뉴·예약 링크 모음입니다.',
          },
        },
        {
          kind: 'editorial',
          label: '방문 가이드',
          publisher: 'SatuSatu',
          url: 'https://satusatu.com/inspiration/malini-uluwatu/',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '일몰 시간대 좌석과 예약 권장 여부 확인',
          preview: {
            title: 'Malini Uluwatu',
            description: '절벽 쪽 좌석과 일몰 시간 방문 팁을 정리한 지역 가이드입니다.',
          },
        },
      ],
    },
    {
      id: 'renaissance-uluwatu',
      sequence: 3,
      name: 'Renaissance Bali Uluwatu Resort & Spa',
      localName: '르네상스 발리 울루와뚜',
      category: 'stay',
      address: '1 Jalan Pantai Balangan, Ungasan, South Kuta, Badung, Bali 80361',
      coordinates: {
        latitude: -8.8129776,
        longitude: 115.1448834,
      },
      scene: '03 · 두 번째 숙소',
      summary:
        '발랑안 해변 쪽 언덕의 메리어트 계열 리조트입니다. 최근 블로그 후기 두 편이 스위트 업그레이드와 체크아웃 뒤 샤워 시설을 다룹니다.',
      visitWindow: '둘째 날 체크인',
      practicalNote:
        '객실 종류에 따라 가격 차이가 큽니다. 원하는 객실과 조식 포함 여부를 예약 전에 맞춰 보세요.',
      references: [
        {
          kind: 'official',
          label: '호텔 공식 페이지',
          publisher: 'Marriott',
          url: 'https://www.marriott.com/en-us/hotels/dpsuw-renaissance-bali-uluwatu-resort-and-spa/overview/',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '객실 종류와 부대시설 확인',
          preview: {
            title: 'Renaissance Bali Uluwatu Resort & Spa',
            description: 'Marriott의 리조트 공식 소개 페이지입니다.',
          },
        },
        {
          kind: 'review',
          label: '네이버 블로그 후기',
          publisher: '네이버 블로그 kyoungminly',
          url: 'https://blog.naver.com/kyoungminly/224356408051',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '2026-07-24 작성. 객실, 조식, 체크아웃 뒤 샤워',
          preview: {
            title: '르네상스 발리 울루와뚜 후기',
            description: '객실과 조식, 체크아웃 뒤 무료 샤워 시설을 다룬 투숙 후기입니다.',
          },
        },
        {
          kind: 'video',
          label: '호텔과 주변 영상',
          publisher: '셩이',
          url: 'https://www.youtube.com/watch?v=bB5m73iPpSA',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '영상 25·50·75% 지점이 객실과 조식 장면인 것을 확인',
          preview: {
            title: '발리 울루와뚜 르네상스 호텔 & 핀스 비치 클럽',
            description: '르네상스 객실과 조식, 근처 비치 클럽과 짐바란 식당을 담은 영상입니다.',
            imageUrl: 'https://i.ytimg.com/vi/bB5m73iPpSA/maxresdefault.jpg',
            imageAlt: '르네상스 발리 울루와뚜 여행 영상 미리보기',
          },
        },
      ],
    },
    {
      id: 'oneeighty',
      sequence: 4,
      name: 'Oneeighty Dayclub',
      localName: '원에이티 데이클럽',
      category: 'activity',
      address: 'Jl. Goa Lempeh, Banjar Dinas Kangin, Pecatu, Uluwatu, Bali 80361',
      coordinates: {
        latitude: -8.8461495,
        longitude: 115.1254047,
      },
      scene: '04 · 오후의 유리 수영장',
      summary:
        'The Edge 리조트 안의 데이클럽입니다. 절벽 밖으로 튀어나온, 바닥이 유리인 수영장이 있습니다.',
      visitWindow: '오후 4시쯤 들어가 일몰까지',
      practicalNote:
        '입장료는 캡처 글에 50만 루피아, 2026년 6월 가이드에 70만 루피아로 서로 다릅니다. 식음료 크레딧 포함 여부와 최신 가격을 예약 전에 확인하세요.',
      hours: ['매일 10:00–21:00'],
      hoursLabel: '캡처 글 표기 영업시간',
      references: [
        {
          kind: 'official',
          label: '공식 사이트',
          publisher: 'One Eighty Dayclub',
          url: 'https://oneeightybali.com/',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '주소와 유리 수영장 사진 확인',
          preview: {
            title: 'One Eighty Dayclub',
            description: 'The Edge 리조트가 운영하는 데이클럽 공식 사이트입니다.',
            imageUrl:
              'https://storage.googleapis.com/production-gator-v1-0-8/648/1022648/7wJcS29F/1805660c063542e0a5bb113d0b6b81f4',
            imageAlt: '절벽 밖으로 튀어나온 원에이티 유리 바닥 수영장',
          },
        },
        {
          kind: 'editorial',
          label: '2026 가격 가이드',
          publisher: 'ELSKY Bali',
          url: 'https://elsky-bali.com/en/beach-club-oneeighty-en/',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '입장료와 식음료 크레딧 금액 확인',
          preview: {
            title: 'Beach Club Oneeighty',
            description: '입장료와 크레딧 구성을 정리한 2026년 6월 가이드입니다.',
          },
        },
      ],
    },
    {
      id: 'anantara-uluwatu',
      sequence: 5,
      name: 'Anantara Uluwatu Bali Resort',
      localName: '아난타라 울루와뚜',
      category: 'stay',
      address: 'Jalan Pemutih, Pecatu, South Kuta, Badung, Bali 80362',
      coordinates: {
        latitude: -8.8088718,
        longitude: 115.1085807,
      },
      scene: '05 · 마지막 숙소',
      summary:
        '임파서블 비치 위 절벽에 계단식으로 들어선 리조트입니다. 숙소 후보 세 곳 가운데 가장 비싸서 마지막 밤 한 번만 둡니다.',
      visitWindow: '셋째 날 체크인',
      practicalNote:
        '오션프런트 스위트와 풀 스위트의 가격 차이가 작습니다. 두 객실을 같은 날짜로 함께 조회해 보세요.',
      references: [
        {
          kind: 'official',
          label: '리조트 공식 페이지',
          publisher: 'Anantara',
          url: 'https://www.anantara.com/en/uluwatu-bali',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '객실 종류와 식당 확인',
          preview: {
            title: 'Anantara Uluwatu Bali Resort',
            description: 'Anantara의 리조트 공식 소개 페이지입니다.',
          },
        },
        {
          kind: 'review',
          label: '네이버 블로그 후기',
          publisher: '네이버 블로그 leeworld_',
          url: 'https://blog.naver.com/leeworld_/224098998713',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '2025-12-05 작성. 직접 결제한 투숙 후기',
          preview: {
            title: '울루와뚜 숙소 아난타라 내돈내산 후기',
            description: '직접 결제하고 머문 투숙객의 아난타라 후기입니다.',
          },
        },
        {
          kind: 'video',
          label: '오션프런트 스위트 영상',
          publisher: 'Lilac and Grey Adventures',
          url: 'https://www.youtube.com/watch?v=9bRqcV1PQo0',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '영상 25·50·75% 지점이 객실과 해변 장면인 것을 확인',
          preview: {
            title: 'Anantara Uluwatu Resort & Spa - Full Tour',
            description: '오션프런트 스위트와 리조트 시설을 처음부터 끝까지 보여 주는 영상입니다.',
            imageUrl: 'https://i.ytimg.com/vi/9bRqcV1PQo0/maxresdefault.jpg',
            imageAlt: '아난타라 울루와뚜 리조트 전경 영상 미리보기',
          },
        },
      ],
    },
    {
      id: 'istana-sound-bath',
      sequence: 6,
      name: 'The Istana · Let it Flow Sound Bath',
      localName: '더 이스타나 사운드배스',
      category: 'activity',
      address: 'Jl. Pantai Suluban, Pecatu, South Kuta, Badung, Bali 80361',
      coordinates: {
        latitude: -8.818284,
        longitude: 115.088011,
      },
      scene: '06 · 월요일 해 질 녘',
      summary:
        '해 질 녘 인피니티 풀에 에어매트를 띄우고 싱잉볼 소리를 듣는 행사입니다. 캡처에 장소 이름이 없어 장면과 행사 설명으로 찾았습니다.',
      visitWindow: '월요일 17:30–18:30',
      practicalNote:
        '성인 전용이고 휴대폰 사용을 막는 곳입니다. 표는 환불되지 않으니 인스타그램 사진과 캡처 장면을 대조한 뒤 예약하세요.',
      hours: ['매주 월요일 17:30–18:30'],
      hoursLabel: '예약 페이지 표기 일정',
      references: [
        {
          kind: 'official',
          label: '행사 공식 안내',
          publisher: 'The Istana',
          url: 'https://theistana.com/events/soundbath/',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '행사 구성과 환불 불가 조건 확인',
          preview: {
            title: 'Sound Bath at The Istana',
            description: 'The Istana가 직접 안내하는 사운드배스 행사 페이지입니다.',
          },
        },
        {
          kind: 'official',
          label: '예약 페이지',
          publisher: 'Momence',
          url: 'https://momence.com/The-Istana/Let-it-Flow-Sound-Bath/131767715',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '요일과 시간 확인',
          preview: {
            title: 'Let it Flow Sound Bath',
            description: 'The Istana 계정으로 열린 행사 예약 페이지입니다.',
          },
        },
      ],
    },
    {
      id: 'ungasan-clifftop',
      sequence: 7,
      name: 'The Ungasan Clifftop Resort',
      localName: '더 웅아산 클리프탑 리조트',
      category: 'stay',
      address: 'Jalan Pantai Selatan Gau, Banjar Wijaya Kusuma, Ungasan, Bali',
      coordinates: {
        latitude: -8.846188,
        longitude: 115.1473393,
      },
      scene: '07 · 예산 밖 후보',
      summary:
        '모든 빌라에 절벽 쪽 풀이 딸린 리조트입니다. 1박 가격이 다른 숙소 후보보다 크게 높아서, 절벽 아래 선데이즈 비치클럽으로 분위기만 보는 방법도 있습니다.',
      visitWindow: '예산이 남을 때',
      practicalNote:
        '검색 시작가는 1박 $429부터이고 평균은 그보다 높습니다. 날짜를 넣어 조회해야 실제 가격이 나옵니다.',
      references: [
        {
          kind: 'official',
          label: '리조트 공식 사이트',
          publisher: 'The Ungasan',
          url: 'https://theungasan.com/',
          checkedAt: CAPTURE_CHECKED_AT,
          note: '주소와 빌라 구성, 식당 확인',
          preview: {
            title: 'The Ungasan Clifftop Resort',
            description: '절벽 위 빌라와 선데이즈 비치클럽을 소개하는 리조트 공식 사이트입니다.',
            imageUrl:
              'https://cdn.theungasan.com/wp-content/uploads/2026/08/Screenshot-2026-08-07-at-1.59.15-pm-scaled.png',
            imageAlt: '바다 옆 절벽 위에 흩어진 웅아산 리조트 빌라 항공 사진',
          },
        },
      ],
    },
  ],
};

export const PUBLIC_GUIDES: PublicGuide[] = [ULUWATU_GUIDE, ULUWATU_CAPTURE_GUIDE];

const PUBLISHED_GUIDES = new Map<string, PublicGuide>(
  PUBLIC_GUIDES.map((guide) => [guide.slug, guide])
);

const GUIDE_REFERENCE_PREVIEW_IMAGE_URLS = new Set(
  PUBLIC_GUIDES.flatMap((guide) =>
    guide.places.flatMap((place) =>
      place.references.flatMap((reference) =>
        reference.preview.imageUrl ? [reference.preview.imageUrl] : []
      )
    )
  )
);

const KOREAN_PLACE_COUNTS = [
  '',
  '한',
  '두',
  '세',
  '네',
  '다섯',
  '여섯',
  '일곱',
  '여덟',
  '아홉',
  '열',
];

export function formatPlaceCount(count: number): string {
  const word = KOREAN_PLACE_COUNTS[count];
  return word ? `${word} 곳` : `${count}곳`;
}

export function findPublicGuide(slug: string): PublicGuide | null {
  return PUBLISHED_GUIDES.get(slug) ?? null;
}

export function isGuideReferencePreviewImageUrl(url: string): boolean {
  return GUIDE_REFERENCE_PREVIEW_IMAGE_URLS.has(url);
}

export function getGuideReferencePreviewImagePath(
  reference: GuideReference,
): string | null {
  if (!reference.preview.imageUrl) {
    return null;
  }

  return `/api/guide-preview-image?src=${encodeURIComponent(reference.preview.imageUrl)}`;
}

export function getGuidePlaceImageReference(
  place: GuidePlace,
): GuideReference | null {
  return (
    place.references.find(
      ({ kind, preview }) =>
        VERIFIED_IMAGE_REFERENCE_KINDS.includes(kind) && Boolean(preview.imageUrl)
    ) ?? null
  );
}

export function getGuideMapLinks(
  place: GuidePlace,
  countryCode: string = INDONESIA_COUNTRY_CODE,
): MapLink[] {
  return getMapLinks(place.name, place.address, {
    countryCode,
    coordinates: place.coordinates,
  });
}
