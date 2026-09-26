# 캡처에서 가이드 만들기 — 설계 v1

> 작성일: 2026-09-26 · 상태: 1~3단계 구현(웹), 4~6단계 미착수 · 담당 역할: 042
> 1~3단계(마이그레이션 없음)는 같은 브랜치에 구현했습니다. 마이그레이션 실행과 PR 생성은 하지 않았습니다. 구현 현황은 10절에 있습니다.
> 표시 규칙: **[!]** 는 대표 결재가 필요한 항목입니다.

---

## 0. 요약

- 사용자가 자기 장소 캡처 2~10장을 고르면, 서버가 캡처 속 장소를 모아 Gemini로 **순서·방문 시간·가기 전 확인**을 정한 **가이드 초안**을 만듭니다. 초안은 지금의 공개 가이드와 같은 모양(`PublicGuide`)이라 `PublicGuideExperience` 컴포넌트를 그대로 써서 보여 줍니다.
- 추천 데이터 모델은 **새 `guides` 테이블(본문은 JSONB 스냅샷, 기본 비공개, 링크 공개만 허용)** 입니다. 기존 `captures` 테이블을 재사용하는 안은 공개 링크를 만들 수 없고 RLS를 넓혀야 해서 추천하지 않습니다.
- 단, 마이그레이션 결재 전에도 가치를 확인할 수 있도록 **1~3단계 PR은 마이그레이션 없이** 진행합니다. 3단계까지는 초안을 만들어 보여 주고, 저장은 기존 「내 지도에 저장」(`guide-save.ts`, 캡처 한 건으로 저장) 경로를 씁니다.
- 가이드 한 건을 만드는 Gemini 비용은 약 **0.007달러(약 9원)** 로 추정합니다. 비용보다 **YouTube Data API 일일 쿼터**가 먼저 병목이라, 후기·영상은 생성할 때 자동으로 붙이지 않고 소유자가 장소별로 요청할 때만 붙입니다.

---

## 1. 배경과 범위

### 1.1 지금 있는 것 (2026-09-26 기준)

| 항목 | 위치 | 내용 |
|------|------|------|
| 공개 가이드 타입·데이터 | `apps/web/src/lib/public-guides.ts` | `PublicGuide`, `GuidePlace`, `GuideReference` 타입과 정적 가이드 두 편(`ULUWATU_GUIDE`, `ULUWATU_CAPTURE_GUIDE`). 코드에 박힌 데이터입니다. |
| 공개 가이드 화면 | `apps/web/src/components/guides/PublicGuideExperience.tsx`, `app/g/[slug]/page.tsx` | `guide`, `canonicalUrl` 두 prop만 받는 읽기 전용 화면. `generateStaticParams`로 정적 생성합니다. |
| 내 지도에 저장 | `apps/web/src/lib/guide-save.ts`, `components/guides/SaveGuideButton.tsx` | 가이드를 `AnalysisResult`로 바꿔 `captures` 한 건으로 저장. `guide:<slug>` 태그로 중복 저장을 막고 무료 한도(100건)를 지킵니다. |
| 골라 둔 후기·영상 | `lib/review-curation.ts`, `lib/place-review-sources.ts`, `app/api/place-reviews/route.ts` | 장소 이름 하나로 네이버 블로그·YouTube를 공식 API로 찾고 협찬·AI 음성·얼굴 위주 영상을 거릅니다. 로그인 필요, 24시간 캐시. 웹 `CaptureCard`, 모바일 `services/place-reviews.ts`가 씁니다. |
| AI 모델 설정 | `packages/shared/src/ai/config.ts` | `AI_MODEL = 'gemini-2.5-flash'` 단일 출처. 기존 라우트는 모두 `thinkingBudget: 0`. |

### 1.2 이번 기능의 범위

- 포함: 캡처 여러 장 선택 → 장소 모으기 → 순서·방문 시간·가기 전 확인 생성 → 초안 확인·수정 → 저장(비공개) → 링크 공유(선택) → 장소별 후기·영상 붙이기.
- 제외(v1): 검색 노출되는 완전 공개 가이드, 다른 사람 가이드 편집·협업, 영업시간·가격 자동 기입, 기존 정적 가이드 두 편의 DB 이관, 여러 날 일정표 전용 UI.

### 1.3 기존 원칙과의 정합

- **DECISIONS.md(2026-07-30)**: 원본 URL·작성자·이미지 묶음을 보존하고, 검증 전에는 확정 지식으로 단정하지 않습니다. → 가이드는 원본 캡처 ID를 보존하고, AI가 만든 문장은 「AI 초안」으로 표시하며, 영업시간·가격 같은 사실은 AI가 쓰지 않습니다(4.4절).
- **AGENTS.md·CLAUDE.md**: TDD, 순수 로직은 `web/src/lib/` 또는 `shared/src/`, 라우트는 추출한 순수 함수만 호출, 새 의존성은 묻고 추가. → 이 설계는 새 의존성을 쓰지 않습니다(드래그 정렬도 위·아래 버튼으로 시작).
- **DESIGN.md**: AI가 만든 정보는 AI Accent `#A78BFA`, 장소는 Place Accent `#34D399`, 핵심 CTA는 Primary `#F4845F`, AI 분석 중에는 pulse, 바텀시트는 350ms slide-up. 새 색·폰트를 만들지 않습니다.
- **PRODUCT_SPEC.md**: Flow 3(배치 분석 최대 10장)과 같은 상한을 씁니다. 프롬프트는 `packages/shared/src/ai/`에 둡니다.

---

## 2. 사용자 흐름

### 2.1 웹

