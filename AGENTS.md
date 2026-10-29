# AGENTS.md — Scrave

스크린샷을 AI로 분석하여 장소/텍스트를 자동 분류하고 저장하는 개인 아카이브 앱.

## Universal Rules

- Do not edit `.env*` files without explicit request.
- Ask before adding new dependencies.
- Report risks and verification results clearly before finishing.

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Development Process — TDD

All new features and bug fixes follow Red-Green-Refactor:

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Clean up, keep tests green

Rules:
- No production code without a failing test
- Pure logic in testable modules (`packages/shared/src/utils/` or `apps/web/src/lib/`), not inline in routes/components
- API routes call extracted pure functions
- Test files: `__tests__/<module>.test.ts` colocated with source
- Test runner: vitest (shared, web), jest (mobile)

## Project Overview

스크린샷·이미지·링크를 저장하고 다시 찾아 활용하는 개인 아카이브 앱입니다. 현재 문제 정의와 작업 배정은 [DECISIONS.md](DECISIONS.md)와 [통합 작업판](docs/coordination/2026-10-09_scrave-master-plan.md)을 확인합니다.

## 링크 하나만 들어왔을 때

사용자가 URL 하나만 보내거나 저장·분석을 요청하면 단순 참고 링크로 취급하지 않는다.
그 자체를 자율 지식 인입 요청으로 해석한다.

1. 인스타그램 링크는 `node scripts/inspect-social-link.mjs "<URL>"`로 원문과 이미지 묶음, 선택한 이미지 번호를 먼저 확인한다.
2. [링크 인입 계약](docs/link-intake-contract.md)에 따라 여행·장소, 마케팅, 브랜딩, 학습, 수업자료 후보, 일반 참고자료 중 하나로 분류한다.
3. 장소 자산은 실제 검색으로 지역·주소·좌표·운영 정보를 검증하고 지도 자산 후보로 보낸다.
4. 비장소 자산은 해당 참고자료 저장소의 수집 상태로 두며, 검증 전에는 수업자료나 확정 지식으로 단정하지 않는다.
5. 원본 URL·작성자·이미지 묶음을 보존하고, 관련 없는 주제나 대체 이미지로 바꾸지 않는다.

최신 확정 방향은 `DECISIONS.md`를 먼저 확인한다.

## Stack

npm workspaces와 Turborepo를 사용합니다. 웹은 `apps/web`, 모바일은 `apps/mobile`, 공통 코드는 `packages/shared`에 있습니다. 의존성과 버전은 각 폴더의 `package.json`을 확인합니다.

## Dev Servers

웹은 `npm run dev:web`, 모바일은 `npm run dev:mobile`로 실행합니다. 실제 접속 주소는 실행 로그에서 확인합니다.

## Commands

루트에서 빌드는 `npm run build`, 타입 검사는 `npm run typecheck`를 사용합니다. 공통 코드 테스트는 `npm run test --workspace=@scrave/shared`, 모바일 테스트는 `npm run test --workspace=@scrave/mobile -- --runInBand`를 사용합니다.

## Quality Gates

변경한 영역의 기존 테스트와 타입 검사를 실행합니다. 루트에 단일 `test` 명령은 없으므로 위의 작업공간별 명령을 사용합니다. 웹의 `package.json`에는 테스트 명령이 없어 변경 기능에 맞는 기존 검증 절차를 먼저 확인합니다.

## Protected Files

위 Universal Rules의 `.env*` 수정 제한과 전역 보호 파일·인증·데이터 변경 승인 경계를 따릅니다. 보호 여부가 불명확하면 수정 전에 확인합니다.

## 작업 시작과 컨텍스트 복구

[작업 시작과 복구 안내](docs/context-start.md)를 읽고 현재 작업의 근거와 상태 기록 위치를 확인합니다.
