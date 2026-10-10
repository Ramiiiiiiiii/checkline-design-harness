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
| design 5-2 ⑦ | 변수 미연결 색 금지 (다크 모드) | `figma.allowed_color_variables` | `checkFramesCore` 미연결 색 | T5 |
| design 5-2 ⑦ | Light·Dark 6프레임 | `g4.frames.required` | `checkG4` | T6 |
| design 5-2 ⑧ / r2 | 표기 없는 기획 추가 금지 | `g2.excluded_keywords`, `proposal_tag` | `checkG2` 임의 기획 | T4, T4b |
| r5 G1 | 진단 5개·관점·근거·영향 | `g1.diagnosis` | `checkG1` | (T1 정상) |
| r5 G1 | 레퍼런스 6개·같은 앱 2개·반영 포인트 3개 | `g1.references`, `g1.points` | `checkG1` | (T1 정상) |
| r5 G3 | 시안 3개 1920·Light, 해결한 문제 2개 | `g3` | `checkG3` | (T1 정상) |
| r5 G3-선택 | 승인 잠금 | `g3_approval.lock_files` | `checkApproval`, `lockCheck` | T8 |
| r3 | 반려 사유별 복귀 | `g3_approval.return_to` | `checkApproval` | T9d |
| r5 | 3회 연속 실패 차단 | `run.max_attempts` | `finish` | T9c |
| r5 | Figma 실물 대조 (요약 해시 포함) | `figma.require_digest` | `loadExport` 지문, `figma-check.lib.js` | T9b |
| r5 (실행 중 보완) | DS 인스턴스 자체 값·설명 문장은 검사 제외 | `figma.stop_label_max_len` | `checkFramesCore` | T19 |
| r5 (사용자 추가) | 프레임마다 시각화 요소 1개 이상 | `figma.viz_tag`, `min_viz_per_frame` | `checkFramesCore` 시각화 부족 | T20 |
| r6 (실행 중 추가) | judge 는 생성된 digest 코드 그대로만 실행 | — | `guard-judge-bash.mjs` + `figma-code.mjs` | T18 |
| r6 | 서브에이전트 runs/ 쓰기 금지, approval.md 사람만, 현재 게이트 폴더만 | `gates.dirs` | `guard-write.mjs` | T10, T11 |
| r6 | judge 는 판정 명령만 | — | `guard-judge-bash.mjs` | T12 |
| r7 | G1·G2 후 사용자 확인 | `gates.review_after` | `finish`, `guard-review.mjs` | (T1 흐름) |
| r7 (실행 중 추가) | 확인 중 수정 요청 시 reopen, 승인 이후 금지 | `gates.review_after` | `reopen` | T16 |

## 남은 빈틈

- "원티드 DS 컴포넌트를 인스턴스로 쓰기"는 로컬 컴포넌트 생성만 잡습니다. 사각형·텍스트로 버튼 모양을 직접 그린 경우는 스크립트로 셀 수 없어 judge의 "참고 의견"과 사람 검토에 맡깁니다.
| design.md ⑩ 상태 색 테두리 금지 | figma-check.lib.js `no_status_stroke_prefix` | T21 |
| design.md ⑪ 시각화 밖 반투명 금지 | figma-check.lib.js `no_translucent_outside_viz` (export가 opacity·inViz 수집) | T22 |
| design.md ⑫ [주목] 영역 1개 | figma-check.lib.js `focus_tag` | T23 |
