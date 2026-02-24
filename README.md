# FMD — Find My Design

> AI 기반 디자인 검색 엔진. 텍스트 설명이나 스케치로 원하는 디자인을 묘사하면, AI가 분석해 여러 소스에서 매칭 상품을 찾아 랭킹 순으로 추천합니다.

---

## 프로젝트 개요

디자이너나 기획자가 "이런 느낌의 디자인 에셋이 필요한데"라고 생각할 때, 직접 키워드를 떠올리거나 여러 사이트를 돌아다닐 필요 없이 — 텍스트로 묘사하거나 간단한 스케치만 해도 AI가 의도를 분석해 관련 디자인 상품을 찾아주는 검색 엔진입니다.

사용자 입력 → DesignProfile 생성 → AI 레퍼런스 이미지 생성 → 멀티 프로바이더 검색 → TF-IDF 임베딩 기반 랭킹 → 결과 반환의 파이프라인으로 동작합니다.

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| **프론트엔드** | Next.js 16, TypeScript, Tailwind CSS v4, Lucide React |
| **백엔드** | FastAPI, SQLAlchemy async, Pydantic v2 |
| **데이터베이스** | SQLite (개발) / PostgreSQL (프로덕션) |
| **비동기 큐** | asyncio.Queue 인메모리 (개발) / Redis (프로덕션) |
| **AI 이미지 생성** | Stability AI (Stable Diffusion), HuggingFace, Openverse |
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
│  │100 상품 │  │Openverse  │  │  우선순위 체인│  │
│  │14카테고리│  │Unsplash   │  │  Stability AI│  │
│  │         │  │Pexels     │  │  HuggingFace │  │
│  └─────────┘  │Pixabay    │  │  Openverse   │  │
│               └───────────┘  └──────────────┘  │
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
- 텍스트 프롬프트 — 영어 및 한국어 입력 지원, 한국어 키워드 자동 번역
- 드로잉 캔버스 — 스케치를 그리면 dominant color를 픽셀 분석(Pillow)으로 추출
- 카테고리 선택 — UI / Logo / Icon / Illustration

### AI 분석 파이프라인
- 키워드 추출 — 불용어 제거, 한국어→영어 번역 매핑
- 색상 감지 — 텍스트에서 색상명 파싱 / 캔버스에서 RGB 픽셀 분석
- TF-IDF 임베딩 — 키워드 벡터를 JSON bytes로 직렬화해 DB 저장, 랭킹 시 코사인 유사도 계산 (Python stdlib만 사용, 외부 의존성 없음)

### AI 이미지 생성 (우선순위 체인)
API 키 없이도 동작하는 다단계 폴백 구조:
```
ComfyUI (로컬) → Stability AI → HuggingFace → Stable Horde
  → Openverse (CC 라이선스 무료) → 로컬 SVG
```
- 한국 환경에서는 Pollinations.ai가 차단되므로 Openverse를 기본 무료 소스로 사용
- Openverse는 Wikipedia, Flickr 등의 CC 라이선스 이미지를 키워드 기반으로 검색

### 검색 & 랭킹
- **Mock Provider** — 100개 샘플 상품 (14개 카테고리), Dribbble / Behance / Figma / Freepik 등 실제 마켓플레이스 링크 연결
- **API Provider** — Openverse 키워드 검색 (무료, API 키 불필요) + Unsplash / Pexels / Pixabay 공식 API (선택)
- **한국어 지원** — 100개 이상의 한국어→영어 번역 매핑 (`악기` → `instrument`, `고양이` → `cat` 등)
- **랭킹 공식** — `0.55×임베딩 + 0.20×색상 + 0.20×키워드 + 0.05×메타` (임베딩 있을 때) / 네거티브 키워드 페널티 / 중복 URL 페널티

### 비동기 잡 처리
- `POST /designs/{id}/process` → Job 생성 → `asyncio.create_task` 인라인 처리
- 프론트엔드가 `/jobs/{id}` 폴링으로 진행률 실시간 표시 (`0% → 40% → 70% → 100%`)

### 검색 히스토리
- `GET /sessions/{id}/history` — 세션 내 최근 20개 검색 반환
- 각 항목: AI 레퍼런스 이미지, 키워드 태그, dominant color, 상위 3개 결과 미리보기
- 프론트엔드 슬라이드오버 패널 (첫 검색 후 Header에 History 버튼 표시)

---

## Mock 샘플 데이터 (100개)

API 키 없이도 즉시 검색 결과를 확인할 수 있도록 14개 카테고리, 100개 샘플 상품이 내장되어 있습니다.