```
/places 또는 /dashboard
    │  [가이드 만들기] (Primary 코랄 버튼) → 선택 모드
    ▼
캡처 카드 선택 (장소 캡처만 선택 가능, 2~10장)
    │  하단 고정 바: "3장 · 장소 8곳"  [초안 만들기]
    ▼
(선택) 여행 조건 시트
    │  며칠인가요? (당일 / 1박 / 2박 / 3박 이상) · 숙소 포함 여부는 자동 감지
    ▼
POST /api/guides/draft  ── 생성 중 모달 (AI Accent pulse, "순서를 정하는 중")
    │
    ├─ 성공 → 초안 화면 /guides/new (3단계) 또는 /guides/[id]/edit (4단계 이후)
    │     · 상단 배지 "AI 초안 · 방문 전 확인 필요" (AI Accent)
    │     · PublicGuideExperience 미리보기 + 편집 패널
    │     · 장소별: 순서 위/아래, 빼기, 방문 시간·가기 전 확인 문장 수정
    │     · 장소별 [후기·영상 붙이기] → /api/place-reviews 결과에서 골라 넣기
    │     · [내 지도에 저장]  [저장] (4단계)  [링크 공유] (5단계)
    │
    ├─ 좌표 없는 장소 → "위치 확인 필요" 목록으로 분리, 사용자가 빼거나 주소 수정
    └─ 실패 → 오류 문구 + [다시 시도]. Gemini 응답이 규칙을 어기면 거리순 대체 순서로 초안을 만들고 "AI 순서를 만들지 못해 거리순으로 놓았습니다"를 알립니다.
```

### 2.2 모바일 (Expo)

```
장소 탭 목록
    │  카드 길게 누르기 → 다중 선택 모드 (체크 표시, 상단에 "3장 선택")
    ▼
하단 [가이드 만들기] → 여행 조건 바텀시트 (350ms slide-up)
    ▼
services/guides.ts → 웹 서버 POST /api/guides/draft (Bearer 토큰, place-reviews와 같은 방식)
    ▼
가이드 초안 화면 /guide/[id]
    · 장소 순서 목록(네이티브), 장소별 방문 시간·가기 전 확인
    · 순서 위/아래, 빼기
    · [후기·영상] → 기존 PlaceReviews 컴포넌트 재사용
    · [웹에서 보기 / 링크 공유] → 공유 시트
```

- 모바일 v1은 **선택·생성·간단 편집·공유**까지 합니다. 지도 미리보기와 세부 문장 편집은 웹에서 합니다(결정 필요 D8).
- 로그인 사용자만 씁니다. 게스트는 가이드 만들기 버튼에 로그인 유도를 띄웁니다(게스트 분석 한도 3회와 섞지 않음).

### 2.3 공유받은 사람

```
/g/<slug> (링크 공개 가이드)
    · PublicGuideExperience 그대로. 검색 엔진 noindex.
    · [내 지도에 저장] → 기존 saveGuideToArchive (로그인 → 캡처 한 건)
    · 원본 캡처 이미지는 보이지 않음 (결정 필요 D4)
```

---

## 3. 데이터 모델

### 3.1 가이드 본문 형태 (공통)

어느 안을 고르든 가이드 본문은 지금의 `PublicGuide` 형태를 씁니다. 이미 화면·저장·공유 코드가 이 형태를 받기 때문입니다. 웹·모바일이 함께 쓰도록 타입을 `packages/shared/src/types/guide.ts`로 옮기고 조금 넓힙니다.

| 필드 | 지금 | 바꿀 점 |
|------|------|---------|
| `status` | `'published'` 고정 | `'draft' \| 'ready' \| 'published'` (정적 가이드는 계속 `'published'`) |
| `curator` | `'Scrave'` | 사용자 가이드는 기본 `'Scrave 사용자 노트'` (실명·이메일 비노출, D7) |
| `countryCode` | 가이드 한 개 | 그대로 두되 `getGuideMapLinks`가 하드코딩한 `INDONESIA_COUNTRY_CODE` 대신 `guide.countryCode`를 받도록 고칩니다(1단계 PR). |
| `GuidePlace.hours` | 선택 | 사용자 가이드에서는 비워 둡니다(AI가 쓰지 않음). |
| `GuidePlace.sourceCaptureIds` | 없음 | **추가(선택 필드)**: 이 장소가 나온 캡처 ID들. 원본 보존 원칙. 공개 응답에서는 뺍니다. |
| `GuideReference.checkedAt` | 수동 확인일 | 후기·영상을 붙인 날짜. |

사용자 흐름 용어와 필드 대응:

| 사용자에게 보이는 말 | 필드 |
|---------------------|------|
| 장소 순서 | `places[].sequence` |
| 방문 시간 | `places[].visitWindow` (예: "해 지기 1시간 30분 전") |
| 가기 전 확인 | `places[].practicalNote` |
| 장면 이름·며칠째 | `places[].scene` (예: "2일차 · 절벽의 해 질 녘") |
| 후기·영상 | `places[].references[]` 중 `kind: 'review' \| 'video'` |

### 3.2 선택지

#### 안 A — 기존 `captures` 테이블 재사용

가이드를 캡처 한 행으로 저장합니다. 지금 `saveGuideToArchive`가 하는 방식을 넓힌 것입니다(`tags: ['guide:<slug>']`, `places` JSONB, 가이드 문장은 `extracted_text`).

- 장점: 마이그레이션이 없습니다. 지도·검색·무료 한도가 바로 적용됩니다.
- 단점:
  - `captures` SELECT RLS가 `auth.uid() = user_id`라 **공유 링크를 만들 수 없습니다.** 풀려면 `captures` 읽기 정책을 넓혀야 하는데, 개인 스크린샷 테이블을 외부에 여는 것은 위험합니다.
  - `PlaceInfo`에 `visitWindow`·`practicalNote`·`references`가 없어 JSONB 안에 비공식 필드를 섞게 됩니다. 기존 파서(`mappers.ts`)와 검색 RPC가 이를 모릅니다.
  - `category` CHECK가 `'place' | 'text'`뿐이라 가이드를 구분하려면 태그 규칙에 기대야 합니다.
  - 가이드가 무료 캡처 한도 100건을 차지합니다.

#### 안 B — 새 `guides` 테이블 (추천) [!]

가이드 본문을 JSONB 스냅샷으로 저장하고, 공개 범위·상태·원본 캡처 ID·생성 메타데이터를 열로 둡니다. 공유는 **추측할 수 없는 slug로 한 건만 돌려주는 RPC**로만 열고, 테이블 자체에는 익명 읽기 정책을 두지 않습니다.

