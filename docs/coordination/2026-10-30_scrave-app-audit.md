---
title: Scrave 전체 기능·디자인 사전 점검
last_updated: 2026-10-30
status: active
---

# Scrave 전체 기능·디자인 사전 점검

[시각 비교판](../../_dogfood/2026-10-30_scrave_app-audit_v1.html)을 먼저 열면 운영 화면과 토스 시제품을 같은 390×844 크기로 비교할 수 있습니다. 등록을 진행하기 전에 기존 기능과 최신 디자인을 대조한다는 2026-10-30 사용자 요청에 따라 작성했습니다. 이식 범위 확정과 출시 판단은 이 점검 다음 단계입니다.

## 목표·범위·완료 기준

담당은 이 Codex 대화 세션입니다. 웹 화면·웹/모바일 소스·공통 코드·토스 시제품을 대조하고, 기능별 차이와 검증하지 못한 동작을 남깁니다. 점검 완료 기준은 화면 증거, 기능 대응표, 현재 자동 검사 결과, 추가 시험 목록을 함께 제공하는 것입니다. 로그인 후 전체 서비스와 실제 휴대폰의 모든 동작을 시험했다는 뜻으로 사용하지 않습니다.

## 기준 소스와 최신 결정

[운영 앱](https://scrave.vercel.app/dashboard)과 [스티커북](https://scrave.vercel.app/stickers)을 직접 열었습니다. 최신 시각 소스는 `/Users/ssongji/Developer/Workspace/scrave-slate-design`의 `feat/slate-sticker-design`, 로컬 커밋 `d5f31fd`이며 작업 시작 시 깨끗했습니다. 이 폴더의 [DESIGN.md](../../../scrave-slate-design/DESIGN.md)·[DECISIONS.md](../../../scrave-slate-design/DECISIONS.md)·10월 29일 작업 기록을 확인했습니다. 흰 바탕·슬레이트 블루·SUIT·가는 손그림은 사용자 확정 방향이며, 이전 크림색 기준보다 나중 결정입니다. 운영 화면의 색·폰트·그림·스티커북이 이 소스와 일치했습니다. 배포된 파일 전체와 소스의 바이트 일치까지 검증한 것은 아닙니다.

원격 main은 `6c5322c`이며 최신 시각 변경은 그 다음 로컬 커밋에 있습니다. 따라서 원격 main만 보고 디자인을 이식하면 이전판을 사용하게 됩니다. 기존 원본 작업 폴더와 다른 세션의 변경은 수정하지 않았습니다. 토스 시제품은 별도 `feat/toss-capture-pilot` 작업 공간의 `apps/toss`에 있습니다.

## 화면 흐름

사진 선택 → 분석/직접 정리 → 저장 → 보관함에서 검색 → 원본·출처·다음 행동 확인 → 장소/가이드 활용 순서입니다. 기존 웹은 이 흐름에 계정·동기화·공유가 연결되어 있고, 현재 토스 시제품은 한 장 선택 → 직접 제목·분류·메모 → 기기 저장 → 재열람까지만 연결되어 있습니다. 시제품은 앞서 승인한 작은 시험 범위에 맞췄으며 전체 Scrave와 기능 차이가 있습니다.

## 기능 대응표

‘코드’는 구현 연결을 읽었다는 뜻이며 실제 휴대폰 실행 성공을 뜻하지 않습니다. [High] 아래 기능의 존재와 차이는 해당 파일·테스트·화면을 근거로 판정했습니다. 운영 데이터의 정확도와 외부 서비스 결과는 별도 검증 대상입니다.

| 기능 | 웹 | 모바일 소스 | 토스 시제품 | 확인 내용 / 남은 검증 | 근거 |
|---|---|---|---|---|---|
| 사진 선택 | 드롭·붙여넣기·파일 선택 | 앨범 선택 코드 | 한 장 선택·취소 처리 | 토스 앨범과 권한은 기기에서 확인해야 합니다. | [UploadZone.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/components/upload/UploadZone.tsx>) |
| 여러 장 추가 | 한 번에 최대 10장 | 홈은 한 장 선택 | 한 장만 지원 | 여러 장 분석과 부분 실패 복구가 토스에 없습니다. | [BatchAnalyzeModal.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/components/upload/BatchAnalyzeModal.tsx>) |
| 자동 분석·분류 | 장소·텍스트·제목·요약·태그·신뢰도 | 서버 분석 연결 코드 | 수동 제목·분류·메모 | 토스 시제품에는 AI 분석 연결이 없습니다. 유료 분석은 이번에 호출하지 않았습니다. | [AnalyzeModal.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/components/upload/AnalyzeModal.tsx>) |
| 보관함·검색 | 사진 카드·검색·분류·네 가지 보기 | 2열·검색·분류 코드 | 2열·제목/메모 검색·분류 | 웹의 여행·할 일·취향 보기는 토스에 없습니다. | [ArchiveSections.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/components/captures/ArchiveSections.tsx>) |
| 원본 보기 | 확대 창에 잘림 오류 재현 | 전체 프레임 이미지 코드 | 편집 화면에서 전체 프레임 | 전체 프레임 표시와 원본 파일 보존을 구분해야 합니다. | [image-utils.ts](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/lib/image-utils.ts>) |
| 클라우드 저장 | 로그인 후 이미지·기록 서버 저장 | 서버 저장·동기화 코드 | 이 기기의 IndexedDB 저장 | 기기 변경·앱 데이터 삭제에 대한 복구 방법이 다릅니다. | [CapturesContext.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/contexts/CapturesContext.tsx>) |
| 비로그인 체험 | 샘플 2개·최대 3개·로그인 이전 | 비로그인/로컬 기록 코드 | 계정 없는 로컬 저장 | 체험 한도와 로그인 전환 흐름이 서로 다릅니다. | [GuestCapturesContext.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/contexts/GuestCapturesContext.tsx>) |
| 출처 확인 | 연결 링크·검색 후보·일치 상태 | 출처 패널 코드 | 없음 | 운영 비로그인 화면은 로그인 안내를 표시했습니다. 후보를 확정 출처로 표시하지 않습니다. | [ArchiveSources.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/components/captures/ArchiveSources.tsx>) |
| 전화·일정·다음 행동 | 전화·일정·주소·링크·복사·완료 표시 | 장소 링크·텍스트 복사; 웹과 차이 | 없음 | 웹의 행동 추출·완료 표시를 모바일과 토스에서 별도 대조해야 합니다. | [capture-actions.ts](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/lib/capture-actions.ts>) |
| 이유·다시 볼 시점 | 선택 이유·메모·다시 보기·여행 묶음 | 동일 화면 연결 미확인 | 일반 메모만 | 웹 부가 기록은 로컬 저장이므로 계정 동기화와 구분합니다. | [capture-intent.ts](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/lib/capture-intent.ts>) |
| 장소·지도 | 장소 목록·지도·지도 서비스 선택 | 장소 탭·지도 코드 | 없음 | 네이버 인증 실패 후 기본 지도로 바뀌는 것을 운영 화면에서 확인했습니다. | [MapView.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/components/map/MapView.tsx>) |
| 후기·영상 찾기 | 후기 후보·검색·필터 | 후기·빠른 검색 코드 | 없음 | 실제 검색 품질과 광고·음성 필터 정확도는 이번 검사에서 확인하지 않았습니다. | [PlaceReviews.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/components/captures/PlaceReviews.tsx>) |
| 동선 가이드 | 2~10장 선택·초안·편집·저장 | 가이드 초안 연결 코드 | 없음 | 운영 목록은 로그인으로 이동했습니다. 실제 생성·저장은 미검증입니다. | [GuideDraftScreen.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/components/guides/GuideDraftScreen.tsx>) |
| 가이드 공유 | 비공개/링크 공개·공개 페이지 | 공유 연결 코드 | 없음 | 원본 사진 제외와 공개 범위의 실제 계정별 검증이 남았습니다. | [page.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/app/(app)/guides/page.tsx>) |
| 로그인·계정 | Google·카카오·설정 | 소셜 인증 코드 | 없음 | 토스 로그인 연결은 별도 설계가 필요합니다. 실제 로그인은 실행하지 않았습니다. | [page.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/app/login/page.tsx>) |
| 수정·삭제·한도 | 재분류·삭제·무료 100개·가이드 20개 | 재분류·삭제·한도 코드 | 분류/메모 수정; 삭제 없음 | 삭제·용량 한도·오류 복구를 토스 범위에서 결정해야 합니다. | [queries.ts](</Users/ssongji/Developer/Workspace/scrave-slate-design/packages/shared/src/supabase/queries.ts>) |
| 오프라인 재열람 | 캐시/세션에 따른 범위; 보장 미검증 | SQLite 로컬 기록 코드 | 현재 브라우저 재열람 확인 | 앱 종료·재설치·네트워크 단절·실기기 데이터 수명 검증이 남았습니다. | [database.ts](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/mobile/services/database.ts>) |
| 손그림·스티커북 | 손그림·100종 PNG·ZIP | 그림 8종 연결; 스티커북 화면 미확인 | 없음 | 웹 스티커북의 100개 링크를 확인했습니다. 다운로드 파일 검사는 이번에 반복하지 않았습니다. | [page.tsx](</Users/ssongji/Developer/Workspace/scrave-slate-design/apps/web/src/app/stickers/page.tsx>) |

## 디자인에서 먼저 확인할 항목

[High / 우선순위 높음] 원본 확대 창의 잘림 오류를 운영 화면에서 재현했습니다. 390×844 화면에서 첫 카드의 ‘원본’을 누르면 `position: fixed`인 창이 약 171×315 크기의 카드 안에 갇힙니다. 카드의 `scale` 계산값은 1.01이며 마우스를 치운 뒤에도 1로 남아 같은 문제가 이어졌습니다. 브라우저에서 해당 카드의 `scale`을 잠시 `none`으로 지정하고 스타일 전환이 끝나자 창이 390×844로 돌아왔습니다. 원인 확인 후 임시 스타일을 되돌렸으며 서비스 파일은 수정하지 않았습니다. `CaptureCard.tsx`의 카드 `hover:scale-[1.01]`·`overflow-hidden`과 내부 고정 확대 창, `EditorialArchive.module.css`의 `transform: none`만 적용하는 규칙을 함께 확인했습니다. 실기기 터치 재현 범위는 남아 있지만 브라우저 오류는 확인했습니다. [오류 화면](../../_dogfood/scrave-audit-1030/production-original-390.png)과 [브라우저 임시 실험](../../_dogfood/scrave-audit-1030/diagnostic-original-scale-none-390.png)을 구분합니다. 임시 실험 화면은 서비스 수정 완료 증거가 아닙니다.

1. [High] 토스 시제품의 크림 바탕·코럴 버튼·시스템 폰트와 큰 소개 제목은 최신 흰 바탕·슬레이트·SUIT 기준과 다릅니다. 분류 색은 공통 값을 읽지만 모든 표시를 원으로 그려 분류별 도형도 빠졌습니다. 최신 디자인을 먼저 이식해야 비교가 가능합니다.
2. [High] 운영 390×844 화면의 첫 카드 시작점은 y=593.39, 제목 시작점은 y=853.39입니다. 첫 화면에서 제목을 읽기 위해 스크롤해야 합니다. 상단 여백·분류 줄·추가 영역·검색·보기 필터를 함께 줄이는 안을 검토하면 저장한 내용을 더 빨리 확인할 수 있습니다. 그림과 브랜드를 유지하는 범위의 배치 개선 제안이며 이번에 앱 코드는 고치지 않았습니다.
3. [High] 운영 화면의 보조 보기 필터 높이는 30px, 원본 버튼은 23px입니다. 자체 기준의 주요 터치 영역 44px에 못 미치는 조작부를 먼저 확인해야 합니다. 제목은 실제 18px로 읽혀 DESIGN.md의 28px와 차이가 있습니다. 모바일 규칙을 별도로 확정하거나 스타일 충돌을 정리해야 합니다.
4. [High] 네이티브 지도 내부 HTML에는 검정·초록 스타일과 `user-scalable=no`가 남아 있습니다. 흰 바탕·슬레이트 기준 및 확대 접근성과의 차이를 소스에서 확인했습니다. 실제 기기의 해당 화면은 미검증입니다.
5. [High] 1600px 운영 화면에서 4열 격자와 동일한 카드·제목 시작점, 390px에서 2열·가로 넘침 없음을 확인했습니다. 표본은 비로그인 샘플 2개이므로 긴 제목·사진 비율이 다른 실제 기록·대량 보관함 검증은 남아 있습니다.

## 데이터·오류·출시 전에 남은 항목

[High] ‘원본 전체 표시’와 ‘처음 받은 파일 보존’을 구분해야 합니다. 웹의 단일/여러 장 업로드는 `createJpegUploadFile`을 거쳐 JPEG로 다시 인코딩하며 폭이 2048px보다 크면 줄이고 품질 값 0.92를 사용합니다. 따라서 프레임이 잘리지 않아도 파일 바이트와 해상도가 그대로라는 보장은 없습니다. 모바일 앨범 선택은 품질 0.8을 요청하고 토스 연결은 최대 크기 4096을 요청합니다. 긴 캡처·예약 번호·QR 코드의 읽기 품질과 원본 보관 정책을 실제 파일로 확인해야 합니다.

[High] 웹의 이유·다시 볼 시점·행동 상태 같은 부가 기록은 로컬 저장 코드를 사용합니다. 계정의 이미지·분석 기록과 같은 동기화 보장으로 안내하면 안 됩니다. 토스 시제품도 IndexedDB(브라우저의 기기 내 저장소)를 사용하므로 기기 변경·앱 데이터 삭제와 복구 정책을 확인해야 합니다.

[High] 네이버 지도 인증 실패 뒤 안내와 기본 지도로 바뀌는 것은 확인했습니다. 인증 자체가 해결된 것은 아닙니다. 비로그인 상세의 출처 요청은 HTTP 401을 받고 로그인 안내를 보여 줬으며, 이를 전체 앱 장애로 판정하지 않았습니다. 가이드 목록과 설정은 로그인 화면으로 이동했습니다.

[High: 코드 위험 / Unknown: 기존 배포본의 실제 키 포함 여부] 모바일 설정에는 `OPENAI_API_KEY=` 값을 앱 설정에 넣는 경로와 단말에서 OpenAI를 직접 호출하는 대체 경로가 남아 있습니다. 기본 분석기는 서버 방식입니다. 이번 점검은 실제 키가 배포됐다고 판정하지 않았으며 키 값도 조회·기록하지 않았습니다. 배포 설정에서 키를 제외하고 서버 분석만 쓰는지 출시에 앞서 검증해야 합니다. 인증·시크릿 관련 수정은 별도 범위입니다.

## 이번에 실행한 검증

최신 `d5f31fd` 소스에서 웹 68개 파일의 450개 테스트, 공통 22개 파일의 242개 테스트, 모바일 18개 묶음의 79개 테스트가 통과했습니다. 합계 771개입니다. 웹에는 기존 조건부 실호출 테스트 3개가 실행되지 않았습니다. `TEST_E2E` 조건이 켜지면 분석 서버를 호출하는 기존 검사이며, 비용 승인이 없는 이번 점검에서는 켜지 않았습니다. 웹·모바일 타입 검사도 통과했습니다. 테스트와 타입 검사는 로그인·실기기·실제 AI 결과의 증거와 구분합니다.

```sh
# 최신 소스 작업 폴더에서 실행했습니다.
(cd apps/web && node ../../node_modules/vitest/vitest.mjs run)
(cd packages/shared && node ../../node_modules/vitest/vitest.mjs run)
(cd apps/mobile && node ../../node_modules/jest/bin/jest.js --config package.json --runInBand)
node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/web/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/mobile/tsconfig.json
```

첫 웹 검사 설정은 다른 폴더에서 실행하면서 파일 경로를 해석하지 못했고, 공통 검사도 작업 경로 때문에 파일을 찾지 못했습니다. 기존 프로젝트 설정과 해당 폴더에서 다시 실행해 위 통과 결과를 얻었습니다. 제품 코드를 변경하거나 테스트를 제외하지 않았습니다. 로그는 `_dogfood/scrave-audit-1030/slate-*.log`에 보관했습니다.

토스 시제품은 앞선 단위 검사 13개 및 브라우저/토스 번들 빌드를 통과했습니다. 이번에는 검토용 그림 한 장을 선택해 제목·분류를 정하고 저장한 뒤 새로고침해 다시 읽었습니다. 검색 결과 없음·검색 복구·분류 필터를 직접 확인했습니다. 실제 토스 호스트의 사진 권한과 뒤로가기·홈 버튼은 미검증입니다. 다른 서비스에 이미지를 보내거나 유료 분석을 호출하지 않았습니다.

브라우저 증거는 같은 폴더의 `production-home-current-390.png`, `production-home-1600.png`, `production-detail-390.png`, `production-original-390.png`, `production-map-settled-390.png`, `production-login-390.png`, `production-stickers-390.png`, `toss-pilot-390.png`, `toss-editor-390.png`, `toss-saved-390.png`입니다. 가이드/설정의 로그인 이동 화면은 `production-guides-login-390.png`와 `production-settings-login-390.png`로 구분했습니다. 초기 로딩 단계의 스크린샷은 판정 근거로 사용하지 않습니다. 원본 확대 화면은 재촬영으로 오류를 확인했으며 앞선 정상 추정을 정정했습니다.

## 다음 순서와 완료 상태

- [x] 최신 결정·작업 소스·운영 화면을 대조했습니다.
- [x] 전체 주요 기능 목록과 웹·모바일·토스의 차이를 기록했습니다.
- [x] 기존 테스트·게스트 화면·시제품 저장을 검증했습니다.
- [ ] 실제 계정으로 로그인·저장·동기화·삭제·공유를 확인해야 합니다.
- [ ] 비용을 정한 뒤 분석 정확도·출처·후기·가이드 결과를 시험해야 합니다.
- [ ] 긴 캡처·다른 사진 비율·대량 기록·200% 글자 확대·키보드·오프라인을 앱 전체에서 검사해야 합니다.
- [ ] 실제 iPhone/Android 및 토스 호스트에서 권한·취소·재진입·탐색·저장 수명을 확인해야 합니다.

추천은 원본 확대 오류를 먼저 고친 뒤 최신 디자인을 보존하면서 사진 선택 → 정리 → 보관 → 원본 재열람의 한 흐름을 먼저 맞추는 것입니다. 좋은 점은 Scrave의 기존 분류·출처·장소 코드를 재사용할 근거가 있다는 점입니다. 우려는 현재 시제품이 수동 로컬 저장만 제공해 전체 앱으로 오해될 수 있다는 점입니다. 대안은 토스에서 가볍게 수집하고 기존 보관함으로 이어 주는 방식이지만, 로그인과 동기화 구조를 먼저 검토해야 합니다. [Medium: 구현 순서 제안]

현재는 전체 목록과 차이의 점검을 마쳤고 실제 계정·분석·실기기 검증이 남았습니다. 최초 콘솔 등록은 이 사전 점검 다음 단계로 보류합니다. 공개 등록·배포·운영 데이터 변경은 실행하지 않았습니다. 재검토일은 2026-11-02로 두며 그 전에 사용자가 범위를 정하면 갱신합니다.

비교판 자체는 디자인 검사, 기능 검색·필터, 390px 화면과 문서 글자 200% 확대를 확인했습니다. 확대 검사에서 검색 입력칸의 가로 넘침을 찾아 수정했고 다시 통과했습니다. 이는 검토 문서의 검사이며 기존 앱 전체의 확대 검증과 구분합니다.


## 후속 방향 — 기존 휴대폰용 Scrave를 기준으로 통합합니다

사용자가 최신 디자인과 기능을 원래 만들던 휴대폰용 앱에 통합한 뒤 그 앱을 앱인토스에 넣는 방향을 제안했습니다. 이 방향을 우선 검토하며, 별도 수동 보관함 시제품의 기능을 독립 제품으로 확대하지 않습니다. 기존 시제품은 사진 연결·저장 시험의 근거로 보존합니다.

기존 앱은 Expo 기반 React Native(자바스크립트 화면 코드로 iOS·Android 앱을 만드는 방식)입니다. 앱인토스도 React Native를 지원하지만 Granite(토스 안에서 앱을 실행하는 개발 환경) 1.x를 사용하며 네이티브 라이브러리는 지원 범위 안에서만 허용합니다. 따라서 화면·분류·분석 데이터·서버 기능의 재사용과 Expo 설치 파일의 직접 업로드를 구분해야 합니다. [공식 React Native 시작 안내](https://developers-apps-in-toss.toss.im/tutorials/react-native.html)를 2026-10-30에 확인했습니다.

추천 순서는 기존 모바일의 최신 디자인·기능 통합 → 사진 선택부터 원본 재열람까지 실제 앱 검증 → 토스 환경에 맞춘 연결 교체입니다. 사진 선택·기기 저장·로그인·화면 이동·지도·글꼴 등 기기 기능을 토스 지원 범위와 대조해야 합니다. 기존 Google·카카오 계정과 토스 계정의 연결은 인증 설계 범위이며 자동으로 같은 사용자라고 가정하지 않습니다. 공통 기능 재사용을 우선하되 라이브러리 호환성에 따라 화면 일부를 고쳐야 할 수 있습니다.

이번 확인에서는 새 패키지를 설치하거나 인증·앱 코드를 변경하지 않았습니다. 앞서 승인한 웹 연결 도구 설치를 React Native용 새 도구 설치 승인으로 넓히지 않습니다. 최초 콘솔 등록과 공개 출시는 계속 보류합니다. [Medium: 구현 경로 제안]


## 2026-10-30 실행 승인과 통합 작업 위치

사용자가 “해줘”로 기존 모바일 통합과 앱인토스 이식 방향의 실행을 승인했습니다. 최신 디자인 커밋 `d5f31fd`에서 별도 `codex/mobile-toss-integration` 브랜치를 만들었으며, [현재 구현·검증·다음 단계](/Users/ssongji/Developer/Workspace/scrave-mobile-toss-integration/docs/coordination/2026-10-30_scrave-mobile-toss-integration.md)에 진행 상태를 기록합니다. 이 시제품과 점검 자료는 보존하고, 토스 네이티브 도구 설치는 저장소의 새 의존성 확인 규칙에 따라 승인 대기합니다.
