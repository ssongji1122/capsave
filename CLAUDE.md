# Scrave

스크린샷을 AI로 분석하여 장소/텍스트를 자동 분류하고 저장하는 개인 아카이브 앱.

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Development Process — TDD

All new features and bug fixes follow Red-Green-Refactor:

1. RED: Write failing test first
2. GREEN: Write minimal code to pass
3. REFACTOR: Clean up, keep tests green

Rules:
- No production code without a failing test
- Pure logic in testable modules (shared/src/utils/ or web/src/lib/), not inline in routes/components
- API routes call extracted pure functions
- Test files: `__tests__/<module>.test.ts` colocated with source
- Test runner: vitest (shared, web), jest (mobile)