- 장점: `captures` RLS를 건드리지 않습니다. 본문 형태가 `PublicGuide`와 같아 화면 재사용이 쉽습니다. 원본 캡처가 지워져도 가이드는 스냅샷으로 남습니다.
- 단점: 마이그레이션 한 편과 공유용 RPC가 필요합니다. 가이드와 캡처의 참조 무결성은 배열(`source_capture_ids`)이라 DB가 보장하지 않습니다(의도: 캡처 삭제가 가이드를 깨지 않게).

#### 안 C — 저장 없이 초안만 (단계 도입용)

서버는 초안만 만들어 돌려주고, 사용자는 화면에서 보고 「내 지도에 저장」으로 캡처 한 건만 남깁니다(안 A의 최소형). 가이드 자체는 저장하지 않습니다.

- 장점: 마이그레이션·결재 없이 **바로 만들어 볼 수 있습니다.** 생성 품질을 먼저 확인할 수 있습니다.
- 단점: 새로고침하면 초안이 사라집니다(브라우저 `sessionStorage`에 한 건만 임시 보관). 공유·재편집이 안 됩니다.

#### 추천

**안 B를 목표로 하고, 결재 전까지 안 C로 먼저 출시합니다.** 1~3단계 PR이 안 C, 4단계부터 안 B입니다(8절). 안 A는 공유 요구를 만족하지 못하고 개인 캡처 RLS를 넓혀야 하므로 택하지 않습니다.

### 3.3 공개 범위

| 값 | 뜻 | v1 |
|----|----|----|
| `private` | 본인만 봅니다. 기본값. | 지원 |
| `unlisted` | 링크를 아는 사람만 봅니다. 목록·검색 노출 없음, `noindex`. | 지원 |
| `public` | 검색·탐색에 노출. | **v1 제외** (제품 방향 결정 D3) |

`unlisted`로 바꿀 때 한 번 확인합니다: "링크를 받은 사람은 장소 이름·순서·메모를 볼 수 있습니다. 원본 캡처 사진은 보이지 않습니다."

### 3.4 마이그레이션 SQL 초안 (실행하지 않음) [!]

파일 이름 후보: `supabase/migrations/014_create_guides.sql`. **이 세션에서는 파일을 만들지 않았고 실행하지도 않았습니다.** 결재 후 4단계 PR에서 이 초안을 테스트와 함께 넣습니다.

```sql
-- Migration 014: user-made guides from captures
-- Body is a JSONB snapshot shaped like PublicGuide (packages/shared/src/types/guide.ts).
-- Sharing goes through get_shared_guide(slug) only; there is no anon policy on the table.

CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 12 AND 80),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 400),
  body JSONB NOT NULL CHECK (jsonb_typeof(body) = 'object'),
  schema_version SMALLINT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted')),
  source_capture_ids BIGINT[] NOT NULL DEFAULT '{}',
  generation JSONB NOT NULL DEFAULT '{}'::jsonb,  -- model, prompt_version, tokens, fallback
  shared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_guides_user_created
  ON guides(user_id, created_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own guides"
  ON guides FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Same pattern as captures (migration 013): cap enforced in the database.
-- MUST stay in sync with MAX_GUIDES_PER_USER in packages/shared.
CREATE POLICY "Users insert own guides"
  ON guides FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      SELECT COUNT(*) FROM guides
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    ) < 20
  );

CREATE POLICY "Users update own guides"
  ON guides FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: deletion is a soft delete through UPDATE deleted_at.

CREATE OR REPLACE FUNCTION set_guides_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER guides_set_updated_at
  BEFORE UPDATE ON guides
  FOR EACH ROW EXECUTE FUNCTION set_guides_updated_at();

-- Read one shared guide by exact slug. Never lists, never returns owner or source ids.
CREATE OR REPLACE FUNCTION get_shared_guide(p_slug TEXT)
RETURNS TABLE (slug TEXT, title TEXT, description TEXT, body JSONB, updated_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.slug, g.title, g.description, g.body, g.updated_at
  FROM guides g
  WHERE g.slug = p_slug
    AND g.visibility = 'unlisted'
    AND g.status = 'ready'
    AND g.deleted_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_shared_guide(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_shared_guide(TEXT) TO anon, authenticated;
```

설계 메모:

- **익명 SELECT 정책을 두지 않는 이유**: `USING (visibility = 'unlisted')` 정책을 두면 PostgREST로 `select *`를 해서 링크 공개 가이드를 모두 나열할 수 있습니다. 「링크를 아는 사람만」이 깨지므로 slug 정확 일치 RPC로만 엽니다.
- **slug**: `<영문 요약 2~4단어>-<무작위 10자리 base36>` (예: `uluwatu-cliffs-k3v9q2m7xa`). 무작위 부분은 `crypto.getRandomValues`로 만듭니다. 36^10 ≈ 3.6×10^15이라 추측이 어렵습니다. 정적 가이드 slug(`uluwatu-afterglow`, `uluwatu-cliff-captures`)는 무작위 부분이 없어 겹치지 않습니다.
- **body의 `sourceCaptureIds`**: 공개 RPC가 body를 그대로 돌려주므로, 공유용으로 저장할 때 서버가 `sourceCaptureIds`를 뺀 사본을 body에 두고 원본 ID는 `source_capture_ids` 열에만 둡니다. 순수 함수 `toShareableGuideBody`로 만들고 테스트합니다.
- **되돌리기(down)**: `DROP FUNCTION get_shared_guide(TEXT); DROP TABLE guides;` — 데이터가 생긴 뒤에는 파괴적 삭제이므로 따로 결재합니다.
- 적용 순서: 013 다음. 010·013처럼 한도 숫자와 코드 상수 동기화 주석을 둡니다.

---

## 4. 생성 파이프라인

### 4.1 단계

```
선택한 캡처 ID[] ─▶ ① 캡처 읽기(RLS, 본인 것만) ─▶ ② 장소 후보 모으기(순수)
   ─▶ ③ 좌표 보강(필요한 장소만 Geocoding) ─▶ ④ Gemini 순서·방문 시간·가기 전 확인
   ─▶ ⑤ 응답 검증(순수) ─┬ 통과 → ⑥ PublicGuide 초안 조립(순수)
                         └ 실패 → 거리순 대체 순서 + 기본 문구 → ⑥
```