| 카테고리 | 샘플 수 | 검색 키워드 예시 |
|---|---|---|
| UI / 대시보드 | 6 | ui, dashboard, mobile, dark, landing |
| 로고 / 브랜드 | 5 | logo, brand, minimal, geometric, vintage |
| 아이콘 | 5 | icon, flat, 3d, line, emoji |
| 일러스트 | 6 | illustration, watercolor, abstract, character, botanical |
| 음악 / 악기 | 4 | music, instrument, guitar, piano, jazz |
| 음식 / 카페 | 4 | food, restaurant, cafe, coffee, delivery |
| 패션 / 의류 | 3 | fashion, clothing, style, elegant |
| 여행 | 4 | travel, airplane, map, tourism, adventure |
| 스포츠 / 피트니스 | 3 | sports, fitness, soccer, basketball, gym |
| 기술 / 스타트업 | 4 | tech, startup, saas, ai, robot |
| 자연 / 환경 | 3 | nature, eco, plant, leaf, green |
| 동물 / 반려동물 | 3 | animal, cat, dog, pet, cute |
| 의료 / 헬스 | 3 | medical, health, hospital, doctor |
| 교육 | 3 | education, school, book, elearning |
| 게임 / 엔터테인먼트 | 3 | game, rpg, esports, anime, character |
| 소셜미디어 / 마케팅 | 2 | social, instagram, banner, marketing |
| 부동산 / 건축 | 3 | realestate, house, building, interior |
| 금융 / 핀테크 | 3 | finance, banking, fintech, crypto |
| 자동차 | 2 | car, automotive, vehicle |
| 우주 / 과학 | 2 | space, astronomy, star, planet |
| 시즌 / 이벤트 | 5 | christmas, halloween, newyear, summer, winter |
| 사진 / 카메라 | 2 | photography, camera, photo |
| 팟캐스트 / 미디어 | 2 | podcast, media, broadcast |
| 크립토 / NFT | 2 | crypto, nft, blockchain, web3 |
| 3D / 글래스모피즘 | 3 | 3d, gradient, glass, neon |
| 애니 / 카와이 | 2 | anime, kawaii, chibi, manga |
| HR / 비즈니스 | 3 | corporate, presentation, infographic |
| 뷰티 / 화장품 | 2 | beauty, cosmetics, skincare, makeup |
| 타이포그래피 | 1 | typography, font, headline |
| 웨딩 / 이벤트 | 2 | wedding, party, birthday |

> **한국어 검색 지원**: 악기, 고양이, 음식, 여행, 우주 등 100개 이상의 한국어 단어를 영어로 자동 번역해 검색합니다.

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
# AI 이미지 생성 (우선순위 순 — 하나만 설정해도 됨)
HF_TOKEN=hf_...                # HuggingFace 무료 토큰 (추천, huggingface.co/settings/tokens)
STABILITY_API_KEY=sk-...       # Stability AI — Stable Diffusion 이미지 생성
COMFYUI_URL=http://...         # 로컬 ComfyUI 서버 주소

# 검색 결과 이미지 (선택 — 없어도 Openverse로 동작)
UNSPLASH_ACCESS_KEY=...        # Unsplash API (무료 50 req/hr)
PEXELS_API_KEY=...             # Pexels API (무료 200 req/hr)
PIXABAY_API_KEY=...            # Pixabay API (무료 100 req/hr)
```

> 모든 API 키는 선택 사항입니다. 키 없이도 **Openverse** (CC 라이선스 무료 이미지)와 100개 내장 샘플로 전체 기능이 동작합니다.

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

API 키 없이도 완전히 동작하는 구조
모든 외부 서비스에 다단계 폴백 체인을 적용해, 어떤 환경에서도 전체 기능이 동작합니다. Pollinations.ai → DiceBear → 로컬 SVG 생성까지 이어지는 이미지 생성 체인이 대표적인 예입니다.

외부 ML 라이브러리 없는 임베딩 구현
TF-IDF 기반 코사인 유사도를 Python 표준 라이브러리(`math`, `json`, `collections`)만으로 구현했습니다. numpy나 scikit-learn 없이도 의미 있는 시맨틱 유사도 점수를 랭킹에 반영합니다.

SQLite/PostgreSQL 공용 포터블 타입
`GUID`, `JSONType`, `StringArray` 커스텀 SQLAlchemy 타입을 구현해 개발(SQLite)과 프로덕션(PostgreSQL) 환경을 코드 변경 없이 전환할 수 있습니다.
