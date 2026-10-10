---
name: run-harness
description: 체크라인 디자인 하네스를 실행·재개한다. "○○ 화면 하네스 돌려줘/시작해줘/만들어줘", "이어서 해줘", "하네스 상태 알려줘", "A/B/C로 할게", "승인했어", "반려야", "approval.md 썼어" 같은 요청에 쓴다.
---

# run-harness — 체크라인 하네스 오케스트레이션

당신(메인 세션)은 **오케스트레이터**입니다. 순서를 관리하고, 에이전트를 부르고, 반환 블록을 저장하고, judge에게 판정을 맡깁니다. **산출물 내용은 고치지 않습니다.** 판정 기준은 `harness/rules.yaml`에만 있습니다.

## 0. 사전 점검 (처음 한 번, 하나라도 실패하면 멈추고 보고)
1. Figma MCP `whoami` 성공
2. UIBowl MCP 검색 1회 성공
3. `harness/node_modules/yaml` 존재 (없으면 `cd harness && npm install`)
4. 원티드 DS 키트 접근: `harness/defaults.yaml`의 `figma.ds_file`로 `get_metadata` 성공. 비어 있으면 사용자에게 키트 Figma 링크를 묻습니다.
5. 작업 Figma 파일: 없으면 사용자에게 만들지 묻고 "체크라인 하네스" 파일을 만듭니다(원티드 DS 라이브러리 연결 필요).

## 1. 시작 / 재개
- 새 실행: `node harness/scripts/verify.mjs init <slug> --topic "<화면 주제>" --figma <작업 파일 URL>`
- 재개: `node harness/scripts/verify.mjs status <slug>` → "현재 게이트"부터 진행

## 2. 게이트 루프

| 현재 게이트 | 부를 에이전트 | 저장 폴더 | 판정 후 |
| --- | --- | --- | --- |
| g1 | researcher | `runs/<slug>/p1-diagnosis/` | 통과 시 요약 보고 → 사용자가 직접 `! node harness/scripts/verify.mjs proceed <slug>` |
| g2 | spec-writer | `runs/<slug>/p2-spec/` | 통과 시 요약 보고 → 사용자가 직접 `! node harness/scripts/verify.mjs proceed <slug>` |
| g3 | concept-designer | `runs/<slug>/p3-concept/` | 통과 시 시안 3개 스크린샷과 concepts.md 요약을 보여주고 approval.md 작성을 요청 |
| g3-approval | (없음) | — | judge 판정. 반려면 스크립트가 알려준 게이트로 |
| g4 | expander | `runs/<slug>/p4-expand/` | 통과 시 바로 g5 |
| g5 | (없음) | — | judge 판정 → qa-report.md 요약 보고 → 사용자 최종 확인 |

각 게이트에서:
1. 작업 에이전트를 부릅니다. 프롬프트에 slug, 현재 게이트, 읽을 파일 경로, (실패 재시도라면) judge가 보고한 위반 항목을 그대로 넣습니다. g3·g4 에서는 먼저 `node harness/scripts/verify.mjs figma-code <g3|g4> <slug> --mode export` 를 직접 실행해 출력된 export 코드를 프롬프트에 그대로 붙입니다 (작업 에이전트에게는 Bash 가 없습니다).
2. 반환된 `=== FILE: <이름> ===` 블록을 **Write 도구로** 현재 게이트 폴더에 그대로 저장합니다. 내용을 고치거나 요약하지 않습니다. Bash로 runs/에 쓰지 않습니다.
3. `judge`를 불러 판정합니다.
4. 종료 코드에 따라:
   - 0 통과 → 표의 "판정 후"
   - 1 실패 → 위반 항목을 담아 같은 에이전트를 다시 부름 (g5 실패는 expander)
   - 2 전제 오류 → 메시지대로 고치고(사용자 결정이 필요하면 묻기) 다시 판정
   - 3 차단 → 멈추고 사용자에게 보고. 사용자가 직접 `unblock` 실행 (에이전트는 실행 불가)

## 3. 사람 확인 지점
- **approval.md는 사람만 씁니다.** 사용자가 대화로 "B로 할게"라고 하면, `runs/<slug>/p3-concept/approval.md`를 직접 작성해 달라고 안내하고 템플릿(`harness/templates/approval.md`)을 보여줍니다. 대신 써 주지 않습니다 (hook이 막음). 사용자가 다 썼으면 **사용자가 직접** `! node harness/scripts/verify.mjs sign <slug>` 로 서명하게 안내합니다 — 서명이 없거나 서명 뒤 파일이 바뀌면 g3-approval 은 대기합니다.
- G1·G2 통과 후의 "진행해"는 승인이 아니라 확인입니다. 사용자가 수정을 원하면 사용자가 `! node harness/scripts/verify.mjs reopen <slug> --from <g1|g2|g3>`로 그 게이트를 다시 연 뒤, 수정 요청을 담아 해당 에이전트를 다시 부르고 재판정합니다. 승인(g3-approval) 이후에는 reopen이 안 되고 approval.md 반려 절차를 씁니다.

## 4. 보고
- 게이트마다 한두 줄로: 통과/실패, 위반 수, 다음 할 일.
- G3·G4는 Figma 스크린샷을 함께 보여줍니다.
- 끝나면 qa-report.md 경로와 6프레임 node id를 알려줍니다.
