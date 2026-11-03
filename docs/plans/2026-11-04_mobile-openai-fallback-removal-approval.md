# 모바일 OpenAI 직접 호출 제거 결재안

작성일: 2026-11-04
상태: 범위·검증 기준 확정 · 코드 변경 전

## 현재 위험

모바일의 기본 분석은 인증된 Scrave 서버를 사용합니다. 그러나 아래 비상 경로가 저장소에 남아 있습니다.

- `app.config.ts`가 `OPENAI_API_KEY=`와 `AI_PROVIDER=`를 앱 설정으로 전달할 수 있습니다.
- `services/ai-analyzer.ts`는 `AI_PROVIDER=openai`일 때 클라이언트 분석기를 선택합니다.
- `services/analyzers/openai-analyzer.ts`는 앱에서 OpenAI API를 직접 호출합니다.
- `app.json.bak`과 `docs/SECURITY.md`에는 이전 직접 호출 설정이 남아 있습니다.

현재 iOS·Android 내보내기에는 해당 필드가 없고 빌드 시 키 값도 비어 있었습니다. 다만 환경변수가 잘못 주입되면 서버용 키를 앱 번들에 포함할 수 있으므로 구조 자체를 제거하는 편이 안전합니다.

## 승인 뒤 변경할 범위

1. 실패 테스트를 먼저 추가합니다.
   - 환경변수 값이 있어도 Expo 공개 설정에 `openaiApiKey`와 `aiProvider`가 생기지 않아야 합니다.
   - 모바일 분석기는 항상 `ServerAnalyzer`를 사용하고 로그인 토큰 전달을 유지해야 합니다.
   - 모바일 프로덕션 코드에 `api.openai.com` 직접 호출이 남지 않아야 합니다.
2. `app.config.ts`에서 두 설정 주입을 제거합니다.
3. `services/ai-analyzer.ts`의 제공자 분기와 동적 OpenAI 분석기 로딩을 제거합니다.
4. 사용되지 않는 `services/analyzers/openai-analyzer.ts`와 오래된 `app.json.bak`을 삭제합니다.
5. `docs/SECURITY.md`를 서버 분석 전용 구조와 검증 결과에 맞게 고칩니다.

새 의존성, 유료 AI 호출, 운영 데이터 변경은 없습니다.

## 수락 기준과 검증

- 새 실패 테스트가 변경 전 실패하고 변경 후 통과합니다.
- 모바일 전체 Jest, 타입 검사, `verify:core`, 웹 Chromium 여정이 통과합니다.
- iOS·Android Expo 내보내기가 통과합니다.
- 두 내보내기 메타데이터에서 `openaiApiKey`·`aiProvider` 필드가 0개입니다.
- 모바일 프로덕션 코드에서 `api.openai.com`과 직접 OpenAI 분석기 참조가 0개입니다.
- 시크릿 검사는 gitleaks, trufflehog, 수동 패턴 검사 모두 통과합니다.

## 트레이드오프

서버 장애 때 모바일이 OpenAI를 직접 호출하는 비상 우회로는 사라집니다. 대신 서버가 인증·요청 제한·비용 통제를 한곳에서 담당하며, 서버용 키가 설치 앱에 들어갈 가능성을 구조적으로 없앱니다. 서버 장애는 재시도와 오류 안내로 처리하고 클라이언트 키 주입으로 우회하지 않습니다.

## 추천

제거를 추천합니다. 현재 운영에서 기본으로 쓰는 경로는 이미 서버 분석입니다. 비상 경로가 주는 편익보다 키 노출·무단 사용·예상 밖 비용 위험이 큽니다.
