# 규칙 추적표

> 문서에 적힌 규칙이 실제로 검사되는지 한 줄씩 연결합니다. **검사 없는 규칙 0개**가 목표입니다.
> 규칙을 추가·수정하면 이 표와 `tests/run.mjs`를 함께 고칩니다.

| 출처 | 규칙 | rules.yaml | verify.mjs 검사 | 테스트 |
| --- | --- | --- | --- | --- |
| story-service ★1 / design 5-2 ① | 가동 정지는 색+아이콘+텍스트 (설계) | `g2.stop_status` | `checkG2` ★1 | T2 |
| story-service ★1 / design 5-2 ① | 가동 정지는 색+아이콘+텍스트 (Figma) | `figma.stop_text`, `icon_component_prefix` | `checkFramesCore` ★1 | T7 |
| story-service ★2 / design 5-2 ② | 제출 기록 수정·삭제 금지 | `g2.record_immutable` | `checkG2` ★2 | T3 |
| design 5-2 ③ | 허용 색 변수만 | `figma.allowed_color_variables` | `checkFramesCore` 허용 외 색 변수 | (T1 정상) |
| design 5-2 ③ | 허용 텍스트 스타일만 | `figma.allowed_text_styles` | `checkFramesCore` 허용 외 텍스트 스타일 | (T1 정상) |
| design 3장 (예외) | 글꼴 없을 때 대체 글꼴 값 일치 | `figma.text_fallback` | `checkFramesCore` 대체 글꼴 값 불일치 | T17 |
| design 3장 | 현장 화면 글자 크기 | `figma.field_min_font_size` | `checkFramesCore` 현장 화면 글자 크기 | T13 |
| design 5-2 ④ | 허용 간격·모서리만 | `figma.allowed_spacing`, `allowed_radius` | `checkFramesCore` 허용 외 간격·모서리 | T14 |
| design 5-2 ⑤ / 4-4 | 현장 터치 영역 48 이상 | `figma.min_touch_height`, `interactive_components` | `checkFramesCore` 터치 영역 | T9 |
| design 5-2 ⑥ | DS 컴포넌트 다시 그리기 금지, DS 없음 표기 | `figma.local_component_tag` | `checkFramesCore` DS 없음 미표기 | T15 |
| design 5-2 ⑦ | 변수 미연결 색·허용 외 변수 금지 (다크 모드) | `figma.allowed_color_variables` | `checkFramesCore` 미연결 색·허용 외 색 변수 | T5, T27 |
| design 5-2 ⑦ | Light·Dark 6프레임 | `g4.frames.required` | `checkG4` | T6 |
| design 5-2 ⑧ / r2 | 표기 없는 기획 추가 금지 | `g2.excluded_keywords`, `proposal_tag` | `checkG2` 임의 기획 | T4, T4b |
| r5 G1 | 진단 5개·관점·근거·영향 | `g1.diagnosis` | `checkG1` | T1, T34 |
| r5 G1 | 레퍼런스 6개·같은 앱 2개·반영 포인트 3개 | `g1.references`, `g1.points` | `checkG1` | (T1 정상) |
| r5 G3 | 시안 3개 1920·Light, 해결한 문제 2개 | `g3` | `checkG3` | T1, T35 |
| r5 G3-선택 | 승인 잠금 (설계·시안·승인·P3 검사 결과) | `g3_approval.lock_files` | `checkApproval`, `lockCheck` | T8, T33 |
| r3 | 반려 사유별 복귀 | `g3_approval.return_to` | `checkApproval` | T9d |
| r5 | 3회 연속 실패 차단 | `run.max_attempts` | `finish` | T9c |
| r5 | Figma 실물 대조 (요약 해시 포함) | `figma.require_digest` | `loadExport` 지문, `figma-check.lib.js` | T9b |
| r5 (실행 중 보완) | DS 인스턴스 자체 값·설명 문장은 검사 제외 | `figma.stop_label_max_len` | `checkFramesCore` | T19 |
| r5 (사용자 추가) | 프레임마다 시각화 요소 1개 이상 | `figma.viz_tag`, `min_viz_per_frame` | `checkFramesCore` 시각화 부족 | T20 |
| r6 (실행 중 추가) | judge 는 생성된 digest 코드 그대로만 실행 | — | `guard-judge-bash.mjs` + `figma-code.mjs` | T18 |
| r6 | 서브에이전트 runs/ 쓰기 금지, approval.md 사람만, 현재 게이트 폴더만 | `gates.dirs` | `guard-write.mjs` | T10, T11 |
| r6 | judge 는 판정 명령만 | — | `guard-judge-bash.mjs` | T12 |
| r7 | G1·G2 후 사용자 확인 | `gates.review_after` | `finish`, `guard-review.mjs` | (T1 흐름) |
| r7 (실행 중 추가) | 확인 중 수정 요청 시 reopen, 승인 이후 금지 | `gates.reopenable` | `reopen` | T16, T24 |
| design.md ⑨ | 프레임마다 [시각화] 요소 | `figma.viz_tag` | `checkFramesCore` | T20 |
| design.md ⑩ | 카드·영역 상태 색 테두리 금지 | `figma.no_status_stroke_prefix` | `checkFramesCore` | T21 |
| design.md ⑪ | [시각화] 밖 반투명(옅은 바탕) 금지 | `figma.no_translucent_outside_viz` | `checkFramesCore` (export 가 opacity·inViz 수집) | T22 |
| design.md ⑫ | 화면당 [주목] 영역 1개 | `figma.focus_tag` | `checkFramesCore` | T23 |
| story ★1 원문 (Figma) | 정지 라벨 옆에 '정상'·'가동 중' 금지 | `figma.stop_conflict_texts` | `checkFramesCore` | T25 |
| story ★2 원문 (Figma) | 기록 수정·삭제 버튼 금지 | `figma.record_edit_labels` | `checkFramesCore` | T26 |
| design 3장 | 허용 외 텍스트 스타일 금지 | `figma.allowed_text_styles` | `checkFramesCore` | T17, T28 |
| r5 G5 (2차 보강) | 확장 결과의 선택안 = 승인 시안, 화면 목록 = Figma 실물 | `g4.screens_file` | `checkG5Extra` | T36 |
| r6 (2차 보강) | 확인 대기 중 작업 에이전트 호출 금지 | `gates.work_agents` | `guard-review.mjs` | T29 |
| r6 (2차 보강) | Bash 로 보호 폴더 쓰기·사람 전용 명령 금지 | — | `guard-bash.mjs` | T30 |
| r6 (2차 보강) | judge 명령 끼워넣기 금지 | — | `guard-judge-bash.mjs` | T31 |
| r6 (2차 보강) | judge 는 export 를 읽지 않음 (지문 직접 계산) | — | `guard-judge-read.mjs` | T32 |
| SSOT (2·3차 보강) | design.md 간격·모서리·색 변수·텍스트 스타일·터치 높이, figma-build 글자 규격 = rules.yaml | 전체 | 테스트가 직접 비교 | T37 |
| r6 (3차 보강) | Bash 는 허용 목록만 — 우회 12종 차단 | `guard.*` | `guard-bash.mjs` | T30, T42 |
| r6 (3차 보강) | 판정 명령·지문 코드는 judge 만, export 코드·init·테스트는 메인만 | `guard.judge_only`, `guard.main_only` | `guard-bash.mjs` (`agent_type`) | T41 |
| r6 (3차 보강) | 작업 에이전트 Bash 없음, judge 는 Read·Bash·use_figma 만 | `gates.work_agents` | `.claude/agents/*` tools | T44 |
| r6 (3차 보강) | judge 는 Grep·Glob 없이 Read 만 (폴더 검색으로 export 우회 차단) | `figma.export_file` | `guard-judge-read.mjs` | T32 |
| r6 (3차 보강) | NotebookEdit 도 저장 권한 검사 | — | settings matcher + `guard-write.mjs` | T43 |
| r5 (3차 보강) | 지문 불일치 메시지에 정답 지문 비노출 | `figma.require_digest` | `loadExport` | T39 |
| r5 (3차 보강) | 승인 기록에 잠금 대상이 없으면 실패 (재승인) | `g3_approval.lock_files` | `lockCheck` | T40 |
| r5 (3차 보강) | 지문은 judge 의 use_figma 실행 기록과 같아야 함 (export 저장 뒤 계산) | `figma.require_judge_record` | `record-judge-digest.mjs` + `loadExport` | T46 |
| r5 (3차 보강) | approval.md 는 사람 서명(sign) 뒤에만 판정, 서명 뒤 변경 시 재서명 | `guard.human_only` | `sign`, `checkApproval` | T47 |
| r6 (3차 보강) | 대소문자·링크 경로 변형, 기록 파일 직접 쓰기 차단 | `figma.judge_record_file` | `guard-write.mjs` | T48 |
| r6 (3차 보강) | 실행 중 ~/.claude 쓰기 차단, HARNESS_RUNS 는 테스트 폴더만 | — | `guard-write.mjs`, 각 스크립트 | T49 |
| r6 (3차 보강) | 실행 중 메인 세션 use_figma 금지 | — | `guard-judge-bash.mjs` | T50 |
| r6 (4차) | .git·CLAUDE.md·.mcp.json·규칙 폴더 상시 보호 (HARNESS_DEV=1 만 예외), git 명령 제외 | `guard.always_protected`, `guard.dev_env` | `guard-write.mjs`, `guard-bash.mjs` | T51 |
| r6 (4차) | 실행 중 하네스 밖 에이전트 호출 금지, use_figma 는 figma_agents 만 | `gates.figma_agents` | `guard-review.mjs`, `guard-judge-bash.mjs` | T52, T50 |
| r5 (4차) | export·지문은 이 실행의 Figma 파일에서 (fileKey 대조, 기록 키 fileKey::page, 응답 JSON 파싱) | `figma.digest_pattern` | `loadExport`, `record-judge-digest.mjs` | T53 |
| r6·r5 (5차) | ~/.claude 설정 상시 차단, 확인 대기 중 산출물 쓰기 차단, init --figma 필수, Figma 쓰기 도구 전체에 같은 규칙 | `figma.require_judge_record` | `guard-write.mjs`, `verify.mjs init`, `guard-judge-bash.mjs` | T54 |
| r6 (3차 보강, 실측) | judge 제한을 settings 에도 적용 (frontmatter hook 미발동 대비) | `guard.judge_agent` | settings + `guard-judge-read`·`guard-judge-bash`·`guard-bash` | T45, `evidence/hook-live/` |

