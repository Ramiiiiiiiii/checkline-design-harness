# R8 — 검증과 리뷰

> 인터뷰 라운드 R8 확정본 (기본값 승인, 2026-10-10)

## 1. 판정 스크립트 테스트

- 위치: `tests/` — `node tests/run.mjs` 한 줄로 실행
- 정상 샘플은 통과, 아래 위반 샘플은 **모두 실패**해야 테스트 통과

| # | 위반 샘플 | 기대 결과 | 검사 게이트 |
| --- | --- | --- | --- |
| T1 | 정상 P1·P2 산출물 | 통과 | G1, G2 |
| T2 | ★1 가동 정지 행에 아이콘·텍스트 없음 | G2 실패 | G2 |
| T3 | ★2 기록 상세 액션에 "수정" | G2 실패 | G2 |
| T4 | "부품 재고" 추가, `[추가 제안]` 없음 | G2 실패 | G2 |
| T5 | Figma export에 미연결 색 1개 | G4 실패 | G3/G4 |
| T6 | Figma export에 Dark 프레임 누락 | G4 실패 | G4 |
| T7 | Figma export에 "가동 정지" 텍스트 옆 아이콘 없음 | G4 실패 | G3/G4 |
| T8 | 승인 후 screen-spec.md 변경 | P4 판정 거부 (승인 무효) | 잠금 |
| T9 | 모바일 프레임에 높이 40 버튼 | G4 실패 | G4 |

- 규칙(rules.yaml)이나 verify.mjs를 고칠 때마다 다시 돌린다.

## 2. 규칙 추적표

- `harness/traceability.md`: design.md 금지 ①~⑧ / story-service ★1·★2 → rules.yaml 키 → verify.mjs 검사 함수
- **문서에만 있고 검사가 없는 규칙 0개**

## 3. 완료 체크리스트 (GitHub 업로드 전)

- [x] defaults.yaml의 값마다 `source`가 붙어 있다
- [x] design.md의 색·타이포·간격·모서리 값이 rules.yaml에 그대로 있다 — 간격·모서리·글자 규격은 T37 이 자동 비교
- [ ] `source: 임의` 값을 사람이 검토했다 — **미완료**: frame_gap·label_offset·uibowl_queries·concept_axes·p4 기본값은 실행에서 사용자 지시로 덮어써졌고, 값 자체 검토 기록은 없음
- [x] traceability.md에 검사 없는 규칙이 없다 — 남은 빈틈(사람 검토 몫)은 문서 끝에 명시
- [x] `.claude/settings.json`과 `harness/scripts/guard-*.mjs`가 저장소에 포함됐다 (웹 업로드가 숨김 파일을 건너뛰어 따로 올림)
- [x] 폴더·단계 이름을 바꾼 뒤 옛 경로가 남은 문서가 없다 (2차 보강에서 r5 `qa` 명령·reopen 범위 정리)
- [x] `node tests/run.mjs`가 전부 통과한다 (41/41)
