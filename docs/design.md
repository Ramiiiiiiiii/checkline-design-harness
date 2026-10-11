# 체크라인 — design.md

> 기준 디자인 시스템: **원티드 디자인 시스템 (Wanted Design System, Community Figma 파일)**
> 값 출처: `Wanted_Design_System__Community_.fig`의 Figma Variables·Text Styles·Component Sets에서 직접 추출 (2026-10-10)
> 범위: **라이트 + 다크 모드 필수**. 모든 화면은 두 모드 쌍으로 만들고, 색은 반드시 변수로 바인딩해 모드 전환만으로 바뀌어야 합니다.
> 게이트 라운드(R5)에서 이 문서의 값은 `harness/rules.yaml`의 통과 조건으로 옮겨집니다. 이 문서의 수치를 바꾸면 rules.yaml도 함께 고칩니다.

---

## 1. Overview

- 체크라인은 소규모 공장의 **설비 점검 도구**입니다. 화려함보다 **상태가 한눈에 읽히는 것**이 우선입니다.
- 원티드 DS의 시맨틱 토큰을 그대로 쓰고, 새 색·새 컴포넌트를 만들지 않습니다.
- 사용 환경 두 가지를 모두 만족해야 합니다.
  - 현장(모바일 360×740 / 태블릿 1280×800): 장갑, 한 손, 소음·분진 → 큰 터치 영역, 큰 글자
  - 사무실(웹 1920): 여러 라인을 동시에 보는 표 중심 화면 → 밀도 있는 정보

---

## 2. Colors

원티드 DS `Theme` 컬렉션(Light / Dark 모드)의 값입니다. **이 표에 있는 변수만** 씁니다. HEX를 직접 칠하지 않고 변수로 바인딩합니다. 변수로 바인딩하지 않은 색이 하나라도 있으면 다크 모드에서 깨지므로 게이트에서 실패 처리합니다.

### 2-1. 기본

| 역할 | 변수 | Light | Dark |
| --- | --- | --- | --- |
| 브랜드·주요 액션 | `Primary/Normal` | #0066FF (Blue/50) | #3385FF (Blue/60) |
| 브랜드 눌림 | `Primary/Strong` | #005EEB (Blue/45) | #1A75FF (Blue/55) |
| 본문 텍스트 | `Label/Normal` | #171719 | #F7F7F8 |
| 강조 텍스트 | `Label/Strong` | #000000 | #FFFFFF |
| 보조 텍스트 | `Label/Neutral` | #2E2F33 · 88% | #C2C4C8 · 88% |
| 설명·메타 | `Label/Alternative` | #37383C · 61% | #AEB0B6 · 61% |
| 플레이스홀더 | `Label/Assistive` | #37383C · 28% | #AEB0B6 · 28% |
| 비활성 텍스트 | `Label/Disable` | #37383C · 16% | #989BA2 · 16% |
| 페이지 바닥 | `Background/Normal/Alternative` | #F7F7F8 | #0F0F10 |
| 카드·패널 | `Background/Normal/Normal` | #FFFFFF | #1B1C1E |
| 모달·시트 | `Background/Elevated/Normal` | #FFFFFF | #212225 |
| 구분선 | `Line/Normal/Normal` | #70737C · 22% | #70737C · 32% |
| 표 구분선(불투명) | `Line/Solid/Normal` | #E1E2E4 | #37383C |
| 채움(칩·입력) | `Fill/Normal` | #70737C · 8% | #70737C · 22% |
| 페이지 바탕 덧칠 (P3 3차 사용자 요청 "배경 살짝 어둡게") | `Fill/Alternative` (Background/Normal/Alternative 위에 한 겹) | #70737C · 5% | #70737C · 12% |
| 비활성 배경 | `Interaction/Disable` | #F4F4F5 | #2E2F33 |
| 딤 | `Material/Dimmer` | #171719 · 52% | #171719 · 74% |
| 고정 흰색 (Primary 버튼 위 글자 등, 모드와 무관) | `Static/White` | #FFFFFF | #FFFFFF |
| 고정 검은색 (모드와 무관) | `Static/Black` | #000000 | #000000 |

### 2-2. 설비 상태 매핑 (체크라인 전용 규칙)

