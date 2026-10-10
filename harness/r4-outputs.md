# R4 — 산출물

> 인터뷰 라운드 R4 확정본 (기본값 승인, 2026-10-10). 근거: `r3-flow.md`

## 실행 폴더

- 실행 1회 = `runs/<slug>/` 폴더 1개. 이번 실행 slug: **`admin-dashboard`**
- slug 규칙: 영문 소문자·숫자·하이픈만 (`^[a-z0-9-]+$`)

## 단계별 파일

| Phase | 폴더 | 파일 | 누가 쓰나 |
| --- | --- | --- | --- |
| P1 | `runs/<slug>/p1-diagnosis/` | `diagnosis.md`, `references.md` | researcher 에이전트 → 오케스트레이터 저장 |
| P2 | `runs/<slug>/p2-spec/` | `screen-spec.md` | spec-writer 에이전트 → 오케스트레이터 저장 |
| P3 | `runs/<slug>/p3-concept/` | `concepts.md`, `figma-export.json` | concept-designer 에이전트 → 오케스트레이터 저장 |
| P3-선택 | `runs/<slug>/p3-concept/` | `approval.md` | **사람만** |
| P4 | `runs/<slug>/p4-expand/` | `screens.md`, `figma-export.json` | expander 에이전트 → 오케스트레이터 저장 |
| P5 | `runs/<slug>/p5-qa/` | `qa-report.md` | **스크립트만** (`verify.mjs`) |
| 공통 | `runs/<slug>/` | `state.json` | **스크립트만** |

- `figma-export.json`: Figma에서 뽑은 프레임 목록·색 바인딩·텍스트 스타일·컴포넌트 인스턴스 요약. 게이트는 이 파일과 Figma 실물을 대조한다.

## 규칙 파일 (SSOT)

| 파일 | 역할 | 수정 |
| --- | --- | --- |
| `harness/rules.yaml` | **규칙 SSOT** — 게이트 판정 기준 전부 (허용 변수·텍스트 스타일·간격·모서리·컴포넌트, 금지 ①~⑧, 필수 섹션, 개수) | 사람 |
| `harness/defaults.yaml` | 정하지 않은 값의 기본값. 값마다 `source: design.md / 템플릿 / 임의` | 사람 |
| `harness/templates/*.md` | Phase 산출물 양식 | 사람 |

- design.md의 수치를 바꾸면 rules.yaml도 함께 고친다. 판정은 rules.yaml만 본다.

## 재개

- `runs/<slug>/state.json`에 `phase`, `passed`(통과 게이트 목록), `attempts`(게이트별 실패 횟수), `awaiting`(사람 확인 대기), `approvalHash`를 기록한다.
- 중단 후 "이어서 해줘"라고 하면 state.json의 phase부터 다시 시작한다.

## Figma

- 새 Figma 파일 **"체크라인 하네스"** 에 페이지 `P3 시안`, `P4 확장`을 만든다.
- 원티드 DS 키트를 라이브러리로 연결한다. 연결이 안 되면 키트 복제본 안에 페이지를 추가한다.
- ⚠️ 확인 필요: 원티드 DS 키트가 사용자 Figma 계정에 있는지 → P3 시작 전에 확인