| 단계 | 함수(예정) | 위치 | 비고 |
|------|-----------|------|------|
| ② | `collectGuideCandidates(captures)` | `web/src/lib/guide-draft.ts` | 장소 이름 정규화(`getPlaceMatchKeys` 재사용) + 좌표 50m 이내면 같은 장소로 합칩니다. 각 후보에 `sourceCaptureIds`와 캡처 요약 앞부분(200자)을 붙입니다. 최대 12곳, 넘으면 사용자에게 줄이도록 안내합니다. |
| ③ | 기존 `geocoding.ts` (`buildGeocodingQuery`, `parseGoogleGeocodeResponse`) | 재사용 | 좌표가 없는 장소만. 실패하면 "위치 확인 필요"로 분리합니다. |
| ④ | `buildGuidePrompt(input)` | `packages/shared/src/ai/guide-prompt.ts` | 4.2절. 기존 `ai/prompts.ts` 옆에 둡니다. 테스트는 `packages/shared/src/__tests__/guide-prompt.test.ts` (기존 shared 테스트 폴더). |
| ⑤ | `parseGuideDraftResponse(text, candidateIds)` | `web/src/lib/guide-draft.ts` | 모든 후보 ID가 정확히 한 번씩 나오는지, 카테고리가 다섯 값 중 하나인지, 문장 길이 제한을 지키는지, 금지 항목(시각·가격·전화번호 숫자 패턴)이 없는지 확인합니다. |
| 대체 | `orderByNearestNeighbor(candidates)` | `web/src/lib/guide-draft.ts` | 숙소(`stay`)를 먼저 두고 가까운 순서로 잇습니다. 결정적이라 테스트하기 쉽습니다. |
| ⑥ | `assembleGuideDraft(candidates, plan, meta)` | `web/src/lib/guide-draft.ts` | `PublicGuide` 모양, `status: 'draft'`, `connectRoute`는 당일이면 `true`, 여러 날이면 `false`(울루와뚜 캡처 가이드와 같은 판단). |

라우트 `POST /api/guides/draft`는 인증·입력 검증·사용자별 일일 한도 확인 후 위 함수만 호출합니다(`place-reviews/route.ts`와 같은 구조).

### 4.2 Gemini 프롬프트 초안

호출 설정: 기존 라우트와 같이 `AI_MODEL_ENDPOINT`, `responseMimeType: 'application/json'`, `thinkingConfig: { thinkingBudget: 0 }`, `temperature: 0.2`. 이미지는 보내지 않고 **텍스트만** 보냅니다(캡처 분석은 이미 끝나 있으므로). 프롬프트 버전 상수 `GUIDE_PROMPT_VERSION = 'guide-v1'`을 `generation` 열에 남깁니다.

```text
당신은 사용자가 저장한 장소들로 여행 동선을 짜는 편집자입니다.
아래 JSON의 places는 사용자가 SNS 캡처에서 저장한 장소입니다. 새 장소를 추가하지 마세요.

규칙:
1. 모든 place id를 정확히 한 번씩 order에 넣습니다. 빼거나 겹치지 않습니다.
2. 이동 거리(좌표)와 시간대 성격(해변은 오전, 선셋 명소는 해 질 녘, 바·식당은 저녁)을 함께 고려해 순서를 정합니다.
3. trip.nights가 1 이상이면 숙소(stay)를 날짜의 시작이나 끝에 두고, 각 장소에 day(1부터)를 붙입니다. 0이면 모두 day 1입니다.
4. visitWindow는 "사람이 몰리기 전 오전", "해 지기 1시간 30분 전"처럼 상대적인 시간대로만 씁니다. 시각(예: 17:30), 요일, 가격, 전화번호, 영업시간을 쓰지 않습니다.
5. practicalNote는 방문 전에 확인할 것을 한두 문장 합니다체로 씁니다. 확인하지 않은 사실을 단정하지 말고 "방문 직전 공식 안내에서 다시 확인하세요"처럼 확인을 권합니다.
6. category는 culture, beach, food, stay, activity 중 하나입니다.
7. scene은 "01 · 낮의 물빛"처럼 번호와 짧은 장면 이름입니다. 여러 날이면 "2일차 · 절벽의 해 질 녘"처럼 씁니다.
8. title은 30자 이내, description은 90자 이내 합니다체입니다. 장소 수는 숫자 대신 "일곱 곳"처럼 한글로 씁니다.
9. countryCode는 장소 대부분이 속한 나라의 ISO 3166-1 alpha-2 대문자 코드입니다. 모르면 null입니다.

입력:
{"trip": {"nights": 2}, "places": [
  {"id": "p1", "name": "Padang Padang Beach", "address": "...", "lat": -8.81, "lng": 115.10,
   "captureNote": "캡처 요약 앞 200자"}
]}

JSON 하나로만 답합니다:
{"title": "", "description": "", "eyebrow": "", "routeTitle": "", "countryCode": "ID",
 "order": [{"id": "p1", "day": 1, "category": "beach", "scene": "", "visitWindow": "", "practicalNote": ""}]}
```

- 사용자 캡처 요약(`captureNote`)은 외부 SNS 글에서 온 텍스트입니다. 프롬프트 주입을 막기 위해 JSON 문자열 값으로만 넣고, 응답은 ⑤에서 스키마·ID 집합으로 검증해 지시문을 따르더라도 새 장소나 링크가 들어올 수 없게 합니다.
- `eyebrow`·`routeEyebrow`·`mapLabel`처럼 대문자 영문 라벨(Space Grotesk)은 AI 결과를 쓰되 `^[A-Z0-9 ·&]{1,40}$`로 검증하고 어기면 기본값(`MY GUIDE`)으로 둡니다.

### 4.3 비용 추정

