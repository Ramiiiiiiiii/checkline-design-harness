# P1 레퍼런스 — 관리자 설비 현황 대시보드

> 도구: UIBowl MCP (PC 플랫폼, 검색어: 대시보드 / 현황 / 테이블). 6개, 같은 앱은 2개까지.

## 레퍼런스

### R1. 사방넷 — 메인 대시보드
- 링크: https://uibowl.io/website/%EC%82%AC%EB%B0%A9%EB%84%B7?patterns=%EB%A9%94%EC%9D%B8&patternName=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C
- 볼 점: 업무 상태별 건수(주문·출고·CS 등)를 카드 묶음으로 나열하고, 각 숫자가 해당 목록으로 이어진다. B2B 운영 도구에서 "오늘 처리할 일"을 숫자로 먼저 보여주는 구조.

### R2. 당근 비즈니스 — 관리자 홈
- 링크: https://uibowl.io/website/%EB%8B%B9%EA%B7%BC%20%EB%B9%84%EC%A6%88%EB%8B%88%EC%8A%A4?patterns=%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C&patternName=%EA%B4%80%EB%A6%AC%EC%9E%90%20%ED%99%88
- 볼 점: 맨 위에 "확인이 필요한 일" 알림 카드와 바로가기 버튼을 두고, 그 아래 지표 카드 4개와 추이 차트를 둔다. 경고를 지표보다 먼저 배치한다.

### R3. 코빗 — 자산현황
- 링크: https://uibowl.io/website/%EC%BD%94%EB%B9%97?patterns=%EB%82%B4%EC%97%AD&patternName=%EC%9E%90%EC%82%B0%ED%98%84%ED%99%A9
- 볼 점: 상단 요약 카드(총계 + 구성비 도넛) → 아래 탭 + 상세 표의 2단 구조. 요약과 상세가 같은 화면에서 이어진다.

### R4. 사방넷 — 운송장 송신 현황
- 링크: https://uibowl.io/website/%EC%82%AC%EB%B0%A9%EB%84%B7?patterns=%EC%A1%B0%ED%9A%8C%ED%95%98%EA%B8%B0&patternName=%EC%9A%B4%EC%86%A1%EC%9E%A5%20%EC%86%A1%EC%8B%A0%20%ED%98%84%ED%99%A9
- 볼 점: 상태 태그가 붙은 처리 현황 표 + 페이지네이션 + 빈 화면 상태. 상태를 태그로 표시하는 고밀도 표.

### R5. 알파스퀘어 — 충전 현황
- 링크: https://uibowl.io/website/%EC%95%8C%ED%8C%8C%EC%8A%A4%ED%80%98%EC%96%B4?patterns=%ED%8F%AC%EC%9D%B8%ED%8A%B8&patternName=%EC%B6%A9%EC%A0%84%20%ED%98%84%ED%99%A9
- 볼 점: 탭으로 상태를 나누고 각 탭에 리스트와 빈 화면을 둔다. 필터 대신 탭으로 "지금 볼 것"을 좁힌다.

### R6. 리블 — 통계·리포트 지역 표
- 링크: https://uibowl.io/website/%EB%A6%AC%EB%B8%94?patterns=%ED%86%B5%EA%B3%84%C2%B7%EB%A6%AC%ED%8F%AC%ED%8A%B8&imgId=cmuc28b20000jl204mwrn3vkl
- 볼 점: 숫자 위주 표에서 열 정렬과 강조 색을 최소로 써서 많은 행을 읽기 쉽게 한다.

## 반영 포인트

### RP-1. 위험을 지표보다 먼저 보여준다
- 출처: R2
- 반영 방법: 대시보드 최상단에 "가동 정지·이상 보고" 알림 영역을 두고, 상태별 개수 요약은 그 아래에 둔다 (D2·D3).

### RP-2. 상태별 개수 카드가 해당 목록으로 이어진다
- 출처: R1
- 반영 방법: 정상·이상·가동 정지·미점검·수리 중 5개 개수 카드를 누르면 아래 설비 표가 그 상태로 걸러진다 (D1·D4).

### RP-3. 요약 → 상세를 한 화면 2단으로
- 출처: R3
- 반영 방법: 상단 요약 + 하단 설비 현황 표. 표는 상태 열을 맨 왼쪽에 두고 상태는 Content Badge로 표시한다 (D6).

### RP-4. 상태를 태그로 표시하는 고밀도 표
- 출처: R4
- 반영 방법: 원티드 DS에 Table이 없으므로 List Cell + Content Badge 조합 `[DS 없음 · 조합]`으로 행을 구성한다 (design.md 5-3).

### RP-5. 탭으로 "지금 볼 것" 좁히기
- 출처: R5
- 반영 방법: 설비 표 위에 라인별 Tab 또는 상태 Chip 필터를 둔다 (D6).
