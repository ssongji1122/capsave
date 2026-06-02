# Scrave — 제품 구조 문서 (Product Spec)

> AI가 스크린샷을 분석해 장소/텍스트를 자동 분류하고 저장하는 개인 아카이브 앱
> 작성 기준: 2026-04-23

---

## 1. 시스템 구성도 (System Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 (User)                             │
│                                                                 │
│     📱 iOS / Android App          🌐 Web Browser               │
│     (Expo React Native)           (Next.js App Router)         │
└────────────────┬──────────────────────────┬────────────────────┘
                 │                          │
                 ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    백엔드 (Backend)                              │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │              Next.js API Routes (Vercel)                 │ │
│   │                                                          │ │
│   │  POST /api/capture     — 인증 유저: 업로드 + AI 분석     │ │
│   │  POST /api/analyze     — 게스트: AI 분석 (저장 없음)     │ │
│   │  POST /api/analyze-batch — 다중 이미지 분석              │ │
│   │  POST /api/upload      — 파일 Supabase Storage 업로드    │ │
│   │  GET  /api/geocode     — 주소 → 위도/경도 변환           │ │
│   │  GET  /api/image       — 이미지 서빙/프록시              │ │
│   │  GET  /api/cron/dau    — DAU 집계 (pg_cron)             │ │
│   └──────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Supabase   │  │ Google AI   │  │  Google     │
│  Database   │  │ (Gemini     │  │  Geocoding  │
│  Storage    │  │  2.5-flash) │  │  API        │
│  Auth       │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 2. IA (정보 구조도, Information Architecture)

```
Scrave
│
├── 🌐 랜딩/게스트 페이지 (/)
│   ├── 헤더 (로고 + 로그인 버튼)
│   ├── 히어로 섹션 (업로드 유도)
│   ├── 업로드존 (단일/다중 이미지)
│   ├── 게스트 캡처 목록 (최대 3개)
│   ├── 지도 티저 (장소 캡처 있을 때만)
│   └── 가입 유도 모달 (3개 초과 시)
│
├── 🔐 인증
│   ├── 로그인 (/login)
│   │   ├── OAuth 버튼 (Google 등)
│   │   └── 로그인 폼
│   └── 콜백 처리 (/auth/callback)
│
└── 🏠 인증 후 앱 (로그인 필요)
    ├── 대시보드 (/dashboard) — 전체 캡처 목록 + 검색
    ├── 장소 (/places) — 장소 카테고리 캡처
    ├── 텍스트 (/texts) — 텍스트 카테고리 캡처
    ├── 지도 (/map) — 장소 핀 지도 뷰
    └── 설정 (/settings)
```

**모바일 앱 구조 (Expo React Native)**
```
Mobile App
│
├── (tabs) 탭 네비게이션
│   ├── 홈 (index) — 전체 캡처 목록
│   ├── 장소 (places) — 장소 목록 + 지도
│   └── 텍스트 (texts) — 텍스트 목록
│
├── 캡처 상세 (/capture/[id])
├── AI 분석 화면 (/capture/analyze)
└── 로그인 (/login)
```

---

## 3. Sitemap (페이지 목록)

| 경로 | 이름 | 접근 권한 | 주요 기능 |
|------|------|-----------|-----------|
| `/` | 랜딩·게스트 홈 | 누구나 | 스크린샷 업로드, 게스트 AI 분석 체험 (최대 3회) |
| `/login` | 로그인 | 비로그인 | OAuth 소셜 로그인 |
| `/auth/callback` | 인증 콜백 | 시스템 | Supabase OAuth 처리 |
| `/dashboard` | 대시보드·홈 | 로그인 필요 | 전체 캡처 목록, 검색, 필터 |
| `/places` | 장소 목록 | 로그인 필요 | 장소 카테고리 캡처, 지도 진입점 |
| `/texts` | 텍스트 목록 | 로그인 필요 | 텍스트 카테고리 캡처 |
| `/map` | 지도 뷰 | 로그인 필요 | 저장된 장소 지도 + 클러스터 |
| `/settings` | 설정 | 로그인 필요 | 계정 설정, 데이터 관리 |

---

## 4. User Flow (핵심 사용자 흐름)

### Flow 1: 게스트 체험 → 가입 전환