| 설비 상태 | 변수 | Light | Dark | 함께 써야 하는 것 |
| --- | --- | --- | --- | --- |
| 정상 | `Status/Positive` | #00BF40 | #1ED45A | 텍스트 "정상" |
| 이상 | `Status/Cautionary` | #FF9200 | #FFA938 | 텍스트 "이상" |
| **가동 정지** | `Status/Negative` | #FF4242 | #FF6363 | **아이콘 + 텍스트 "가동 정지"** (5-2 금지 ①) |
| 미점검 | `Interaction/Inactive` | #989BA2 | #5A5C63 | 텍스트 "미점검" |
| 수리 중 | `Accent/Foreground/Violet` | #5B37ED | #9E86FC | 텍스트 "수리 중" |

- 상태 색은 위 5개 외에 추가하지 않습니다.
- `Accent/*` 색은 "수리 중" 외의 용도로 쓰지 않습니다.

---

## 3. Typography

- 서체: **Pretendard JP** (Regular 400 / Medium 500 / SemiBold 600 / Bold 700)
- 원티드 DS 텍스트 스타일만 씁니다. 크기를 임의로 바꾸지 않습니다.
- **예외 (2026-10-10, 사용자 결정)**: Claude가 Figma를 조작하는 서버 환경에 Pretendard JP가 없어 텍스트 스타일을 적용할 수 없습니다. 이때는 **Noto Sans KR**로 대체하고, 크기·행간·굵기를 아래 표의 값과 똑같이 맞추며, 텍스트 레이어 이름을 원래 스타일 이름(예: `Heading 2/Bold`)으로 둡니다. SemiBold(600)는 Bold로 대체합니다. 원티드 DS 인스턴스(버튼·칩·배지) 안의 라벨은 인스턴스 연결을 유지한 채 글꼴만 Noto Sans KR로 오버라이드합니다. Pretendard가 Figma 조직 글꼴로 올라오면 레이어 이름 기준으로 스타일을 다시 연결합니다. (rules.yaml `figma.text_fallback`)

| 스타일 | 크기 / 행간 | 체크라인 용도 |
| --- | --- | --- |
| Display 1 | 56 / 1.286 | 대시보드 [주목] 영역의 핵심 숫자 1곳만 (P3 3차 추가) |
| Title 3 | 24 / 1.334 | 모바일 화면 제목 |
| Heading 1 | 22 / 1.364 | 웹 페이지 제목 |
| Heading 2 | 20 / 1.4 | 카드·섹션 제목 |
| Headline 1 | 18 / 1.445 | 현장 점검 항목명 |
| Body 1 / Normal | 16 / 1.5 | 현장 본문, 입력값 |
| Body 2 / Normal | 15 / 1.467 | 웹 본문 |
| Label 1 / Normal | 14 / 1.429 | 웹 표 셀, 버튼 |
| Label 2 | 13 / 1.385 | 웹 표 헤더, 보조 정보 |
| Caption 1 | 12 / 1.334 | 타임스탬프, 입력자 |

- **현장 화면(모바일·태블릿)에서는 Body 1(16) 미만을 본문에 쓰지 않습니다.** Caption은 메타 정보에만 씁니다.
- 웹 표에서는 Label 1(14)이 최소 본문 크기입니다.

---

## 4. Layout · Shapes

### 4-1. 화면 크기

| 플랫폼 | 프레임 | 좌우 여백 |
| --- | --- | --- |
| 웹 (관리자) | 1920 × 1080 | 콘텐츠 최대폭 1440 (`Value/Width/Viewport/xl`) |
| 태블릿 (현장 공용) | 1280 × 800 | 24 |
| 모바일 (현장 개인) | 360 × 740 | 20 (`Value/Margin/Platform`) |

### 4-2. 간격

- 허용 값: **0 · 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 40 · 48 · 56 · 64 · 72 · 80**
- 기본 간격: 16 (`Value/Space/Gap/Normal`)

### 4-3. 모서리

- 허용 값: **0 · 4 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28 · 32 · full(9999)**
- 모달 12 (`Modal/Radius`), 카드·프레임 14 (`Frame/Radius`) 를 기본으로 씁니다.

### 4-4. 터치 영역 (현장 화면)

- 원티드 DS 버튼 최대 높이는 48(Large)입니다. 그래서 체크라인 현장 화면은 아래처럼 정합니다.
  - 주요 액션 버튼: **Button Size=Large (48)** 만 사용
  - 점검 항목 행: **List Cell Vertical Padding=Large (56)** 사용
  - 정상/이상/해당없음 선택: **Segmented Control Size=Large (48)** 사용
- 현장 화면에서 높이 48 미만의 누를 수 있는 요소는 쓰지 않습니다.

---

## 5. Components · Do's and Don'ts

