# 라벨링 보조 시스템

AI 추천과 사용자 검증을 한 화면에서 연결해 라벨링 생산성과 정확도를 함께 높이는 웹 도구입니다.

## 주요 기능

- 단건 입력 기반 추천/검증
- CSV/TSV 업로드 기반 다건 추천/검증
- 품질 추적 일괄 등록
- 최근 검증 이력과 통계
- CSV 리포트 다운로드
- 상단 `Mode / OpenAI` 상태 표시

## 실행 방법

```bash
npm install
npm run worker:dev
npm run dev
```

검증:

```bash
npm run build
npm run lint
```

## OpenAI 설정

Secret 등록:

```bash
wrangler secret put OPENAI_API_KEY
```

`wrangler.toml` 기본값:

```toml
[vars]
AI_MODE = "auto"
OPENAI_MODEL = "gpt-4.1-mini"
```

로컬 테스트는 `.dev.vars`만 사용합니다.

## 배포

Worker:

```bash
npm run worker:deploy
```

Pages:

```bash
npm run pages:deploy
```

Pages 배포 스크립트는 정적 파일과 함께 `_worker.js`를 생성해 같은 도메인의 `/api/*` 요청을 처리합니다.

즉 브라우저는 외부 API 주소를 직접 호출하지 않고 아래처럼 같은 주소 체계를 사용합니다.

- 프런트: `https://smart-labeling-assistant.pages.dev/`
- 프런트 내부 API: `https://smart-labeling-assistant.pages.dev/api/*`

## 체크리스트

- `npm run build`
- `npm run lint`
- `.dev.vars`가 커밋 대상에 없는지 확인
- `node_modules`, `dist`, `.wrangler`가 커밋 대상에 없는지 확인