```
앱 접속 (/)
    │
    ▼
스크린샷 드래그&드롭 또는 클릭 업로드
    │
    ▼
AnalyzeModal 등장 → AI 분석 중 (Gemini 2.5-flash)
    │
    ├── 분석 완료 → 결과 확인 (카테고리/제목/장소/태그)
    │       │
    │       ▼
    │   [저장하기] 클릭 → 게스트 목록에 추가 (sessionStorage)
    │       │
    │       ▼
    │   3개 초과 시 → 가입 유도 모달 등장
    │       │
    │       ├── [무료로 시작하기] → /login
    │       └── [나중에] → 모달 닫기
    │
    └── 분석 실패 → 에러 메시지 + 재시도
```

### Flow 2: 인증 유저 — 단일 이미지 캡처

```
대시보드 접속 (/dashboard)
    │
    ▼
UploadZone에 이미지 업로드
    │
    ▼
POST /api/capture (파일 업로드 + Gemini AI 분석 동시)
    │
    ▼
AnalyzeModal — 결과 표시
    │
    ├── [저장하기] → Supabase DB + Storage에 저장
    └── [취소] → 모달 닫기
```

### Flow 3: 다중 이미지 배치 분석

```
여러 이미지 동시 업로드 (최대 10장)
    │
    ▼
BatchAnalyzeModal 등장
    │
    ▼
POST /api/analyze-batch → Gemini가 동일 콘텐츠 여부 판단
    │
    ├── 동일 콘텐츠 (예: 스레드 1/17~5/17) → 단일 결과로 병합
    └── 다른 콘텐츠 → 각각 개별 결과 반환
    │
    ▼
결과 목록 표시 → [전체 저장] 또는 개별 선택 저장
```

### Flow 4: 지도에서 장소 탐색

```
/places 또는 사이드바에서 [지도] 클릭
    │
    ▼
/map — 지도 렌더링 (저장된 장소 핀 표시)
    │
    ▼
핀 클릭 → BottomSheet (장소 상세 정보)
    │
    ├── [지도 앱으로 열기] → 네이버지도/카카오맵/구글맵/Tmap 딥링크
    └── [캡처 보기] → 해당 캡처 상세
```

---

## 5. Feature Map (기능 목록)

### 🤖 AI 분석
| 기능 | 상태 | 설명 |
|------|------|------|
| 단일 이미지 분석 | ✅ 완료 | Gemini 2.5-flash, 한국어 출력 |
| 다중 이미지 배치 분석 | ✅ 완료 | 최대 10장, 동일 콘텐츠 병합 |
| 카테고리 자동 분류 | ✅ 완료 | place / text |
| 신뢰도 점수 (confidence) | ✅ 완료 | 0.0~1.0, 검토 필요 캡처 식별 |
| 장소 다중 추출 | ✅ 완료 | places[] 배열, 좌표 포함 |
| 소스 앱 감지 | ✅ 완료 | Instagram/Threads/Naver/Google/YouTube |
| 검토 필요 큐 (UncertainQueue) | 🚧 개발 중 | confidence < 0.5 캡처 별도 표시 |

### 📸 캡처 관리
| 기능 | 상태 | 설명 |
|------|------|------|
| 캡처 저장 | ✅ 완료 | Supabase DB + Storage |
| 캡처 삭제 | ✅ 완료 | 소프트 삭제 (deleted_at) |
| 카테고리 필터 | ✅ 완료 | 전체/장소/텍스트 |
| 텍스트 검색 | ✅ 완료 | 제목/태그/요약 검색 |
| 페이지네이션 | ⚠️ 미완 | 현재 전체 로드, 1000+ 건 대응 필요 |
| 재분류 | ✅ 완료 | reclassified_at 타임스탬프 |

### 🗺️ 지도
| 기능 | 상태 | 설명 |
|------|------|------|
| 장소 핀 지도 | ✅ 완료 | 저장 장소 위도/경도 표시 |
| 지도 앱 연동 | ✅ 완료 | 네이버/카카오/구글/Tmap |
| 장소 바텀시트 | ✅ 완료 | 지도 핀 클릭 시 상세 정보 |
| 지오코딩 | ✅ 완료 | Google Geocoding API |

### 🔐 인증 & 게스트
| 기능 | 상태 | 설명 |
|------|------|------|
| OAuth 로그인 | ✅ 완료 | Supabase Auth |
| 게스트 체험 | ✅ 완료 | 최대 3회, sessionStorage |
| 게스트 → 회원 마이그레이션 | ✅ 완료 | 로그인 시 게스트 캡처 이전 |
| 게스트 분석 rate limit | ⚠️ 취약 | 인메모리 Map, Vercel에서 무효 |