### 5-1. 사용할 원티드 DS 컴포넌트

| 컴포넌트 | 체크라인 용도 |
| --- | --- |
| Button (Solid/Outlined · Primary/Assistive · L48/M40/S32) | 제출, 보고, 배정 |
| Button/Icon, Button/Text | 보조 액션 |
| Segmented Control (L48/M40/S32) | 정상 / 이상 / 해당없음 선택 |
| List Cell (Large 56 / Medium 48 / Small 40) | 점검 항목 행, 설비 목록 |
| Card, List Card | 설비 카드, 수리 건 카드 |
| Content Badge (Neutral/Accent · XS20/S24/M28) | 설비 상태 배지 |
| Chip | 라인·상태 필터 |
| Textinput (Textfield / Textarea) | 측정값, 메모 |
| Select | 수리 담당자 선택 |
| Tab | 웹 화면 상위 구분 |
| Alert, Snackbar, Toast | 확인, 전송 결과 |
| Menu, Tooltip, Divider, Skeleton, Avatar, Pagination | 일반 |

### 5-2. 금지 사항 (게이트가 검사)

| # | 금지 | 이유 | 연결 |
| --- | --- | --- | --- |
| ① | **가동 정지를 색만으로 표시하지 않는다.** `Status/Negative` + 아이콘 + 텍스트 "가동 정지"를 함께 쓴다 | 정지 설비를 모르고 돌리는 사고 방지 | story-service ★1 |
| ② | **제출된 점검 기록 화면에 "수정"·"삭제" 버튼을 두지 않는다.** "정정 기록 남기기"만 둔다 | 기록 보존 | story-service ★2 |
| ③ | 2장 표에 없는 색, 3장 표에 없는 텍스트 스타일을 쓰지 않는다 | DS 일관성 | — |
| ④ | 4-2·4-3 허용 값 밖의 간격·모서리를 쓰지 않는다 | DS 일관성 | — |
| ⑤ | 현장 화면에 높이 48 미만의 누를 수 있는 요소를 두지 않는다 | 장갑 조작 | 4-4 |
| ⑥ | 원티드 DS에 있는 컴포넌트를 새로 그리지 않는다 (인스턴스로 사용) | 핸드오프 | — |
| ⑦ | 모든 화면은 Light·Dark 쌍으로 만들고, 변수에 바인딩되지 않은 색(하드코딩 HEX)을 두지 않는다 | 다크 모드 필수 | 2장 |
| ⑧ | PRD·story에 없는 기능·요소를 추가하면 반드시 **[추가 제안]** 으로 표시하고 근거를 적는다. 표시 없는 추가는 실패 | 임의 기획 방지 | R2 |
| ⑨ | 글자·목록만으로 화면을 채우지 않는다. 프레임마다 시각화 요소(차트·진행 막대·히트맵 등)를 1개 이상 두고 레이어 이름에 `[시각화]`를 붙인다 | 시안 품질 하한 (P3 1차 반려 후 추가) | rules.yaml `figma.viz_tag` |
| ⑩ | 카드·영역에 상태 색(Status/*) 테두리를 쓰지 않는다. 강조는 크기·위치·글자 굵기로 | P3 2차 반려 후 추가 | rules.yaml `figma.no_status_stroke_prefix` |
| ⑪ | 아이콘·상태 라벨 뒤에 옅은 바탕(반투명 레이어)을 깔지 않는다. 상태는 아이콘·점 + 색 글자. 반투명은 `[시각화]` 안(정상 칸 등)에서만 | P3 2차 반려 후 추가 | rules.yaml `figma.no_translucent_outside_viz` |
| ⑫ | 프레임마다 시선이 갈 영역 `[주목]`은 정확히 1개. 큰 숫자·Primary Solid 버튼·상태 색 강조는 그 안에서만, 나머지는 회색 톤 | P3 2차 반려 후 추가 | rules.yaml `figma.focus_tag` |

### 5-3. 원티드 DS에 없는 것 (주의)

- **Table 컴포넌트가 Figma 파일에 없습니다.** (코드 라이브러리에는 있음) 관리자 웹의 설비 현황 표는 List Cell·Divider·Content Badge를 조합해 만들고, 새로 만든 표 구조는 산출물에 **[DS 없음 · 조합]** 으로 표시합니다.
- 설비 QR 스캔 화면용 카메라 뷰파인더 컴포넌트도 없습니다. 필요하면 **[DS 없음 · 임의]** 로 표시합니다.
