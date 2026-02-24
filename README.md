# FMD — Find My Design

> AI 기반 디자인 검색 엔진. 텍스트 설명이나 스케치로 원하는 디자인을 묘사하면, AI가 분석해 여러 소스에서 매칭 상품을 찾아 랭킹 순으로 추천합니다.

---

## 프로젝트 개요

디자이너나 기획자가 "이런 느낌의 디자인 에셋이 필요한데"라고 생각할 때, 직접 키워드를 떠올리거나 여러 사이트를 돌아다닐 필요 없이 — 텍스트로 묘사하거나 간단한 스케치만 해도 AI가 의도를 분석해 관련 디자인 상품을 찾아주는 검색 엔진입니다.

사용자 입력 → **DesignProfile 생성** → **AI 레퍼런스 이미지 생성** → **멀티 프로바이더 검색** → **TF-IDF 임베딩 기반 랭킹** → 결과 반환의 파이프라인으로 동작합니다.

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| **프론트엔드** | Next.js 16, TypeScript, Tailwind CSS v4, Lucide React |
| **백엔드** | FastAPI, SQLAlchemy async, Pydantic v2 |
| **데이터베이스** | SQLite (개발) / PostgreSQL (프로덕션) |
| **비동기 큐** | asyncio.Queue 인메모리 (개발) / Redis (프로덕션) |
| **AI 이미지 생성** | Stability AI (Stable Diffusion), Pollinations.ai, DiceBear |
| **이미지 처리** | Pillow (캔버스 dominant color 추출) |
| **HTTP 클라이언트** | httpx (async) |
| **테스트** | pytest, pytest-asyncio |

---

## 시스템 아키텍처

```
┌────────────────────────────────────────────────┐
│              Next.js 프론트엔드                  │
│     텍스트 입력 / 드로잉 캔버스 / 히스토리 패널    │
└─────────────────┬──────────────────────────────┘
                  │ REST API
┌─────────────────▼──────────────────────────────┐
│                FastAPI 백엔드                    │
│                                                 │
│  POST /sessions      POST /designs              │
│  GET  /sessions/{id}/history                    │
│  POST /designs/{id}/process                     │
│  GET  /jobs/{id}     POST /search               │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │           Job Processor (async)          │   │
│  │  1. DesignProfile 생성 (키워드 + 색상)    │   │
│  │  2. TF-IDF 임베딩 벡터 생성 & 저장       │   │
│  │  3. AI 레퍼런스 이미지 생성              │   │
│  └──────────────────────────────────────────┘   │
│                      │                          │
│       ┌──────────────┼──────────────┐           │
│       ▼              ▼              ▼           │
│  ┌─────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  Mock   │  │    API    │  │  AI Image    │  │
│  │Provider │  │ Provider  │  │  Generator   │  │
│  │ 22 상품  │  │Unsplash   │  │  우선순위 체인│  │
│  │picsum   │  │Pexels     │  │  Stability AI│  │
│  │이미지   │  │Pixabay    │  │  Pollinations│  │
│  └─────────┘  └───────────┘  │  DiceBear    │  │
│                               └──────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │         Ranking Engine                   │   │
│  │  TF-IDF 코사인 유사도 + 색상 유사도        │   │
│  │  + 키워드 매칭 + 메타 점수 + 페널티       │   │
│  └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

---

## 주요 기능

### 입력
- **텍스트 프롬프트** — 영어 및 한국어 입력 지원, 한국어 키워드 자동 번역
- **드로잉 캔버스** — 스케치를 그리면 dominant color를 픽셀 분석(Pillow)으로 추출
- **카테고리 선택** — UI / Logo / Icon / Illustration

### AI 분석 파이프라인
- **키워드 추출** — 불용어 제거, 한국어→영어 번역 매핑
- **색상 감지** — 텍스트에서 색상명 파싱 / 캔버스에서 RGB 픽셀 분석
- **TF-IDF 임베딩** — 키워드 벡터를 JSON bytes로 직렬화해 DB 저장, 랭킹 시 코사인 유사도 계산 (Python stdlib만 사용, 외부 의존성 없음)

### AI 이미지 생성 (우선순위 체인)
API 키 없이도 동작하는 다단계 폴백 구조:
```
ComfyUI (로컬) → Stability AI → HuggingFace → Stable Horde
  → Pollinations.ai (무료) → DiceBear (무료 SVG) → 로컬 SVG
```

### 검색 & 랭킹
- **Mock Provider** — 22개 샘플 상품, 실제 Dribbble / Behance / Figma / Freepik 등 마켓플레이스 링크 연결
- **API Provider** — Unsplash / Pexels / Pixabay 공식 무료 API, 키 없을 때도 picsum.photos 이미지로 폴백
- **랭킹 공식** — `0.55×임베딩 + 0.20×색상 + 0.20×키워드 + 0.05×메타` (임베딩 있을 때) / 네거티브 키워드 페널티 / 중복 URL 페널티

### 비동기 잡 처리
- `POST /designs/{id}/process` → Job 생성 → `asyncio.create_task` 인라인 처리
- 프론트엔드가 `/jobs/{id}` 폴링으로 진행률 실시간 표시 (`0% → 40% → 70% → 100%`)

### 검색 히스토리
- `GET /sessions/{id}/history` — 세션 내 최근 20개 검색 반환
- 각 항목: AI 레퍼런스 이미지, 키워드 태그, dominant color, 상위 3개 결과 미리보기
- 프론트엔드 슬라이드오버 패널 (첫 검색 후 Header에 History 버튼 표시)

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/api/sessions` | 검색 세션 생성 |
| `GET` | `/api/sessions/{id}/history` | 세션 검색 히스토리 조회 |
| `POST` | `/api/designs` | 디자인 제출 (텍스트 또는 캔버스) |
| `POST` | `/api/designs/{id}/process` | AI 처리 잡 시작 |
| `GET` | `/api/jobs/{id}` | 잡 상태 및 진행률 폴링 |
| `POST` | `/api/search` | DesignProfile 기반 검색 실행 |
| `GET` | `/health` | 헬스 체크 |

