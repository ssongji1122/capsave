# Design System — CapSave

## Product Context
- **What this is:** 스크린샷을 AI로 분석하여 장소/텍스트를 자동 분류하고 저장하는 개인 아카이브 앱
- **Who it's for:** 한국 사용자. SNS(Instagram, Threads, Naver 등)에서 맛집, 카페, 여행지, 텍스트 정보를 저장하는 사람들
- **Space/industry:** 북마크/큐레이션 + 여행 장소 저장 + AI 콘텐츠 분석
- **Project type:** Web app (Next.js) + Mobile app (Expo React Native)

## Aesthetic Direction
- **Direction:** Curated Archive
- **Decoration level:** Intentional — 미세한 글로우, 반투명 배지, 의미 있는 색상 구분
- **Mood:** 어둠 속에서 따뜻한 빛이 비치는 개인 아카이브. 미니멀하지만 따뜻하고, 도구이면서 동시에 컬렉션. "내 취향의 아카이브를 열어보는" 느낌
- **Reference sites:** Wanderlog (장소별 색상 코딩), Raindrop.io (시각적 북마크 그리드), How We Feel (다크 테마 무드)

## Typography
- **Display/Hero:** Pretendard ExtraBold 800 — 한글 최적화 고딕. 넓은 weight range로 계층 표현
- **Body:** Pretendard Regular 400 / Medium 500 — 가독성 최적화, 본문/요약/설명
- **UI/Labels:** Space Grotesk Medium 500 — 영문 카테고리, 소스 라벨, 메타데이터. 기하학적이면서 따뜻한 인상
- **Data/Tables:** JetBrains Mono Regular 400 — AI가 추출한 링크, 주소, 날짜. "기계가 읽은 정보"를 시각적으로 구분
- **Code:** JetBrains Mono
- **Loading:**
  - Pretendard: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
  - JetBrains Mono + Space Grotesk: Google Fonts
- **Scale:**
  - xs: 11px — 메타데이터, 보조 정보
  - sm: 13px — 태그, 라벨, 부가 텍스트
  - base: 15px — 본문
  - lg: 17px — 카드 제목
  - xl: 20px — 섹션 제목
  - 2xl: 28px — 페이지 제목
  - 3xl: 48px — 히어로

## Color
- **Approach:** Balanced — Primary + 카테고리별 accent + semantic
- **Primary:** `#F4845F` (Warm Coral) — CTA, 저장 확인, 핵심 인터랙션. 따뜻한 빛 느낌
- **Primary Light:** `#F69E80` — hover 상태
- **Primary Surface:** `rgba(244, 132, 95, 0.10)` — 배경 틴트
- **Primary Border:** `rgba(244, 132, 95, 0.25)` — 테두리
- **Place Accent:** `#34D399` (Mint) — 장소 카테고리, 지도 핀, 장소 카드
- **Place Surface:** `rgba(52, 211, 153, 0.08)`
- **Place Border:** `rgba(52, 211, 153, 0.20)`
- **Text Accent:** `#7DD3FC` (Sky) — 텍스트 카테고리, 링크, URL
- **Text Surface:** `rgba(125, 211, 252, 0.08)`
- **Text Border:** `rgba(125, 211, 252, 0.20)`
- **AI Accent:** `#A78BFA` (Purple) — AI 분석 결과 표시, 인텔리전스 마커
- **AI Surface:** `rgba(167, 139, 250, 0.08)`
- **Backgrounds:**
  - Background: `#050508` — 미세한 남색 색조. OLED 전력 절약 + 깊이감
  - Surface: `#0D0D12` — 카드, 시트 배경
  - Surface Elevated: `#14141B` — 모달, 플로팅 요소
  - Border: `#1E1E28` — 구분선, 카드 테두리
  - Border Light: `#2A2A35` — hover 테두리
- **Text Colors:**
  - Primary: `#E8D5B7` — 따뜻한 화이트. 아카이브 무드
  - Secondary: `#9B9B9B` — 보조 텍스트
  - Tertiary: `#5A5A65` — 비활성, placeholder
- **Semantic:**
  - Success: `#34D399`
  - Warning: `#FBBF24`
  - Error: `#F87171`
  - Info: `#7DD3FC`
- **Dark mode:** Primary theme. Light mode는 추후 지원 예정

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Card padding:** 16px
- **Card gap:** 16px
- **Section gap:** 24px

## Layout
- **Approach:** Grid-disciplined
- **Grid:** 1열(mobile ~375px) / 2열(tablet ~768px) / 3열(desktop ~1024px+)
- **Max content width:** 1280px
- **Sidebar:** 240px 고정 (데스크탑), 하단 탭바 (모바일)
- **Border radius:**
  - sm: 8px — 태그, 배지, 작은 요소
  - md: 12px — 버튼, 인풋, 내부 카드
  - lg: 16px — 모달, 패널
  - xl: 24px — 캡처 카드, 메인 컨테이너
  - full: 9999px — 원형 배지, 필터 칩

## Motion
- **Approach:** Intentional — 의미 있는 전환만. 장식적 애니메이션 없음
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(100ms) short(200ms) medium(350ms) long(500ms)
- **Patterns:**
  - 카드 hover: scale(1.01) + border-color 변경, 200ms
  - 모달 등장: fade + slide-up, 350ms ease-out
  - AI 분석 중: pulse 애니메이션 (opacity 0.5~1.0)
  - 페이지 전환: fade, 200ms
  - 바텀시트: slide-up, 350ms ease-out

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-27 | Initial design system created | /design-consultation based on competitive research (Wanderlog, Raindrop.io) + Claude subagent "Digital Darkroom" proposal |
| 2026-03-27 | Primary: Warm Coral (#F4845F) over Amber (#FFB800) | 앰버는 "경고"와 연상. Warm Coral은 place/text/ai accent 모두와 충돌 없이 독립적. 따뜻한 아카이브 무드 |
| 2026-03-27 | AI Accent (#A78BFA) 신규 추가 | AI가 분석한 정보를 시각적으로 구분. 서브에이전트 제안 채택 |
| 2026-03-27 | Text primary: 따뜻한 화이트(#E8D5B7) | 순백(#FFFFFF) 대비 눈 피로 감소 + 아카이브 무드 강화 |
| 2026-03-27 | Background: #050508 (미세 남색) | 순수 검정(#000000) 대비 깊이감. OLED 이점 유지 |
| 2026-03-27 | Typography: Pretendard + JetBrains Mono + Space Grotesk | 한글 최적화 + AI 데이터 시각 구분 + 영문 라벨 차별화 |