### 🔒 보안 & 인프라
| 기능 | 상태 | 설명 |
|------|------|------|
| RLS (Row Level Security) | ✅ 완료 | DB는 user_id 기반 격리 |
| Storage RLS | ✅ 완료 | Migration 006으로 수정 완료 |
| Private Storage + Signed URL | ✅ 완료 | Migration 007 적용 |
| DAU 집계 | ✅ 완료 | pg_cron, 정의 fix 필요 |
| 파일 크기/타입 검증 | ⚠️ 미완 | /api/upload에 미적용 |

---

## 6. Component Inventory (UI 컴포넌트 목록)

### 웹 (apps/web)

#### Layout
| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `Sidebar` | `components/layout/Sidebar.tsx` | 데스크탑 사이드바 + 모바일 탭바 |

#### Upload
| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `UploadZone` | `components/upload/UploadZone.tsx` | 드래그앤드롭 이미지 업로드 영역 |
| `AnalyzeModal` | `components/upload/AnalyzeModal.tsx` | 단일 이미지 AI 분석 모달 |
| `BatchAnalyzeModal` | `components/upload/BatchAnalyzeModal.tsx` | 다중 이미지 배치 분석 모달 |

#### Captures
| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `CaptureCard` | `components/captures/CaptureCard.tsx` | 개별 캡처 카드 (이미지+메타데이터) |
| `CaptureList` | `components/captures/CaptureList.tsx` | 캡처 목록 (그리드/리스트) |
| `SearchBar` | `components/captures/SearchBar.tsx` | 검색 입력창 |
| `UncertainQueue` | `components/captures/UncertainQueue.tsx` | 낮은 신뢰도 캡처 검토 큐 |

#### Map
| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `MapView` | `components/map/MapView.tsx` | 장소 핀 지도 |
| `BottomSheet` | `components/map/BottomSheet.tsx` | 핀 클릭 시 슬라이드업 상세 |
| `PlacePopup` | `components/map/PlacePopup.tsx` | 지도 핀 팝업 |

#### Auth
| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `OAuthButtons` | `components/auth/OAuthButtons.tsx` | 소셜 로그인 버튼 |
| `GuestMigration` | `components/auth/GuestMigration.tsx` | 게스트 → 회원 데이터 이전 UI |

### 모바일 (apps/mobile)

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `CaptureCard` | `components/CaptureCard.tsx` | 모바일 캡처 카드 |
| `CategoryScreen` | `components/CategoryScreen.tsx` | 카테고리별 목록 화면 |
| `PlaceQuickSearch` | `components/PlaceQuickSearch.tsx` | 장소 빠른 검색 |
| `PlacesMapView` | `components/PlacesMapView.tsx` | 모바일 지도 뷰 |
| `MigrationModal` | `components/MigrationModal.tsx` | 데이터 마이그레이션 안내 모달 |

---

## 7. API Inventory (API 목록)

| 메서드 | 경로 | 인증 | 설명 | 주요 파라미터 |
|--------|------|------|------|---------------|
| POST | `/api/capture` | 로그인 필요 | 업로드 + AI 분석 + DB 저장 원스톱 | `file: File` (multipart) |
| POST | `/api/analyze` | 불필요 (게스트) | AI 분석만 (저장 없음) | `image: string` (base64) |
| POST | `/api/analyze-batch` | 불필요 (게스트) | 다중 이미지 배치 AI 분석 | `images: string[]` (base64) |
| POST | `/api/upload` | 로그인 필요 | Supabase Storage 파일 업로드 | `file: File` (multipart) |
| GET | `/api/geocode` | 불필요 | 주소 → 위도/경도 변환 | `address: string` |
| GET | `/api/image` | 불필요 | 이미지 서빙/리사이즈 프록시 | `url: string` |
| GET | `/api/cron/dau` | Cron 시크릿 | 일별 DAU 집계 트리거 | - |
| GET | `/auth/callback` | 시스템 | OAuth 콜백 처리 | `code: string` |

---

## 8. 데이터 모델 (Data Model)

### captures 테이블 (핵심)
```
captures
├── id              INTEGER   PK
├── user_id         UUID      FK → auth.users (null = 게스트)
├── category        TEXT      'place' | 'text'
├── title           TEXT      AI 생성 제목 (한국어)
├── summary         TEXT      AI 생성 요약 (한국어)
├── places          JSONB     PlaceInfo[] — 장소 배열
├── extracted_text  TEXT      OCR 추출 원문
├── links           TEXT[]    일반 링크
├── tags            TEXT[]    태그 배열
├── source          TEXT      'instagram' | 'threads' | 'naver' | ...
├── image_url       TEXT      Supabase Storage URL
├── confidence      FLOAT     AI 신뢰도 0.0~1.0
├── source_account_id TEXT    소셜 계정 ID (@username)
├── reclassified_at TIMESTAMPTZ 재분류 시각
├── deleted_at      TIMESTAMPTZ 소프트 삭제
└── created_at      TIMESTAMPTZ
```