가정: `gemini-2.5-flash` 공개 단가 입력 100만 토큰당 0.30달러, 출력 100만 토큰당 2.50달러(생각 토큰 없음, `thinkingBudget: 0`). 환율 1달러 = 1,400원. 단가는 2026-09-26에 Google AI 가격 페이지(ai.google.dev/gemini-api/docs/pricing)에서 유료 등급 표준 단가로 확인했습니다. 같은 페이지에 `gemini-2.5-flash` 종료 예고는 없습니다(종료 예고는 `gemini-2.5-flash-image`, 2026-10-02).

| 항목 | 장소 10곳 기준 토큰 | 비용 |
|------|--------------------|------|
| 입력(규칙 약 800 + 장소당 약 370) | 약 4,500 | 약 0.0014달러 |
| 출력(장소당 약 180 + 머리말 약 300) | 약 2,100 | 약 0.0053달러 |
| **가이드 한 건** | | **약 0.0067달러 ≈ 9원** |
| 검증 실패로 한 번 재시도하는 최악의 경우 | | 약 0.013달러 ≈ 19원 |

함께 드는 외부 비용:

| 항목 | 기준 | 판단 |
|------|------|------|
| Google Geocoding | 좌표 없는 장소만, 가이드당 0~12건 | 월 무료 사용량 안에서는 0원, 넘으면 1,000건당 약 5달러. 캡처 분석 때 이미 좌표를 얻은 경우가 많아 작습니다. |
| 후기·영상 Gemini 장면 확인 | 장소당 영상 몇 편 × 장면 3장(이미지) | 장소당 약 0.002달러, 10곳이면 약 0.02달러. **생성 때 자동으로 부르지 않습니다.** |
| YouTube Data API 쿼터 | 2026-09-26 공식 문서 기준 기본 할당: `search.list` 하루 100회(별도 한도), 그 밖의 호출은 합쳐서 하루 10,000단위(`videos.list`·`channels.list` 각 1단위). 장소 한 곳에 `search.list` 1회를 씁니다. | **캐시에 없는 장소가 하루 약 100곳(가이드 약 10편)을 넘으면 막힙니다.** 그래서 후기·영상은 소유자가 장소별로 누를 때만 부르고 24시간 캐시를 그대로 씁니다. |
| 네이버 검색 API | 일 25,000회 | 여유 있습니다. |

월 추정: dogfood 10명 × 가이드 월 4편 = 40편 → Gemini 약 0.27~0.54달러(약 400~750원). 사용자별 하루 생성 한도 5회(D5)를 두면 최악의 경우도 1인 하루 0.07달러 이내입니다.

### 4.4 AI가 쓰지 않는 것

- 영업시간(`hours`), 가격, 예약 조건, 전화번호, 공연 시각: 비워 둡니다. 사용자가 직접 넣거나, 후기·영상 붙이기처럼 출처가 있는 자료로만 채웁니다.
- 새 장소 추천: 사용자가 저장한 장소만 씁니다(원본 보존 원칙).
- 공식 출처(`government`, `official`) 참조: AI가 URL을 만들지 않습니다. 캡처에 원래 있던 `places[].links`만 `official` 후보로 옮기되, 검증 전에는 `editorial`로 둡니다. 따라서 사용자 가이드에는 `getGuidePlaceImageReference`가 고를 사진이 없을 수 있고, 화면은 사진 없는 카드로 보여야 합니다(3단계 테스트로 고정).

---

## 5. 재사용할 기존 코드

| 코드 | 재사용 방식 | 필요한 변경 |
|------|------------|------------|
| `public-guides.ts` 타입(`PublicGuide`, `GuidePlace`, `GuideReference`, `GuidePlaceCategory`) | 가이드 본문 형태 그대로 | `packages/shared/src/types/guide.ts`로 이동(웹은 다시 내보내기), `status` 확장, `sourceCaptureIds?` 추가. 정적 데이터는 웹에 그대로 둡니다. |
| `getGuideMapLinks(place)` | 장소별 지도 앱 링크 | `INDONESIA_COUNTRY_CODE` 하드코딩을 `countryCode` 인자로 바꿉니다. 정적 가이드 결과는 같아야 합니다(회귀 테스트). |
| `formatPlaceCount` | 제목·요약의 "일곱 곳" | 그대로. |
| `PublicGuideExperience` | 초안 미리보기, 저장한 가이드 보기, 공유 페이지 | 컴포넌트 본문은 바꾸지 않고, 바깥에 초안 배지·편집 패널을 둡니다. 사진 없는 장소 카드와 `review`·`video` 참조만 있는 장소가 깨지지 않는지 테스트합니다. |
| `SaveGuideButton` / `guide-save.ts` | 초안·공유 가이드를 「내 지도에 저장」 | `getGuideCaptureImageUrl`이 `/g/<slug>/opengraph-image`를 씁니다. 3단계(저장 전 초안)에서는 slug 페이지가 없으므로 **대표 이미지 URL을 인자로 받게** 넓히고, 첫 원본 캡처 이미지 경로를 넘깁니다. `guide:<slug>` 중복 방지 태그는 그대로 씁니다. |
| `guide-share.ts` | 링크 공유 | 그대로. |
| `/api/place-reviews` + `collectPlaceReviews` | 장소별 후기·영상 후보 | 그대로. 결과를 `GuideReference`로 바꾸는 순수 함수 `toGuideReferences(result, checkedAt)`만 새로 씁니다(`CuratedNaverPost` → `kind: 'review'`, `PlaceReviewVideo` → `kind: 'video'`, 썸네일은 `thumbnailUrl`). |
| `review-curation.ts`의 `getPlaceMatchKeys` | 장소 중복 합치기 | 그대로. |
| `/api/guide-preview-image` + `isGuideReferencePreviewImageUrl` | 참조 미리보기 이미지 프록시 | 지금은 정적 가이드 URL 목록만 허용합니다. 사용자 가이드는 **호스트 허용 목록(`i.ytimg.com`)만** 추가합니다. 임의 URL 프록시(SSRF)를 열지 않습니다. |
| `app/g/[slug]/page.tsx`, `opengraph-image.tsx` | 공유 페이지 | 정적 가이드를 먼저 찾고, 없으면 `get_shared_guide` RPC로 찾습니다. DB 가이드는 `robots: { index: false }`. |
| `geocoding.ts` | 좌표 보강 | 그대로. |
| `extractGeminiText`, `AI_MODEL_ENDPOINT` | Gemini 호출 | 그대로. |
| 모바일 `services/place-reviews.ts`, `components/PlaceReviews.tsx` | 모바일 후기·영상 | 그대로. 새 `services/guides.ts`는 같은 호출 방식(Bearer 토큰, 웹 서버 URL)을 따릅니다. |
| `countUserCaptures`, `MAX_FREE_CAPTURES` | 「내 지도에 저장」 한도 | 그대로. 가이드 자체 한도(`MAX_GUIDES_PER_USER = 20`)는 별도 상수. |

