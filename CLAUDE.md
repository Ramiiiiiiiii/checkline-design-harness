# 체크라인 디자인 하네스

체크라인(가상 서비스) 화면을 **P1 진단 → P2 설계 → P3 시안 3개·선택 → P4 웹·태블릿·모바일 × 라이트·다크 → P5 QA** 순서로 만드는 하네스입니다. 디자인 시스템은 원티드 DS입니다.

## 자연어 요청 라우팅 (필수)

아래 요청은 슬래시 명령이 없어도 `run-harness` 스킬을 불러와 그 절차대로 진행합니다.

- "○○ 화면 하네스 돌려줘 / 시작해줘 / 만들어줘"
- "이어서 해줘", "하네스 상태 알려줘"
- "A/B/C로 할게", "승인했어", "반려야", "approval.md 썼어"

## 파일 역할

| 파일 | 역할 | 수정 |
| --- | --- | --- |
| `docs/prd.md` | 서비스 기획 | 사람 |
| `docs/story-service.md` | 무엇을 위한 일인지 (유저스토리, ★ 어기면 안 되는 것) | 사람 |
| `docs/story-work.md` | 실제로 어떻게 하는지 (①~⑦ 작업 흐름) | 사람 |
| `docs/design.md` | 원티드 DS 기준 디자인 규칙 (사람이 읽는 설명) | 사람 |
| `harness/rules.yaml` | **규칙 SSOT** — 모든 게이트 판정 기준 | 사람 |
| `harness/defaults.yaml` | 정하지 않은 값의 기본값 (`source: 임의` = 확인 대상) | 사람 |
| `harness/templates/` | Phase 산출물 양식 | 사람 |
| `harness/r2~r8-*.md` | 하네스 설계 기록 (인터뷰 결과) | 사람 |
| `harness/traceability.md` | 규칙 → 검사 함수 추적표 | 사람 |
| `runs/<slug>/state.json` | 진행 상태 (재개 기준) | **스크립트만** |
| `runs/<slug>/p3-concept/approval.md` | 시안 선택·승인 | **사람만** |
| `runs/<slug>/p5-qa/qa-report.md` | 최종 QA 리포트 | **스크립트만** |

숫자 규칙(색·타이포·간격·모서리·개수)은 이 문서에 적지 않습니다. 항상 `harness/rules.yaml`을 봅니다.

## 에이전트와 편집 폴더

작업 에이전트는 파일을 직접 쓰지 않고 `=== FILE: <파일명> ===` 블록으로 반환합니다. 오케스트레이터(메인 세션)는 내용을 고치지 않고 Write 도구로 현재 게이트 폴더에만 저장합니다 (hook이 폴더를 검사).

| 에이전트 | Phase | 저장 위치 | 도구 |
| --- | --- | --- | --- |
| `researcher` | P1 | `runs/<slug>/p1-diagnosis/` | UIBowl MCP |
| `spec-writer` | P2 | `runs/<slug>/p2-spec/` | — |
| `concept-designer` | P3 | `runs/<slug>/p3-concept/` + Figma `P3 시안` | Figma MCP |
| `expander` | P4 | `runs/<slug>/p4-expand/` + Figma `P4 확장` | Figma MCP |
| `judge` | 모든 게이트 | 없음 (판정 명령만) | Read, verify.mjs 판정 명령, Figma 지문 코드 |

## 명령

```bash
# 메인 세션(오케스트레이터)
node harness/scripts/verify.mjs init <slug> --topic "<화면 주제>" --figma <Figma URL (? 뒤는 빼고)>
node harness/scripts/verify.mjs figma-code <g3|g4> <slug> --mode export   # 작업 에이전트에게 넘길 export 코드
node harness/scripts/verify.mjs status <slug>
# judge 만 (guard-bash 가 agent_type 으로 확인)
node harness/scripts/verify.mjs <g1|g2|g3-approval> <slug>
node harness/scripts/verify.mjs figma-code <g3|g4|g5> <slug>               # 지문 코드
node harness/scripts/verify.mjs <g3|g4|g5> <slug> --figma-digest <지문>
# ↓ 사람 전용 — 에이전트 Bash 는 guard-bash.mjs 가 막음. 사람이 터미널 또는 '! node …' 로 직접 실행
node harness/scripts/verify.mjs proceed <slug>   # G1·G2 통과 후 "진행해"
node harness/scripts/verify.mjs reopen <slug> --from <g1|g2|g3>   # 승인 전 수정 요청 → 재판정
node harness/scripts/verify.mjs unblock <slug>   # 연속 실패 차단 해제
node harness/scripts/verify.mjs sign <slug>      # approval.md 를 사람이 확인했다는 서명 (g3-approval 전 필수)
node tests/run.mjs                               # 판정 스크립트 테스트
```

처음 받은 환경에서는 `cd harness && npm install` 을 한 번 실행합니다.

규칙·hook·에이전트 정의(`harness/`·`docs/`·`.claude/`·`tests/`·`CLAUDE.md`)를 고칠 때는 사람이 `HARNESS_DEV=1 claude` 로 세션을 띄웁니다. 그 밖에는 hook 이 수정을 막습니다 (실행 중에는 HARNESS_DEV 여도 막음).

## 진행 규칙

1. 시작 전 사전 점검: Figma MCP, UIBowl MCP, npm install, 원티드 DS 키트 접근. 하나라도 실패하면 시작하지 않고 보고합니다.
2. 게이트를 통과하지 않으면 다음 Phase 에이전트를 부르지 않습니다.
3. G1·G2 통과 후에는 결과를 요약해 보여주고 사용자의 "진행해"를 기다립니다.
4. 같은 게이트 3회 연속 실패 시 멈추고 보고합니다.
5. P3 반려 사유가 "문제 정의"면 P2로, "방향"이면 P3로 돌아갑니다. P5 실패는 P4로 돌아갑니다.

## 금지

- PRD·story에 없는 기능·요소를 `[추가 제안]` 표시 없이 넣지 않습니다.
- 원티드 DS에 있는 컴포넌트를 새로 그리지 않습니다. DS에 없는 구조는 `[DS 없음 · 조합]`으로 표시합니다.
- 변수에 연결하지 않은 색을 쓰지 않습니다. 모든 화면은 Light·Dark 쌍입니다.
- 에이전트는 자기 Figma 페이지 밖의 노드를 만들거나 지우지 않습니다.
- Bash 는 허용 목록 명령만 씁니다 (읽기 명령, 위 verify.mjs 명령, 테스트). 셸 연결(`&&` `;` `|`)·리다이렉션·변수·따옴표는 guard-bash.mjs 가 막습니다. 파일 저장은 Write 도구로.

## 강제 장치

- `.claude/settings.json` hook: `guard-write.mjs`(Write·Edit·NotebookEdit 쓰기 권한), `guard-bash.mjs`(Bash 허용 목록·역할별 명령), `guard-review.mjs`(확인 대기 중 에이전트 호출 차단)
- `judge` frontmatter: `guard-judge-bash.mjs`(verify.mjs 판정 명령·지문 코드만), `guard-judge-read.mjs`(Read 만, export 금지)
- 승인 잠금: G3-선택 승인 시 설계·시안·approval 해시를 기록. 이후 바뀌면 승인 무효, P4·P5 판정 중지.
