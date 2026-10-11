# 수리 배정 서브페이지 — 검사 기록 (검사만 적용)

> 대시보드 실행(runs/admin-dashboard)의 진단·설계가 수리 흐름(D2·D5, PRD §6-5)을 이미 다뤄서,
> 이 서브페이지는 P1~P3 정식 실행 대신 HTML 구성안 확인 → Figma 제작 → rules.yaml 화면 규칙 검사만 적용했다.

| 항목 | 값 |
| --- | --- |
| Figma 파일 | Checkline (사용자 새 파일) · 페이지 "Page 1"(대시보드) + "수리 배정" |
| 구성안 | deliverables/repair-assign-plan.html |
| 검사 코드 | 생성기로 만든 코드: `verify.mjs figma-code g4 admin-dashboard --mode export --page all` (rules.yaml figma 섹션 + figma-check.lib.js, ★1·★2 원문 검사 포함) |
| 검사 프레임 | 12장 (대시보드 6 + 수리 배정 6, Web·Tablet·Mobile × Light·Dark) |
| 결과 | ✅ 위반 0건 — `figma-check.json` (지문 eebf8680-2650-e828e029, 2026-10-10 21:42 재검사) |
| 한계 | 게이트 밖 점검이라 judge 의 지문 재계산·사람 승인은 없음. 1차 점검(18:30)은 손으로 고친 코드였고, 2차 보강에서 생성 코드로 다시 돌림 |

## [추가 제안] (PRD에 없는 요소, 표시 유지)
- 목표 30분 대비 경과 막대 (PRD §9 지표를 화면에 노출)
- 담당자별 현재 작업량
- 이 설비 최근 이력

## DS 없음 표기
- 위험 등급 선택(세그먼트), 담당자 라디오, 메모 입력, 사진 자리, 태블릿 메뉴 레일, 모바일 하단 탭
  — 원티드 라이브러리가 아직 발행 전이라 키트 컴포넌트를 새로 가져올 수 없어 Theme 변수로 조합. 발행 후 교체 대상.