---

## 6. API 초안

| 메서드 | 경로 | 인증 | 단계 | 설명 |
|--------|------|------|------|------|
| POST | `/api/guides/draft` | 로그인 | 3 | `{ captureIds: number[] (2~10), nights?: 0~7 }` → `{ guide: PublicGuide, unresolved: { name, captureId }[], fallback: boolean }`. DB에 쓰지 않습니다. |
| POST | `/api/guides` | 로그인 | 4 | 초안 저장 → `{ id, slug }`. 한도 20편. |
| GET | `/api/guides` | 로그인 | 4 | 내 가이드 목록(제목, 장소 수, 수정일, 공개 범위). |
| PATCH | `/api/guides/[id]` | 로그인 | 4 | 본문 수정, `status`, `visibility` 변경. |
| DELETE | `/api/guides/[id]` | 로그인 | 4 | 소프트 삭제(`deleted_at`). |

입력 검증 규칙(순수 함수 `validateGuideDraftInput`): 캡처 ID는 양의 정수·중복 없음·2~10개, 모두 본인의 `category = 'place'` 캡처, `nights`는 0~7 정수.

사용자별 하루 생성 한도: 기존 `rate-limit.ts`는 게스트 IP용이므로, 같은 원자적 RPC 패턴(migration 011)을 사용자 ID 키로 쓰는 방식을 4단계에서 검토합니다. 3단계에서는 DB 없이 쓸 수 있도록 **캡처 선택 수·장소 수 상한과 인증만** 적용하고, 한도는 결정 D5 이후 붙입니다.

---

## 7. 테스트 계획 (TDD)

모든 항목은 실패하는 테스트를 먼저 쓰고 통과시키는 순서로 진행합니다. 러너는 웹·shared vitest, 모바일 jest입니다.

### 7.1 순수 로직 (`apps/web/src/__tests__/lib/guide-draft.test.ts` 등, 기존 `guide-save.test.ts`·`review-curation.test.ts`와 같은 폴더)

| 함수 | 반드시 확인할 사례 |
|------|------------------|
| `collectGuideCandidates` | 같은 장소가 두 캡처에 있으면 한 곳으로 합치고 `sourceCaptureIds` 두 개 보존 / 이름이 달라도 좌표 50m 이내면 합침 / 좌표 없는 장소는 `needsGeocode` / 12곳 초과 시 오류 코드 / `text` 캡처는 무시 |
| `buildGuidePrompt` | 모든 후보 ID가 입력 JSON에 들어감 / `captureNote` 200자 자르기 / 캡처 요약에 따옴표·중괄호가 있어도 JSON이 깨지지 않음 / `nights` 반영 |
| `parseGuideDraftResponse` | 정상 응답 통과 / ID 누락·중복·모르는 ID → 실패 / 알 수 없는 category → 실패 / `visitWindow`에 `17:30`·`₩`·`IDR` 같은 시각·가격 패턴 → 실패 / 코드 블록으로 감싼 JSON도 파싱 / 빈 응답 → 실패 |
| `orderByNearestNeighbor` | 숙소가 첫 번째 / 좌표 순서가 결정적 / 장소 한 곳이어도 동작 |
| `assembleGuideDraft` | `sequence`가 1부터 연속 / `status: 'draft'` / 여러 날이면 `connectRoute: false` / `hours` 비어 있음 / `shareTitleLines` 생성 / `center`가 좌표 평균 |
| `toGuideReferences` | 네이버 글 → `review`, 영상 → `video`, 썸네일 URL 유지, `checkedAt` 날짜 / 빈 결과 → 빈 배열 |
| `toShareableGuideBody` | `sourceCaptureIds` 제거 / 나머지 필드 동일 |
| `buildGuideSlug` | 형식 정규식 통과 / 무작위 부분 10자 / 영문 요약이 없으면 `guide-` 접두 / 정적 slug와 겹치지 않음 |
| `validateGuideDraftInput` | 1장·11장·중복·음수·문자열 → 400 사유 |
| `getGuideMapLinks` (변경) | 정적 가이드 두 편의 결과가 변경 전과 같음(회귀) / 한국 좌표 가이드는 한국 지도 앱 순서 |
| `isGuideReferencePreviewImageUrl` (변경) | 정적 URL 허용 유지 / `https://i.ytimg.com/...` 허용 / 다른 호스트·`http:`·사용자 정보 포함 URL 거부 |
| `buildGuideCaptureAnalysis` (변경) | 대표 이미지 인자 반영 / 기존 정적 가이드 저장 결과 동일 |

### 7.2 라우트 (`apps/web/src/__tests__/api/guides-draft-route.test.ts`)

`place-reviews-route.test.ts`와 같은 방식으로 인증·Gemini fetch를 가짜로 둡니다.

- 로그인 안 함 → 401 / 잘못된 입력 → 400 / 다른 사용자 캡처 ID 포함 → 400(존재 여부를 드러내지 않는 문구)
- Gemini 정상 → 200, `fallback: false`
- Gemini가 규칙을 어긴 응답 → 1회 재시도 후 거리순 대체, `fallback: true`
- Gemini 네트워크 실패 → 거리순 대체, 500을 내지 않음
- `GEMINI_API_KEY` 없음 → 거리순 대체

### 7.3 컴포넌트 (`apps/web/src/__tests__/components/`)

