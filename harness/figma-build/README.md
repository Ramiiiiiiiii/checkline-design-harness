# figma-build — Figma 제작 코드 (use_figma 로 실행)

| 파일 | 용도 |
| --- | --- |
| `p4-expand.figma.js` | 승인된 A안 → P4 확장 6프레임 (원티드 DS 복제 파일) |
| `checkline-menus.figma.js` | Checkline 파일: 태블릿 메뉴 레일·모바일 하단 탭 추가 (게이트 이후 작업) |
| `checkline-repair-assign.figma.js` | Checkline 파일: 수리 배정 서브페이지 6프레임 (게이트 밖, 검사만 적용) |

- 화면 검사 코드는 손으로 만들지 않는다. 모든 페이지 점검은 생성기로 만든다:
  `node harness/scripts/verify.mjs figma-code g4 <slug> --mode export --page all`
- 각 파일의 `SPEC`(글자 크기·행간)은 `rules.yaml figma.text_fallback.specs` 와 같아야 한다 — 테스트 T37 이 확인.