---

## 데이터 모델

```
Session ──< Design ──1 DesignProfile ──< SearchRun ──< SearchResult
                 └──< Job
```

| 모델 | 주요 필드 |
|---|---|
| `Session` | id, user_agent, ip_hash |
| `Design` | session_id, input_mode, text_prompt, canvas_data, status |
| `DesignProfile` | keywords, dominant_color, embedding(bytes), profile(JSON) |
| `Job` | status, progress, result(JSON), error_code |
| `SearchResult` | title, image_url, product_url, score_overall, score_keyword, score_color, score_embedding |

---

## 프로젝트 구조

```
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI 라우트 핸들러 (5개 엔드포인트)
│   │   ├── core/           # 설정, DB, 커스텀 타입, 인메모리 캐시
│   │   ├── models/         # SQLAlchemy 모델 (7개 테이블)
│   │   ├── providers/      # 검색 프로바이더 (mock, api)
│   │   ├── services/       # 비즈니스 로직
│   │   │   ├── profile_generator.py   # 키워드 추출 + 색상 분석
│   │   │   ├── image_generator.py     # AI 이미지 생성 (폴백 체인)
│   │   │   ├── embedder.py            # TF-IDF 임베딩 (stdlib만 사용)
│   │   │   └── ranking.py             # 랭킹 알고리즘
│   │   ├── worker/         # 비동기 잡 프로세서
│   │   └── main.py
│   ├── tests/              # pytest 테스트 (26개)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js 페이지 (SPA)
│   │   ├── components/     # React 컴포넌트 9개
│   │   │   ├── Header.tsx             # 히스토리 버튼 포함
│   │   │   ├── HistoryPanel.tsx       # 검색 히스토리 슬라이드오버
│   │   │   ├── ProductCard.tsx        # 검색 결과 카드
│   │   │   ├── DrawingCanvas.tsx      # 스케치 입력 캔버스
│   │   │   └── ...
│   │   ├── lib/api.ts       # API 클라이언트 + 잡 폴링
│   │   └── types/api.ts     # TypeScript 타입 정의
│   └── package.json
└── package.json             # 루트 워크스페이스 스크립트
```

---

## 실행 방법

### 사전 요구사항

- Node.js 18+ & pnpm
- Python 3.10+

### 설치

```bash
# 백엔드
cd backend && pip install -r requirements.txt

# 프론트엔드
cd frontend && pnpm install
```

### 환경 변수 (선택 사항)

`backend/.env` 파일 생성:

```bash
STABILITY_API_KEY=sk-...       # Stable Diffusion 이미지 생성
UNSPLASH_ACCESS_KEY=...        # Unsplash API (무료 50 req/hr)
PEXELS_API_KEY=...             # Pexels API (무료 200 req/hr)
PIXABAY_API_KEY=...            # Pixabay API (무료 100 req/hr)
```

> 모든 API 키는 선택 사항입니다. 키 없이도 mock 데이터와 무료 이미지 서비스로 전체 기능이 동작합니다.

### 개발 서버 실행

```bash
pnpm dev        # 프론트엔드(:3000) + 백엔드(:8000) 동시 실행

pnpm dev:fe     # 프론트엔드만 http://localhost:3000
pnpm dev:be     # 백엔드만    http://localhost:8000
```

### 테스트

```bash
pnpm test:be                     # 전체 백엔드 테스트 (26개)
pnpm test:be:one "test_name"     # 단일 테스트 실행
```

---

## 설계 포인트

**API 키 없이도 완전히 동작하는 구조**
모든 외부 서비스에 다단계 폴백 체인을 적용해, 어떤 환경에서도 전체 기능이 동작합니다. Pollinations.ai → DiceBear → 로컬 SVG 생성까지 이어지는 이미지 생성 체인이 대표적인 예입니다.

**외부 ML 라이브러리 없는 임베딩 구현**
TF-IDF 기반 코사인 유사도를 Python 표준 라이브러리(`math`, `json`, `collections`)만으로 구현했습니다. numpy나 scikit-learn 없이도 의미 있는 시맨틱 유사도 점수를 랭킹에 반영합니다.

**SQLite/PostgreSQL 공용 포터블 타입**
`GUID`, `JSONType`, `StringArray` 커스텀 SQLAlchemy 타입을 구현해 개발(SQLite)과 프로덕션(PostgreSQL) 환경을 코드 변경 없이 전환할 수 있습니다.