- `PublicGuideExperience`: 사진 참조가 없는 장소, `review`·`video`만 있는 장소, 장소 두 곳짜리 가이드가 렌더링됨
- `GuideDraftEditor`: 위/아래 버튼으로 순서 변경 시 `sequence` 재계산, 장소 빼기, 「AI 초안」 배지 표시
- 캡처 선택 모드: `text` 캡처는 선택 불가, 11번째 선택 막힘, 하단 바 개수 표시

### 7.4 DB (4단계, 수동 검증 파일)

기존 `supabase/migrations/__manual_verify__00x.sql` 관례를 따라 `__manual_verify__014.sql`을 둡니다: 다른 사용자 가이드 SELECT 불가, 21번째 INSERT 거부, `anon`의 `guides` 직접 SELECT 0행, `get_shared_guide`가 `private`·`draft`·삭제된 가이드를 돌려주지 않음, 반환 열에 `user_id` 없음.

### 7.5 모바일 (`apps/mobile/services/__tests__/guides.test.ts`, jest)

- 토큰 없음 → 로그인 안내 문구 / 401 → 같은 문구 / 성공 응답 파싱 / 다중 선택 상태 리듀서(선택·해제·상한)

### 7.6 E2E (Playwright, 기존 `e2e-auth-bypass` 사용)

- 장소 캡처 3장 선택 → 초안 생성(Gemini 가짜 응답) → 순서 바꾸기 → 「내 지도에 저장」 → 대시보드에 가이드 캡처 한 건
- 4·5단계: 저장 → 링크 공유 → 로그아웃 상태로 `/g/<slug>` 열람 → `noindex` 메타 확인

---

## 8. 단계별 PR 나누기

각 PR은 독립적으로 배포 가능하고, 앞 PR이 머지돼야 다음을 시작합니다. PR 생성·머지는 대표 결재(D4)를 따릅니다.

| 단계 | PR 제목(안) | 내용 | 마이그레이션 | 결재 |
|------|------------|------|-------------|------|
| 1 | refactor: share guide types and take country code in map links | 가이드 타입을 `packages/shared`로 이동, `status` 확장, `sourceCaptureIds?`, `getGuideMapLinks` 국가 코드 인자화. 동작 변화 없음(회귀 테스트). | 없음 | 없음 |
| 2 | feat: guide draft builder (pure logic + prompt) | `guide-draft.ts`, `guide-prompt.ts`, `toGuideReferences`, `buildGuideSlug`, 테스트. 라우트·UI 없음. | 없음 | 없음 |
| 3 | feat: make a guide draft from selected captures (web) | `POST /api/guides/draft`, 웹 선택 모드, 초안 화면(`PublicGuideExperience` + 편집 패널), 「내 지도에 저장」 대표 이미지 인자화, 장소별 후기·영상 붙이기. 초안은 `sessionStorage`에 한 건만 임시 보관(안 C). | 없음 | **[!] 유료 생성(Gemini 호출)을 사용자에게 여는 시점** — D5 |
| 4 | feat: save guides (guides table) | `014_create_guides.sql`, shared 쿼리(`saveGuide`, `listMyGuides`, `updateGuide`, `softDeleteGuide`), `/api/guides` CRUD, `/guides` 목록, 사용자별 생성 한도. | **014** | **[!] 새 테이블·데이터 마이그레이션** — D1, D2 |
| 5 | feat: share a guide by link | `unlisted` 전환, `get_shared_guide` 사용, `/g/[slug]` DB 대체 조회·OG 이미지·`noindex`, 미리보기 이미지 호스트 허용 목록. | 없음(014에 포함) | **[!] 제품 방향(공개 범위)** — D3, D4 |
| 6 | feat(mobile): make a guide from captures | 다중 선택, `services/guides.ts`, 초안·저장 화면, 공유 시트. | 없음 | D8 |

3단계까지는 마이그레이션 결재 없이 진행할 수 있습니다. 3단계를 먼저 dogfood에 내보내 초안 품질(순서가 그럴듯한지, 문장 수정량)을 본 뒤 4단계 결재를 올리는 흐름을 추천합니다.

---

## 9. 위험과 대응

| 위험 | 대응 |
|------|------|
| AI가 영업시간·가격을 지어냄 | 프롬프트 금지 + 응답 검증에서 시각·가격 패턴 거부 + `hours` 필드는 AI 경로에서 항상 비움 |
| 캡처 속 SNS 글을 통한 프롬프트 주입 | 캡처 요약은 JSON 값으로만 전달, 응답은 ID 집합·스키마로 검증, AI는 URL을 만들 수 없음 |
| 공유 링크로 개인 정보 노출 | 원본 캡처 이미지·`sourceCaptureIds`·`user_id`를 공개 응답에서 제외, 공개 전환 시 확인 문구, `noindex` |
| 링크 공개 가이드 나열 | 테이블 익명 정책 없음, slug 정확 일치 RPC만, 무작위 10자리 slug |
| YouTube 쿼터 소진 | 생성 시 자동 호출 없음, 장소별 요청 시에만, 24시간 캐시 |
| 이미지 프록시 SSRF | 호스트 허용 목록(`i.ytimg.com`)만 추가 |
| 무료 캡처 한도와 혼동 | 가이드는 별도 한도(20편), 「내 지도에 저장」만 캡처 한도를 씀 |
| 정적 가이드 회귀 | 1단계에서 정적 가이드 두 편의 지도 링크·저장 결과를 스냅샷 수준으로 고정 |

---

## 10. 구현 현황 (2026-09-26)

