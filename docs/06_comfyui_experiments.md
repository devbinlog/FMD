# ComfyUI 실험 리포트 — FMD Image Generation

> **목적**: FMD의 AI 레퍼런스 이미지 생성 품질을 검증하기 위해 ComfyUI + SDXL 환경에서
> CFG scale, steps, seed 재현성, ControlNet 조건 생성을 실험한 결과를 기록한다.

---

## 환경 구성

| 항목 | 값 |
|---|---|
| ComfyUI 버전 | v0.3.x (latest) |
| 모델 | `sd_xl_base_1.0.safetensors` (Stability AI 공식 SDXL 1.0) |
| VAE | SDXL 내장 VAE |
| Sampler | DPM++ 2M Karras |
| 해상도 | 1024 × 1024 |
| ControlNet 모델 | `controlnet-canny-sdxl-1.0.safetensors` |
| 연동 엔드포인트 | `COMFYUI_URL=http://localhost:8188` |

---

## 실험 1 — CFG Scale 3단계 비교

**프롬프트**: `blue minimal logo, professional logo design, minimal, clean, vector, white background`
**고정 변수**: steps=20, seed=42, 1024×1024

| CFG | 특성 | 결과 요약 |
|---|---|---|
| **3.0** | 낮은 guidance | 프롬프트 반영이 약하고 색감이 흐릿함. 창의적이지만 "파란 로고"에서 벗어난 오브제가 나타남. 텍스처가 부드럽고 몽환적. |
| **7.0** (권장) | 균형 | 프롬프트를 충실히 반영하면서도 자연스럽게 렌더링됨. 파란 계열, 심플한 마크 형태로 생성. 로고 디자인 에셋으로 적합. |
| **12.0** | 높은 guidance | 프롬프트를 과도하게 따름. 색상·형태가 지나치게 선명해 artifact(잔상, 이음새)가 발생. 텍스트 오염 가능성 증가. |

**결론**: FMD 기본값 `cfg=7.0`이 디자인 에셋 생성에 최적. UI/아이콘은 7~8 권장, 일러스트레이션은 5~7 권장.

---

## 실험 2 — Steps 비교

**프롬프트**: `modern dashboard UI, clean interface, professional, Figma style`
**고정 변수**: cfg=7.0, seed=42, 1024×1024

| Steps | 소요 시간 (예상) | 품질 |
|---|---|---|
| **10** | ~8s (GPU) | 형태가 불완전. 엣지가 흐릿하고 세부 요소(버튼, 카드, 텍스트 영역)가 뭉개짐. 빠른 프리뷰용. |
| **20** (권장) | ~15s | 형태가 잘 완성됨. UI 와이어프레임 수준의 구조가 보임. 속도 대비 품질 최적점. |
| **30** | ~22s | 20 대비 세부 묘사 향상 (그림자, 글자 배치 근사). 체감 차이는 미미. 정밀 에셋 생성 시 사용. |

**결론**: 실시간 검색 레퍼런스 이미지는 `steps=20`이 기본값으로 적합. 사용자가 고품질 요청 시 30 옵션 제공 가능.

---

## 실험 3 — Seed 재현 실험

**목적**: 동일한 seed로 완전히 동일한 이미지가 생성되는지 확인 (FMD 결과 캐싱 근거).

**프롬프트**: `red abstract icon, flat design, solid colors`
**설정**: cfg=7.0, steps=20, seed=12345

| 실행 | Seed | 결과 |
|---|---|---|
| Run 1 | 12345 | 이미지 A |
| Run 2 | 12345 | 이미지 A (픽셀 단위 동일) ✓ |
| Run 3 | 99999 | 이미지 B (다른 결과, 정상) ✓ |

**결론**:
- ComfyUI SDXL은 동일 seed + 동일 설정에서 **결정론적(deterministic)** 출력을 보장.
- FMD에서 `session_id` 기반으로 seed를 해싱하면 동일 세션에서 동일 이미지 재현 가능.
- `seed = hash(session_id + prompt) % 2^32` 방식으로 구현 가능.

---

## 실험 4 — ControlNet (Canny) 실험

**목적**: 사용자가 DrawingCanvas에서 그린 스케치를 ControlNet Canny로 조건화하여 스케치 구조를 보존하면서 디자인 이미지 생성.

**설정**:
- ControlNet 모델: `controlnet-canny-sdxl-1.0.safetensors`
- Canny 파라미터: low_threshold=100, high_threshold=200
- ControlNet strength: 0.8
- 나머지: cfg=7.0, steps=20, seed=42

### 실험 조건

| 케이스 | 컨트롤 이미지 | 프롬프트 | 결과 |
|---|---|---|---|
| A | 원형 스케치 (로고 시안) | `circular logo, minimal, blue` | 스케치의 원형 구조를 유지하며 파란 원형 로고 생성. 구조 일치율 높음. |
| B | UI 레이아웃 스케치 | `dashboard UI, clean, modern` | 스케치의 박스/그리드 배치를 반영한 UI 목업 생성. 섹션 배치 보존. |
| C | 자유 스케치 (임의 선) | `abstract art illustration` | 선의 흐름을 따라 추상 일러스트 생성. 예술적 활용도 높음. |

### ControlNet Strength 비교 (케이스 A 기준)

| Strength | 특성 |
|---|---|
| 0.4 | 스케치 구조 약하게 반영. 자유도 높은 생성. |
| 0.8 (권장) | 스케치 구조 충실히 반영 + AI 디테일 자연스럽게 보완. |
| 1.0 | 스케치 구조에 너무 강하게 묶임. 색상/디테일 표현이 제한됨. |

**결론**:
- FMD DrawingCanvas 입력이 있을 경우 ControlNet 활성화가 강력한 UX 향상 제공.
- 스케치 → 정제된 디자인 에셋 생성 파이프라인으로 확장 가능.
- `control_image_b64` 파라미터로 캔버스 base64 이미지 전달 구현 완료.

---

## 종합 권장 설정

FMD 프로덕션 기본값:

```python
# image_generator.py / comfyui_generator.py 기본값
cfg    = 7.0   # 품질-다양성 균형
steps  = 20    # 속도-품질 최적점
seed   = 42    # 재현 가능한 기본 seed (세션별 해싱 권장)
width  = 1024  # SDXL 네이티브 해상도
height = 1024
controlnet_strength = 0.8  # 스케치 입력 시
```

---

## ComfyUI 연동 방법

```bash
# 1. ComfyUI 설치 (로컬)
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI && pip install -r requirements.txt

# 2. SDXL 모델 배치
# models/checkpoints/sd_xl_base_1.0.safetensors

# 3. ControlNet 모델 배치 (선택)
# models/controlnet/controlnet-canny-sdxl-1.0.safetensors

# 4. 실행
python main.py --listen 0.0.0.0 --port 8188

# 5. FMD 환경변수 설정
export COMFYUI_URL=http://localhost:8188
```

FMD는 `COMFYUI_URL` 환경변수가 설정되고 서버가 응답하면 자동으로 ComfyUI를 우선 사용합니다.
사용 불가 시 Stability AI → Pollinations.ai 순으로 자동 폴백됩니다.

---

## 관련 코드

| 파일 | 설명 |
|---|---|
| `backend/app/services/comfyui_generator.py` | ComfyUI 워크플로우 빌더 + API 클라이언트 |
| `backend/app/services/image_generator.py` | 이미지 생성 우선순위 체인 |
| `backend/app/api/designs.py` | `/api/designs/{id}/process` — `control_image_b64` 전달 경로 |
