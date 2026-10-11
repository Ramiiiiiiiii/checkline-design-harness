# R6 — 역할

> 인터뷰 라운드 R6 확정본 (기본값 승인, 2026-10-10)

## 에이전트

| 에이전트 | Phase | 편집 폴더 (오케스트레이터가 저장) | 도구 | 읽기 전용 |
| --- | --- | --- | --- | --- |
| `researcher` | P1 | `runs/<slug>/p1-diagnosis/` | Read·Grep·Glob + UIBowl MCP 4종 | docs/, harness/ |
| `spec-writer` | P2 | `runs/<slug>/p2-spec/` | Read·Grep·Glob | docs/, harness/, p1 |
| `concept-designer` | P3 | `runs/<slug>/p3-concept/` (approval.md 제외) + Figma `P3 시안` | Read·Grep·Glob + Figma MCP (Bash 없음 — export 코드는 오케스트레이터가 프롬프트로 넘김) | docs/, harness/, p1, p2 |
| `expander` | P4 | `runs/<slug>/p4-expand/` + Figma `P4 확장` | Read·Grep·Glob + Figma MCP (Bash 없음) | docs/, harness/, p1~p3 |
| `judge` | 모든 게이트 | **없음** | Read · Bash(`verify.mjs` 판정 명령만) · Figma digest 코드 (Grep·Glob 없음, figma-export.json 읽기 금지) | 전부 (export 제외) |

## 쓰기 규칙

- 작업 에이전트는 파일을 직접 쓰지 않는다. `=== FILE: <파일명> ===` 블록으로 반환하고, 오케스트레이터(메인 세션)가 **내용을 고치지 않고** 현재 게이트 폴더에만 저장한다.
- 에이전트는 자기 Figma 페이지 밖의 노드를 만들거나 지우지 않는다.

| 파일 | 쓰는 주체 |
| --- | --- |
| `docs/*`, `harness/rules.yaml`, `harness/defaults.yaml`, `harness/templates/*` | 사람만 (하네스 실행 중 수정 금지) |
| `runs/<slug>/p3-concept/approval.md` | 사람만 |
| `runs/<slug>/state.json`, `runs/<slug>/p5-qa/qa-report.md` | 스크립트만 |
| 그 외 `runs/<slug>/p*/` | 오케스트레이터 (현재 게이트 폴더만) |

## 강제 장치 (hook)

- `PreToolUse(Write|Edit|MultiEdit|NotebookEdit)` → `guard-write.mjs`: 위 표를 어기는 쓰기 차단, 현재 게이트가 아닌 runs 폴더 쓰기 차단
- `PreToolUse(Agent|Task)` → `guard-review.mjs`: 사람 확인 대기(`awaiting`) 중에는 작업 에이전트 호출 차단. 실행 중에는 하네스 에이전트(작업 4개 + judge)만 호출 가능 (4차)
- `.git`·`CLAUDE.md`·`.mcp.json`·`.claude`·`harness`·`docs`·`tests`·`evidence` 는 실행 여부와 무관하게 에이전트가 고치지 못함. 사람이 `HARNESS_DEV=1` 로 띄운 세션에서만 (실행 중이 아닐 때) 허용 (4차)
- `PreToolUse(Bash)` → `guard-bash.mjs`: **허용 목록** (3차 보강). 읽기 명령·`verify.mjs status` 는 누구나, 판정 명령(g1~g5)·지문 코드는 `agent_type=judge` 만, `init`·export 코드·테스트는 메인 세션만, `proceed·unblock·reopen` 은 아무도 (사람이 `!` 로). 셸 연결·치환·리다이렉션·따옴표·변수·글롭 문자 금지. 기준값은 `rules.yaml guard`
- judge 전용 `PreToolUse(Read|Grep|Glob)` → `guard-judge-read.mjs`: Grep·Glob 차단, Read 는 실제 경로 기준으로 figma-export.json 차단 (지문 베끼기 방지, 2·3차 보강)
- `PostToolUse(use_figma)` → `record-judge-digest.mjs`: judge 가 지문 코드를 Figma 에서 실행한 결과를 `runs/.judge-digests.json` 에 기록. verify.mjs 는 이 기록과 같은 지문만 받음 (3차 보강)
- 메인 세션은 실행 중 `use_figma` 를 쓰지 않는다 (guard-judge-bash, 디자인은 작업 에이전트 몫). approval.md 는 사람이 `sign` 해야 판정 (3차 보강)
- guard-write 는 실제 경로·대소문자 무시로 비교, 실행 중 저장소 밖 `.claude/` 쓰기 차단, `HARNESS_RUNS` 는 tests/.tmp 안일 때만 따름 (3차 보강)
- 모든 guard 는 입력·규칙·모듈을 못 읽으면 막는다 (fail-closed, 3차 보강에서 guard-review·guard-judge-bash 의 import 실패까지)
- `judge` 에이전트 → `guard-judge-bash.mjs`: `node harness/scripts/verify.mjs ...` 판정 명령만 허용

## 자연어 트리거 → `run-harness` 스킬

- "○○ 화면 하네스 돌려줘 / 시작해줘 / 만들어줘"
- "이어서 해줘", "하네스 상태 알려줘"
- "A/B/C로 할게", "승인했어", "반려야", "approval.md 썼어"
