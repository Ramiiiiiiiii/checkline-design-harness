# 체크라인 디자인 하네스 (Huddling Club 1차 실험 · 트랙 A)

가상 서비스 **체크라인(CheckLine)** — 소규모 공장 설비 점검 앱 — 의 관리자 대시보드를
AI 디자인 하네스로 진단 → 설계 → 시안 3안 → 선택 → 웹·태블릿·모바일(라이트·다크) 확장까지 실제로 돌린 기록입니다.
디자인 시스템은 원티드 디자인 시스템(Community Figma 키트)을 사용했습니다.

## 결과물
Figma: 사용자 파일 **Checkline** — "Page 1"(대시보드) · "수리 배정"(서브페이지). 웹 사이드 메뉴 · 태블릿 메뉴 레일 · 모바일 하단 탭 포함.

| 화면 | 대시보드 Light | 대시보드 Dark | 수리 배정 Light | 수리 배정 Dark |
| --- | --- | --- | --- | --- |
| Web 1920 | [보기](deliverables/dashboard/web-light.png) | [보기](deliverables/dashboard/web-dark.png) | [보기](deliverables/repair-assign/web-light.png) | [보기](deliverables/repair-assign/web-dark.png) |
| Tablet 1280 | [보기](deliverables/dashboard/tablet-light.png) | [보기](deliverables/dashboard/tablet-dark.png) | [보기](deliverables/repair-assign/tablet-light.png) | [보기](deliverables/repair-assign/tablet-dark.png) |
| Mobile 360 | [보기](deliverables/dashboard/mobile-light.png) | [보기](deliverables/dashboard/mobile-dark.png) | [보기](deliverables/repair-assign/mobile-light.png) | [보기](deliverables/repair-assign/mobile-dark.png) |

- 대시보드 3차 시안 비교(HTML): `deliverables/p3-concepts-compare.html`
- 수리 배정 구성안(HTML): `deliverables/repair-assign-plan.html`
- 실행 기록: `runs/admin-dashboard/`(진단 · 설계 · 시안 · 반려 2회 · 승인 · 확장 · QA), `runs/repair-assign/check.md`(서브페이지 검사)
- Figma 제작·검사 코드: `harness/figma-build/`

## 하네스 구조
| 층 | 파일 |
| --- | --- |
| 기준 문서 | `docs/prd.md`, `docs/story-service.md`, `docs/story-work.md`, `docs/design.md` |
| 규칙 (SSOT) | `harness/rules.yaml`, `harness/defaults.yaml`, `harness/traceability.md` |
| 실행 | `CLAUDE.md`(오케스트레이터), `.claude/agents/*`(researcher · spec-writer · concept-designer · expander · judge), `.claude/skills/run-harness` |
| 강제 | `.claude/settings.json` hooks + `harness/scripts/guard-*.mjs`, 판정 `harness/scripts/verify.mjs` |
| 인터뷰 기록 | `harness/r2-purpose.md` ~ `harness/r8-verify.md` (r7에 실행 중 보완 기록) |

게이트: G1 진단 → G2 설계 → G3 시안 3안 → **G3 사람 선택(approval.md, 사람만 작성)** → G4 확장 6장 → G5 QA.
Figma 검사는 `rules.yaml`에서 생성한 코드를 Figma 안에서 실행하고, judge가 같은 코드로 지문(digest)을 다시 떠서 비교합니다.

## 실행 중에 생긴 규칙 (반려에서 배운 것)
- ⑨ 프레임마다 `[시각화]` 요소 1개 이상 — 1차 반려 "텍스트만 잔뜩"
- ⑩ 카드에 상태 색 테두리 금지 · ⑪ 아이콘·배지 뒤 옅은 바탕 금지 · ⑫ 화면당 `[주목]` 영역 1개 — 2차 반려 "어디에 집중해야 할지 모르겠어"
- G3 통과 후 승인 전 수정은 `reopen --from g3`로 재판정

## 테스트
```
cd harness && npm install && cd ..
node tests/run.mjs   # 28/28
```