## 남은 빈틈

- "원티드 DS 컴포넌트를 인스턴스로 쓰기"는 로컬 컴포넌트 생성만 잡습니다. 사각형·텍스트로 버튼 모양을 직접 그린 경우는 스크립트로 셀 수 없어 judge의 "참고 의견"과 사람 검토에 맡깁니다.
- ★1·★2 의 Figma 검사는 글자 기준이다. 아이콘 모양만으로 정상처럼 보이게 만든 경우 등은 사람 검토로 본다.
- ⑨ [시각화]·⑫ [주목] 은 레이어 이름표를 센다. 이름만 붙이고 내용이 없는 경우는 사람 검토(G3 승인)가 거른다.
- hook 스크립트 자체가 문법 오류 등으로 실행되지 못하면 Claude Code 는 exit 1 을 "막지 않음"으로 본다. 스크립트 안의 실패는 모두 exit 2 로 막지만, node 가 아예 뜨지 못하는 경우는 테스트(`node tests/run.mjs`)로만 지킨다.
- `sign` 은 "사람이 실행했다"를 hook(에이전트 Bash 차단)으로만 보장한다. 사람이 에이전트 대신 아무 확인 없이 sign 을 치는 것까지는 막을 수 없다.
- 지문 기록은 페이지 단위다. 같은 페이지를 쓰는 실행을 동시에 두 개 돌리면 마지막 기록만 남는다.
- 메인 세션(오케스트레이터)은 현재 게이트 폴더에 Write 할 수 있으므로 export 를 손으로 고칠 수는 있다. 그 경우 judge 가 Figma 에서 직접 계산한 지문과 달라져 실패한다(T9b).
