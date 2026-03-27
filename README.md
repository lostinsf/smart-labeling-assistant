# 라벨링 보조 시스템

AI 추천과 사용자 검증을 한 화면에서 연결해 라벨링 생산성과 정확도를 함께 높이는 웹 도구입니다. 핵심은 추천 자체보다 추천값과 사용자 선택값의 차이를 빠르게 드러내는 품질 보조 흐름에 있습니다.

## 현재 구현 범위

- 단건 입력 기반 추천/검증
  - 상품명, 설명 입력
  - `AI 추천 실행` 버튼 기반 추천
  - 사용자 카테고리 선택
  - `검증 실행` 버튼 기반 검증
- 다건 업로드 기반 추천/검증
  - CSV/TSV 업로드
  - 샘플 파일 다운로드
  - 추천 일괄 실행
  - 검증 일괄 실행
  - 품질 추적 일괄 등록
  - 검색, 상태 필터, 페이지 크기 변경, 페이지네이션
  - 행 클릭 시 Step 1~4 전체 동기화
- 품질 추적
  - 검증 이력 통계
  - 최근 검증 이력
  - 불일치 중심 추적
  - CSV 리포트 다운로드
  - 저장 대기 레코드 관리
- AI 추천 엔진
  - 룰 기반 추천
  - OpenAI 연동 시 LLM 추천 우선
  - 실패 시 룰 기반 fallback
- 운영 편의
  - 상단 `Mode / OpenAI` 상태 표시
  - 로컬 `.dev.vars` 기반 OpenAI 테스트 지원

## 파일 구조

```text
.
|-- .dev.vars.example
|-- .rule
|-- AI_HANDOFF.md
|-- README.md
|-- index.html
|-- package.json
|-- postcss.config.js
|-- tailwind.config.js
|-- tsconfig.app.json
|-- tsconfig.json
|-- vite.config.ts
|-- wrangler.toml
|-- src
|   |-- App.tsx
|   |-- main.tsx
|   |-- styles.css
|   |-- api
|   |   `-- labelingApi.ts
|   |-- components
|   |   |-- BatchUploadSection.tsx
|   |   |-- ProductInputSection.tsx
|   |   |-- RecommendationSection.tsx
|   |   |-- ResultSection.tsx
|   |   `-- ValidationSection.tsx
|   |-- lib
|   |   |-- categories.ts
|   |   |-- categoryMeta.ts
|   |   |-- descriptionCleaner.ts
|   |   |-- reportExport.ts
|   |   |-- sampleBatchData.ts
|   |   `-- tabularImport.ts
|   |-- store
|   |   `-- useLabelingStore.ts
|   `-- types
|       `-- labeling.ts
`-- workers
    |-- ai.ts
    |-- engine.ts
    `-- index.ts
```

## 주요 흐름

### 1. 단건 작업

1. 상품명과 설명 입력
2. `AI 추천 실행`
3. 추천 카테고리, 키워드, 근거 확인
4. 사용자 카테고리 선택
5. `검증 실행`
6. 결과와 품질 추적 확인

### 2. 다건 작업

1. CSV/TSV 업로드
2. `추천 일괄 실행`
3. 필요 시 사용자 카테고리 수정
4. `검증 일괄 실행`
5. `품질 추적 일괄 등록`
6. 결과 리포트 다운로드

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. Worker API 실행

```bash
npm run worker:dev
```

OpenAI Secret을 Cloudflare remote 환경으로 확인하려면:

```bash
npm run worker:dev:remote
```

### 3. 프런트엔드 실행

```bash
npm run dev
```

### 4. 검증

```bash
npm run build
npm run lint
```

## OpenAI 연동

### Cloudflare Secret

```bash
wrangler secret put OPENAI_API_KEY
```

### Worker 변수

`wrangler.toml` 기본값:

```toml
[vars]
AI_MODE = "auto"
OPENAI_MODEL = "gpt-4.1-mini"
```

동작 기준:

- `AI_MODE=rule`: 항상 룰 기반 추천
- `AI_MODE=auto`: OpenAI 사용 가능 시 LLM 추천, 실패 시 룰 기반 fallback

### 로컬 개발용 설정

`.env`는 사용하지 않습니다. 로컬 Worker 테스트는 `.dev.vars`로만 진행합니다.

1. 예시 파일 복사

```powershell
Copy-Item .dev.vars.example .dev.vars
```

2. `.dev.vars` 작성

```text
OPENAI_API_KEY="여기에_실제_OpenAI_API_KEY"
AI_MODE="auto"
OPENAI_MODEL="gpt-4.1-mini"
```

3. 실행

```bash
npm run worker:dev
npm run dev
```

4. 확인

- `http://127.0.0.1:8787/api/health`
- 상단 상태 배지에서 `Mode / OpenAI`

## Cloudflare 배포

### Worker 배포

```bash
npm run worker:deploy
```

### Pages 배포

```bash
npm run build
npm run pages:deploy
```

### Pages 환경 변수 설정

배포된 Pages가 Worker API를 직접 호출하도록 아래 환경 변수를 반드시 설정합니다.

```text
VITE_API_BASE_URL=https://smart-labeling-assistant-api.lostinsf.workers.dev
```

설정 위치:

1. Cloudflare Dashboard
2. `Workers & Pages`
3. `smart-labeling-assistant`
4. `Settings`
5. `Variables and Secrets`
6. `Environment Variables`

추가 후에는 Pages를 다시 배포해야 반영됩니다.

이 설정이 없으면 Pages는 `/api/*`를 자기 도메인으로 호출하게 되고, `Mode / OpenAI` 상태가 꺼진 것처럼 보일 수 있습니다.

### 한 번에 배포

```bash
npm run cf:deploy
```

## 배포 전 체크리스트

- `npm run build`
- `npm run lint`
- `.dev.vars`가 커밋 대상에 포함되지 않았는지 확인
- `node_modules`, `dist`, `.wrangler`가 커밋 대상에 포함되지 않았는지 확인
- Cloudflare Secret과 Variables가 배포 환경에 설정되어 있는지 확인
- Pages에 `VITE_API_BASE_URL`이 설정되어 있는지 확인

## 샘플 테스트 데이터

단건 예시:

- 상품명: `세라마이드 보습 크림 50ml`
- 설명: `민감성 피부를 위한 보습 크림으로 진정과 수분 공급에 도움을 줍니다.`

다건 예시는 UI의 `샘플 다운로드` 버튼으로 바로 받을 수 있습니다.