| 단계 | 상태 | 들어간 것 |
|------|------|----------|
| 1 | 완료 | 가이드 타입 `packages/shared/src/types/guide.ts`로 이동(`status: 'draft'`, `sourceCaptureIds?`), `getGuideMapLinks(place, countryCode)` |
| 2 | 완료 | `packages/shared/src/ai/guide-prompt.ts`, `apps/web/src/lib/guide-draft.ts` (입력 검증, 장소 합치기, 응답 검증, 거리순 대체, 초안 조립, 후기·영상 변환, slug) |
| 3 | 완료(웹) | `POST /api/guides/draft`, `/places`의 「가이드 만들기」 선택 모드(`GuideCapturePicker`), `/guides/new` 초안 화면(`GuideDraftScreen`: 순서 위/아래, 빼기, 방문 시간·가기 전 확인 수정, 장소별 후기·영상 붙이기), `PublicGuideExperience` 초안 모드, 「내 지도에 저장」 표지 이미지 인자 |
| 4~6 | 미착수 | `guides` 테이블·공유 링크·모바일. 4단계는 결재 D1·D2 이후 |

설계와 달라진 점:

- **좌표 보강 없음**: 3단계에서는 Geocoding을 부르지 않습니다. 좌표가 없는 장소는 초안에서 빼고 "위치를 찾지 못해 뺀 장소"로 알립니다. 추가 호출 비용이 없고, 캡처 저장 때 이미 좌표를 얻은 장소가 대부분이라 먼저 이렇게 둡니다.
- **웹 쿠키 인증만**: 라우트는 웹 세션(쿠키)으로 캡처를 읽습니다. 모바일(Bearer 토큰)은 6단계에서 붙입니다.
- **생성 한도 없음**: D5 결정 전이라 사용자별 하루 한도는 아직 없습니다. 입력 상한(캡처 2~10장, 장소 12곳)과 로그인만 적용합니다. 운영에서 Gemini 호출을 사용자에게 여는 것은 D5 결재 항목입니다.
- **지구본 대신 현지 지도**: 기존 지구본 그림은 서울→발리로 고정돼 있어, 초안에서는 좌표로 그리는 현지 지도만 보여 줍니다. 지도 버튼 문구도 링크가 여는 앱 이름을 따릅니다(국내 장소는 T map).
- **YouTube 썸네일 허용**: 미리보기 이미지 프록시가 `https://i.ytimg.com/vi/<id>/<name>.jpg` 형식만 추가로 받습니다.

검증: shared 194개, web 335개(3개 skip은 기존) 테스트 통과, `tsc --noEmit`·`next build` 통과. 빌드한 앱을 켜서 `/guides/new`를 데스크톱(1280px)과 모바일(390px)에서 열어 순서 바꾸기가 동작하고 가로 넘침·페이지 오류가 없는 것을 확인했습니다. `/places` 선택 모드와 실제 Gemini 호출은 Supabase·Gemini 키가 없는 환경이라 컴포넌트·라우트 테스트로만 확인했습니다.

## 결정 필요

| ID | 항목 | 선택지 | 추천 기본값 | 결재 |
|----|------|--------|------------|------|
| D1 | 가이드 저장 데이터 모델 | A 기존 `captures` 재사용 / B 새 `guides` 테이블 / C 저장 없이 초안만 | **B**, 결재 전까지 C로 먼저 출시 | **[!] 대표** (새 테이블) |
| D2 | 마이그레이션 `014_create_guides.sql` 추가·실행 | 3.4절 초안 그대로 / 수정 후 / 보류 | 3.4절 초안으로 4단계 PR에 포함, 실행은 머지 후 대표가 직접 | **[!] 대표** (데이터 마이그레이션) |
| D3 | v1 공개 범위 | 비공개만 / 비공개 + 링크 공개 / 검색 노출 공개까지 | **비공개 + 링크 공개(`unlisted`, noindex)** | **[!] 대표** (제품 방향) |
| D4 | 공유 가이드에 원본 캡처 사진 노출 | 노출 / 비노출 / 가이드별 선택 | **비노출** (SNS 캡처에 타인 계정·개인 정보가 섞일 수 있음) | **[!] 대표** (제품 방향) |
| D5 | Gemini 생성 한도 | 무제한 / 사용자별 하루 N회 / 유료 전용 | **사용자별 하루 5회**, 가이드 최대 20편, 캡처 2~10장·장소 12곳 | **[!] 대표** (유료 생성) |
| D6 | 후기·영상 붙이는 시점 | 생성 때 전 장소 자동 / 소유자가 장소별 요청 | **장소별 요청 시만**, 공유 시 붙인 결과를 스냅샷으로 저장 | 제품 담당 |
| D7 | 사용자 가이드의 `curator` 표기 | 실명·닉네임 / 고정 문구 / 표기 안 함 | **고정 문구 "Scrave 사용자 노트"** | 제품 담당 |
| D8 | 모바일 v1 범위 | 선택·생성·간단 편집·공유 / 웹과 동일 / 웹 링크로 열기만 | **선택·생성·간단 편집·공유** (지도 미리보기·문장 편집은 웹) | 제품 담당 |
| D9 | 영업시간·가격 등 사실 정보 | AI 생성 / 비워 둠 / 외부 API로 채움 | **비워 둠**, 사용자 입력 또는 출처 있는 자료만 | 제품 담당 |
| D10 | 기존 정적 가이드 두 편의 DB 이관 | 이관 / 코드 유지 | **코드 유지** (v1 범위 밖) | 제품 담당 |
| D11 | 여러 날 일정 표현 | `scene`에 "2일차" 표기 / `day` 필드 추가와 일자별 UI | **`scene` 표기**로 시작, 사용 데이터 본 뒤 `day` 필드 검토 | 제품 담당 |
| D12 | 3단계 PR 이후 dogfood 확인 기간 | 없음 / 1주 / 2주 | **1주** 후 4단계 결재 상정 | 대표 |

---

*근거로 읽은 파일: `DESIGN.md`, `AGENTS.md`, `DECISIONS.md`, `docs/PRODUCT_SPEC.md`, `TODOS.md`, `apps/web/src/lib/{public-guides,guide-save,guide-share,review-curation,place-review-sources,gemini,geocoding,rate-limit}.ts`, `apps/web/src/components/guides/*`, `apps/web/src/app/g/[slug]/page.tsx`, `apps/web/src/app/api/{place-reviews,guide-preview-image}/route.ts`, `apps/mobile/services/place-reviews.ts`, `packages/shared/src/{ai/config,types/capture,types/place-reviews}.ts`, `supabase/migrations/001·003·010·013`.*