### PlaceInfo (JSONB 구조)
```json
{
  "name": "장소 이름",
  "address": "주소",
  "date": "YYYY-MM-DD",
  "links": ["https://..."],
  "lat": 37.5665,
  "lng": 126.9780
}
```

### 연관 테이블
```
daily_active_users — DAU 일별 집계
guest_rate_limits  — 게스트 분석 횟수 제한 (IP + 날짜)
```

---

## 9. 패키지 구조 (Monorepo)

```
scrave/                          ← Turborepo 루트
│
├── apps/
│   ├── web/                     ← Next.js 14 (App Router)
│   │   └── src/
│   │       ├── app/             ← 페이지 (App Router)
│   │       ├── components/      ← UI 컴포넌트
│   │       ├── lib/             ← 유틸 (gemini, geocoding, image-utils...)
│   │       ├── hooks/           ← React hooks
│   │       └── contexts/        ← React context
│   │
│   └── mobile/                  ← Expo React Native
│       ├── app/                 ← 화면 (Expo Router)
│       ├── components/          ← UI 컴포넌트
│       ├── services/            ← 비즈니스 로직
│       │   └── analyzers/       ← AI 분석기 (서버/OpenAI 전략 패턴)
│       └── contexts/            ← React context
│
├── packages/
│   └── shared/                  ← 웹·모바일 공유 패키지 (@scrave/shared)
│       └── src/
│           ├── types/           ← TypeScript 타입 (CaptureItem, AnalysisResult...)
│           ├── ai/              ← AI 프롬프트, 결과 파싱
│           ├── supabase/        ← DB 쿼리, 클라이언트, 매퍼
│           ├── tokens/          ← 디자인 토큰 (색상)
│           └── utils/           ← 공유 유틸 (map-linker, auth, date...)
│
└── supabase/
    └── migrations/              ← DB 스키마 마이그레이션 (001~009)
```

---

## 10. 디자인 시스템 요약

| 항목 | 값 |
|------|---|
| 테마 | 다크 모드 전용 (Light 추후 지원) |
| Primary | `#F4845F` (Warm Coral) |
| 장소 Accent | `#34D399` (Mint) |
| 텍스트 Accent | `#7DD3FC` (Sky) |
| AI Accent | `#A78BFA` (Purple) |
| 배경 | `#050508` (미세 남색) |
| 폰트 | Pretendard (한글) + Space Grotesk (영문 라벨) + JetBrains Mono (데이터) |
| 기준 단위 | 4px |
| 그리드 | 1열(모바일) / 2열(태블릿) / 3열(데스크탑) |
| 사이드바 | 240px (데스크탑) / 하단 탭바 (모바일) |

---

## 11. 주요 미해결 이슈 (Open Issues)

| 우선순위 | 항목 | 영향 |
|----------|------|------|
| P1 | 모바일 이미지 Supabase Storage 미업로드 — 로컬 URI 저장 | 타 기기에서 이미지 깨짐 |
| P1 | DAU 정의 오류 — 업로드 횟수 ≠ 실제 세션 활성 | 성장 지표 부정확 |
| P1 | 신뢰도(confidence) 캘리브레이션 미검증 | 검토 큐 기능 무의미해질 위험 |
| P2 | 게스트 rate limit 인메모리 → Vercel에서 무효화 | API 남용 가능 |
| P2 | 전체 캡처 페이지네이션 미적용 — 1000건+ 시 타임아웃 | 확장성 |
| P2 | 배치 분석 이미지-결과 매핑 index 기반 — 병합 시 불일치 | 잘못된 썸네일 |
| P2 | 이모지 아이콘 → SVG 아이콘 라이브러리 교체 | 시각 품질, 접근성 |
| P3 | focus-visible 키보드 네비게이션 스타일 없음 | 접근성 WCAG 미준수 |
| P3 | /api/upload 파일 크기·타입 검증 없음 | 잘못된 파일 저장 |

---

*이 문서는 자동 생성되었습니다. 최신 상태는 코드베이스를 기준으로 업데이트하세요.*
