#!/usr/bin/env node
// 체크라인 하네스 — 판정 스크립트·hook 테스트 (r8-verify.md T1~T9 + 추가 T10~T15)
// 실행: node tests/run.mjs   (harness/node_modules 필요: cd harness && npm install)
// 정상 샘플은 통과하고, 위반 샘플은 모두 실패해야 테스트 통과.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = path.join(ROOT, "tests", ".tmp");
const VERIFY = path.join(ROOT, "harness", "scripts", "verify.mjs");
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const env = { ...process.env, HARNESS_RUNS: TMP };

const run = (...args) => spawnSync("node", [VERIFY, ...args], { env, encoding: "utf8" });
const hook = (name, payload) => spawnSync("node", [path.join(ROOT, "harness", "scripts", name)], { env, input: JSON.stringify(payload), encoding: "utf8" });
const put = (slug, rel, s) => { const p = path.join(TMP, slug, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const state = (slug) => JSON.parse(fs.readFileSync(path.join(TMP, slug, "state.json"), "utf8"));
const setState = (slug, fn) => { const s = state(slug); fn(s); fs.writeFileSync(path.join(TMP, slug, "state.json"), JSON.stringify(s)); };

const { fnv, loadCheckFn, loadRules, buildFigmaCode } = await import(path.join(ROOT, "harness", "scripts", "figma-code.mjs"));
const checkFramesCore = loadCheckFn();
const RULES = loadRules();

// ───────── 정상 샘플
const DIAG = `# P1 진단\n\n## AS-IS 문제점\n` + [
  ["정보 구조", "점검 결과가 종이에 흩어져 라인 전체 현황을 볼 수 없음"],
  ["작업 흐름", "엑셀 취합이 하루 끝에 몰려 이상 보고가 늦음"],
  ["사용 환경", "현장은 장갑 착용, 종이 칸이 작음"],
  ["시각 위계", "정지 설비와 정상 설비가 같은 모양으로 기록됨"],
  ["작업 흐름", "수리 요청이 메신저에 묻혀 추적 불가"],
].map(([p, t], i) => `### D${i + 1}. ${t}\n- 관점: ${p}\n- 근거: PRD §1\n- 영향: 관리자\n`).join("\n");
const REFS = `# P1 레퍼런스\n\n## 레퍼런스\n` + ["토스", "배민", "당근", "토스", "카카오", "네이버"].map((a, i) =>
  `### R${i + 1}. ${a} — 현황 화면\n- 링크: https://uibowl.io/screen/${i + 1}\n- 볼 점: 요약 카드\n`).join("\n") +
  `\n## 반영 포인트\n` + [1, 2, 3].map((n) => `### RP-${n}. 위험 먼저 보이기\n- 출처: R${n}\n- 반영 방법: 상단 요약\n`).join("\n");
const SPEC = (o = {}) => `# P2 설계

## 목적
D1·D4 해결

## 연결 유저스토리
- US-3: 관리자 현황 확인

## 화면 구성
| 영역 | 구성 요소 | 원티드 DS 컴포넌트 | 액션 | 근거 |
| --- | --- | --- | --- | --- |
| 요약 | 상태별 개수 | Card | 필터 | §6-4 |
| 점검 기록 상세 | 제출 기록 | List Cell | ${o.recordAction ?? "정정 기록 남기기"} | §7-1 |
${o.extraRow ?? ""}

## 상태
| 상태 | 표현 | 변수 |
| --- | --- | --- |
| 정상 | 텍스트 "정상" | Status/Positive |
${o.stopRow ?? "| 가동 정지 | 아이콘 + 텍스트 \"가동 정지\" | Status/Negative |"}

## 데이터 필드
| 필드 | 표시 이름 | 예시 | 출처 |
| --- | --- | --- | --- |
| status | 상태 | 정상 | §6-4 |

## 추가 제안
- 없음
`;
const CONCEPTS = `# P3 시안\n` + ["A", "B", "C"].map((k) => `\n## 시안 ${k} — 방향\n- 방향: x\n- 해결한 문제: D1 위험 먼저\n- 해결한 문제: D4 정지 구분\n- 프레임: 1:1\n`).join("") + `\n## 추가 제안\n- 없음\n\n## DS 없음 표기\n- 없음\n`;
const SCREENS = `# P4 확장\n\n| 프레임 | 크기 |\n| --- | --- |\n| Web/Light | 1920×1080 |\n`;

function frame(name, w, h, mode, o = {}) {
  const id = `${name}`;
  const nodes = [
    { id: `${id}-c`, parent: id, type: "FRAME", name: "Content", w, h: 400, fills: [{ type: "SOLID", hex: "#FFFFFF", var: o.unbound ? null : "Background/Normal/Normal" }], radius: 14, gap: 16, padding: [24, 24, 24, 24] },
    { id: `${id}-t`, parent: `${id}-c`, type: "TEXT", name: "Title", w: 200, h: 30, fills: [{ type: "SOLID", hex: "#171719", var: "Label/Normal" }], text: "설비 현황", fontSize: 22, textStyle: "Heading 1/Bold" },
    { id: `${id}-row`, parent: `${id}-c`, type: "FRAME", name: "Stop row", w: 300, h: 48, fills: [], gap: 8, padding: [0, 0, 0, 0] },
    ...(o.noIcon ? [] : [{ id: `${id}-ic`, parent: `${id}-row`, type: "INSTANCE", name: "Icon/Normal/Circle Exclamation", w: 20, h: 20, component: "Icon/Normal/Circle Exclamation", text: "", hasIcon: false }]),
    { id: `${id}-st`, parent: `${id}-row`, type: "TEXT", name: "Stop", w: 80, h: 20, fills: [{ type: "SOLID", hex: "#FF4242", var: "Status/Negative" }], text: "가동 정지", fontSize: 16, textStyle: "Body 1/Normal - Bold" },
    ...(o.noFocus ? [] : [{ id: `${id}-focus`, parent: `${id}-c`, type: "FRAME", name: "[주목] 지금 처리할 일", w: 600, h: 200, fills: [], gap: 16, padding: [24, 24, 24, 24], ...(o.statusStroke ? { strokes: [{ type: "SOLID", hex: "#FF4242", var: "Status/Negative" }] } : {}) }]),
    ...(o.extraFocus ? [{ id: `${id}-focus2`, parent: `${id}-c`, type: "FRAME", name: "[주목] 두 번째", w: 100, h: 100, fills: [] }] : []),
    ...(o.tint ? [{ id: `${id}-tint`, parent: `${id}-row`, type: "RECTANGLE", name: "tint", w: 80, h: 20, opacity: 0.1, inViz: false, fills: [{ type: "SOLID", hex: "#FF4242", var: "Status/Negative" }], radius: 9999 }] : []),
    ...(o.noViz ? [] : [{ id: `${id}-viz`, parent: `${id}-c`, type: "FRAME", name: "[시각화] 완료율 막대", w: 200, h: 8, fills: [{ type: "SOLID", hex: "#0066FF", var: "Primary/Normal" }], radius: 4 }]),
    { id: `${id}-btn`, parent: `${id}-c`, type: "INSTANCE", name: "Button", w: 120, h: o.smallBtn ? 40 : 48, component: "Button/Button", text: "배정", hasIcon: false },
    ...(o.smallText ? [{ id: `${id}-s`, parent: `${id}-c`, type: "TEXT", name: "Meta", w: 80, h: 16, fills: [{ type: "SOLID", hex: "#000000", var: "Label/Alternative" }], text: "작게", fontSize: 13, textStyle: "Label 2/Regular" }] : []),
    ...(o.fallbackText ? [{ id: `${id}-fb`, parent: `${id}-c`, type: "TEXT", name: "Heading 2/Bold", w: 80, h: 28, fills: [{ type: "SOLID", hex: "#000000", var: "Label/Normal" }], text: "대체", fontSize: o.fallbackText === "bad" ? 18 : 20, textStyle: null, fontFamily: "Noto Sans KR", fontStyle: "Bold", lineHeight: 140 }] : []),
    ...(o.dsInstance ? [{ id: `${id}-dsb`, parent: `${id}-c`, type: "INSTANCE", name: "Button", w: 120, h: 48, component: "Button/Button", text: "확인", hasIcon: false, padding: [7, 7, 7, 7], radius: 7, strokes: [{ type: "SOLID", hex: "#000000", var: "Line/Normal/Neutral" }] }] : []),
    ...(o.prose ? [{ id: `${id}-pr`, parent: `${id}-c`, type: "TEXT", name: "Label 1/Normal - Regular", w: 400, h: 20, fills: [{ type: "SOLID", hex: "#000000", var: "Label/Alternative" }], text: "설비 6 · 가동 정지 1 · 이상 1", fontSize: 14, textStyle: "Label 1/Normal - Regular" }] : []),
    ...(o.badRadius ? [{ id: `${id}-r`, parent: `${id}-c`, type: "FRAME", name: "Odd", w: 80, h: 40, fills: [], radius: 7, gap: 5, padding: [0, 0, 0, 0] }] : []),
  ];
  return { id, name, width: w, height: h, mode, fills: [{ type: "SOLID", hex: "#F7F7F8", var: "Background/Normal/Alternative" }], nodes };
}
// Figma 안에서 도는 것과 같은 검사 로직으로 v2 요약 export 를 만든다
function exportOf(page, frames, local = []) {
  const all = checkFramesCore(frames, RULES.figma, local);
  const summary = { frames: frames.map((f) => ({ id: f.id, name: f.name, width: f.width, height: f.height, mode: f.mode, nodeCount: f.nodes.length })), localComponents: local, violationCount: all.length, violations: all.slice(0, 150) };
  const count = frames.reduce((n, f) => n + 1 + f.nodes.length, 0);
  return { version: 2, page, fileKey: "TEST", exportedAt: "test", ...summary, digest: `${fnv(JSON.stringify(frames))}-${count}-${fnv(JSON.stringify(summary))}` };
}
const P3 = () => exportOf("P3 시안", [frame("A-위험우선", 1920, 1080, "Light"), frame("B-라인", 1920, 1080, "Light"), frame("C-흐름", 1920, 1080, "Light")]);
const P4 = (o = {}) => exportOf("P4 확장", [
  frame("Web/Light", 1920, 1080, "Light", o.web), ...(o.noWebDark ? [] : [frame("Web/Dark", 1920, 1080, "Dark")]),
  frame("Tablet/Light", 1280, 800, "Light"), frame("Tablet/Dark", 1280, 800, "Dark"),
  frame("Mobile/Light", 360, 1600, "Light", o.mobile), frame("Mobile/Dark", 360, 1600, "Dark"),
], o.local ?? []);

// 실행 하나를 g까지 진행시키는 도우미
function upTo(slug, gate, o = {}) {
  run("init", slug, "--topic", "관리자 대시보드");
  put(slug, "p1-diagnosis/diagnosis.md", DIAG); put(slug, "p1-diagnosis/references.md", REFS);
  if (gate === "g1") return;
  run("g1", slug); run("proceed", slug);
  put(slug, "p2-spec/screen-spec.md", o.spec ?? SPEC());
  if (gate === "g2") return;
  run("g2", slug); run("proceed", slug);
  const p3 = P3(); put(slug, "p3-concept/figma-export.json", JSON.stringify(p3)); put(slug, "p3-concept/concepts.md", CONCEPTS);
  if (gate === "g3") return p3.digest;
  run("g3", slug, "--figma-digest", p3.digest);
  put(slug, "p3-concept/approval.md", "선택: A\n판정: 승인\n메모: 좋음\n");
  run("g3-approval", slug);
  const p4 = o.p4 ?? P4(); put(slug, "p4-expand/figma-export.json", JSON.stringify(p4)); put(slug, "p4-expand/screens.md", SCREENS);
  return p4.digest;
}

// ───────── 테스트
const results = [];
const expect = (id, name, cond, detail = "") => results.push({ id, name, ok: !!cond, detail });

// T1 정상 흐름 전체 통과 (g1 → g5)
{
  const d = upTo("t1", "g4");
  const g4 = run("g4", "t1", "--figma-digest", d);
  const g5 = run("g5", "t1", "--figma-digest", d);
  const report = fs.existsSync(path.join(TMP, "t1", "p5-qa", "qa-report.md"));
  expect("T1", "정상 샘플 g1~g5 통과 + qa-report 생성", g4.status === 0 && g5.status === 0 && report && state("t1").done, g4.stdout + g5.stdout);
}
// T2 ★1 가동 정지 행에 아이콘 없음
{ upTo("t2", "g2", { spec: SPEC({ stopRow: '| 가동 정지 | 빨간색 | Status/Negative |' }) }); const r = run("g2", "t2");
  expect("T2", "★1 가동 정지를 색만으로 표시 → G2 실패", r.status === 1 && r.stdout.includes("★1"), r.stdout); }
// T3 ★2 기록 상세에 수정 버튼
{ upTo("t3", "g2", { spec: SPEC({ recordAction: "수정 / 삭제" }) }); const r = run("g2", "t3");
  expect("T3", "★2 제출 기록에 수정·삭제 → G2 실패", r.status === 1 && r.stdout.includes("★2"), r.stdout); }
// T4 [추가 제안] 없이 부품 재고
{ upTo("t4", "g2", { spec: SPEC({ extraRow: "| 재고 | 부품 재고 현황 | Card | 보기 | - |" }) }); const r = run("g2", "t4");
  expect("T4", "표기 없는 기획 추가(부품 재고) → G2 실패", r.status === 1 && r.stdout.includes("임의 기획"), r.stdout); }
// T4b 같은 줄에 [추가 제안] 표기하면 통과
{ upTo("t4b", "g2", { spec: SPEC({ extraRow: "| 재고 | [추가 제안] 부품 재고 요약 — 근거: 수리 지연 원인 | Card | 보기 | D5 |" }) }); const r = run("g2", "t4b");
  expect("T4b", "[추가 제안] 표기한 추가는 G2 통과", r.status === 0, r.stdout); }
// T5 미연결 색
{ const d = upTo("t5", "g4", { p4: P4({ web: { unbound: true } }) }); const r = run("g4", "t5", "--figma-digest", d);
  expect("T5", "변수 미연결 색 → G4 실패", r.status === 1 && r.stdout.includes("미연결 색"), r.stdout); }
// T6 Dark 프레임 누락
{ const d = upTo("t6", "g4", { p4: P4({ noWebDark: true }) }); const r = run("g4", "t6", "--figma-digest", d);
  expect("T6", "Web/Dark 프레임 누락 → G4 실패", r.status === 1 && r.stdout.includes("Web/Dark"), r.stdout); }
// T7 가동 정지 옆 아이콘 없음
{ const d = upTo("t7", "g4", { p4: P4({ web: { noIcon: true } }) }); const r = run("g4", "t7", "--figma-digest", d);
  expect("T7", "Figma 가동 정지 아이콘 없음 → G4 실패", r.status === 1 && r.stdout.includes("★1 가동 정지 아이콘"), r.stdout); }
// T8 승인 후 설계 변경 → 승인 무효
{ const d = upTo("t8", "g4"); put("t8", "p2-spec/screen-spec.md", SPEC() + "\n<!-- 바뀜 -->\n"); const r = run("g4", "t8", "--figma-digest", d);
  const stale = fs.existsSync(path.join(TMP, "t8", "p3-concept", "approval-stale-1.md"));
  expect("T8", "승인 후 screen-spec 변경 → 승인 무효·g3-approval 복귀", r.status === 1 && r.stdout.includes("승인 무효") && stale && !state("t8").passed.includes("g3-approval"), r.stdout); }
// T9 모바일 버튼 높이 40
{ const d = upTo("t9", "g4", { p4: P4({ mobile: { smallBtn: true } }) }); const r = run("g4", "t9", "--figma-digest", d);
  expect("T9", "모바일 버튼 높이 40 → G4 실패", r.status === 1 && r.stdout.includes("터치 영역"), r.stdout); }
// T9b export 손으로 고침 → 지문 불일치
{ const d = upTo("t9b", "g3"); const p = path.join(TMP, "t9b", "p3-concept", "figma-export.json"); const ex = JSON.parse(fs.readFileSync(p)); ex.frames[0].name = "A-바꿈"; fs.writeFileSync(p, JSON.stringify(ex));
  const r = run("g3", "t9b", "--figma-digest", d);
  expect("T9b", "export 수동 수정 → 지문 불일치 실패", r.status === 1 && r.stdout.includes("지문"), r.stdout); }
// T9c 3회 연속 실패 → 차단
{ upTo("t9c", "g2", { spec: SPEC({ recordAction: "수정" }) }); run("g2", "t9c"); run("g2", "t9c"); const r = run("g2", "t9c");
  expect("T9c", "같은 게이트 3회 실패 → 차단(종료 코드 3)", r.status === 3, r.stdout); }
// T9d 반려(문제 정의) → g2 복귀
{ const d = upTo("t9d", "g3"); run("g3", "t9d", "--figma-digest", d); put("t9d", "p3-concept/approval.md", "선택: B\n판정: 반려\n반려 사유 분류: 문제 정의\n"); const r = run("g3-approval", "t9d");
  expect("T9d", "반려(문제 정의) → g2 로 복귀", r.status === 1 && r.stdout.includes("복귀: g2"), r.stdout); }
// T10 hook: 서브에이전트가 runs/ 에 쓰기 → 차단
{ run("init", "t10", "--topic", "x"); const r = hook("guard-write.mjs", { tool_name: "Write", agent_type: "researcher", cwd: ROOT, tool_input: { file_path: path.join(TMP, "t10", "p1-diagnosis", "diagnosis.md") } });
  expect("T10", "hook: 서브에이전트의 runs/ 쓰기 차단", r.status === 2, r.stderr); }
// T11 hook: approval.md 를 Claude 가 쓰기 → 차단 / 다른 게이트 폴더 쓰기 → 차단 / 현재 폴더 → 허용
{ const a = hook("guard-write.mjs", { tool_name: "Write", cwd: ROOT, tool_input: { file_path: path.join(TMP, "t10", "p3-concept", "approval.md") } });
  const b = hook("guard-write.mjs", { tool_name: "Write", cwd: ROOT, tool_input: { file_path: path.join(TMP, "t10", "p2-spec", "screen-spec.md") } });
  const c = hook("guard-write.mjs", { tool_name: "Write", cwd: ROOT, tool_input: { file_path: path.join(TMP, "t10", "p1-diagnosis", "diagnosis.md") } });
  expect("T11", "hook: approval.md·다른 게이트 폴더 차단, 현재 폴더 허용", a.status === 2 && b.status === 2 && c.status === 0, a.stderr + b.stderr + c.stderr); }
// T12 hook: judge 는 verify 외 명령 금지
{ const a = hook("guard-judge-bash.mjs", { tool_name: "Bash", tool_input: { command: "rm -rf runs" } });
  const b = hook("guard-judge-bash.mjs", { tool_name: "Bash", tool_input: { command: "node harness/scripts/verify.mjs g2 admin-dashboard" } });
  expect("T12", "hook: judge 는 verify.mjs 판정만 허용", a.status === 2 && b.status === 0, a.stderr + b.stderr); }

// T13 현장 화면 13px 텍스트
{ const d = upTo("t13", "g4", { p4: P4({ mobile: { smallText: true } }) }); const r = run("g4", "t13", "--figma-digest", d);
  expect("T13", "모바일 13px 본문 텍스트 → G4 실패", r.status === 1 && r.stdout.includes("현장 화면 글자 크기"), r.stdout); }
// T14 허용 외 모서리·간격
{ const d = upTo("t14", "g4", { p4: P4({ web: { badRadius: true } }) }); const r = run("g4", "t14", "--figma-digest", d);
  expect("T14", "모서리 7·간격 5 → G4 실패", r.status === 1 && r.stdout.includes("허용 외 모서리") && r.stdout.includes("허용 외 간격"), r.stdout); }
// T15 표기 없는 로컬 컴포넌트
{ const d = upTo("t15", "g4", { p4: P4({ local: ["Status Table"] }) }); const r = run("g4", "t15", "--figma-digest", d);
  expect("T15", "DS 없음 표기 없는 로컬 컴포넌트 → G4 실패", r.status === 1 && r.stdout.includes("DS 없음 미표기"), r.stdout); }

// T16 확인 대기 중 reopen → 수정 후 재판정, 승인 이후 reopen 거부
{ upTo("t16", "g2"); run("g2", "t16"); const a = run("reopen", "t16", "--from", "g2"); put("t16", "p2-spec/screen-spec.md", SPEC() + "\n<!-- 수정 -->\n"); const b = run("g2", "t16");
  const d = upTo("t16b", "g4"); const c = run("reopen", "t16b", "--from", "g2");
  expect("T16", "reopen: 확인 중 수정 허용, 승인 이후 거부", a.status === 0 && b.status === 0 && c.status === 2, a.stdout + b.stdout + c.stdout); }

// T17 대체 글꼴: 스타일 값과 같으면 통과, 다르면 실패
{ const d1 = upTo("t17", "g4", { p4: P4({ web: { fallbackText: "ok" } }) }); const a = run("g4", "t17", "--figma-digest", d1);
  const d2 = upTo("t17b", "g4", { p4: P4({ web: { fallbackText: "bad" } }) }); const b = run("g4", "t17b", "--figma-digest", d2);
  expect("T17", "대체 글꼴: 값 일치 통과 / 크기 불일치 실패", a.status === 0 && b.status === 1 && b.stdout.includes("대체 글꼴 값 불일치"), a.stdout + b.stdout); }

// T18 judge 의 use_figma: 생성된 digest 코드는 허용, 한 글자라도 바꾸면 차단
{ const code = buildFigmaCode({ mode: "digest", page: "P4 확장" });
  const a = hook("guard-judge-bash.mjs", { tool_name: "mcp__Figma__use_figma", tool_input: { code } });
  const b = hook("guard-judge-bash.mjs", { tool_name: "mcp__Figma__use_figma", tool_input: { code: code.replace("const MAX = 150;", "const MAX = 0;") } });
  const c = hook("guard-judge-bash.mjs", { tool_name: "mcp__Figma__use_figma", tool_input: { code: buildFigmaCode({ mode: "export", page: "P4 확장" }) } });
  expect("T18", "hook: judge 는 digest 코드 그대로만 실행 (수정·export 모드 차단)", a.status === 0 && b.status === 2 && c.status === 2, a.stderr + b.stderr + c.stderr); }

// T19 원티드 DS 인스턴스 자체 값(패딩 7·보더 변수)과 설명 문장 속 '가동 정지'는 위반 아님
{ const d = upTo("t19", "g4", { p4: P4({ web: { dsInstance: true, prose: true } }) }); const r = run("g4", "t19", "--figma-digest", d);
  expect("T19", "DS 인스턴스 내부 값·설명 문장은 오탐하지 않음", r.status === 0, r.stdout); }

// T20 시각화 요소 없는 프레임 → 실패
{ const d = upTo("t20", "g4", { p4: P4({ web: { noViz: true } }) }); const r = run("g4", "t20", "--figma-digest", d);
  expect("T20", "시각화 요소 0개 프레임 → G4 실패", r.status === 1 && r.stdout.includes("시각화 부족"), r.stdout); }

// T21 카드에 상태 색 테두리 → 실패 (⑩)
{ const d = upTo("t21", "g4", { p4: P4({ web: { statusStroke: true } }) }); const r = run("g4", "t21", "--figma-digest", d);
  expect("T21", "상태 색 테두리 → G4 실패", r.status === 1 && r.stdout.includes("상태 색 테두리 금지"), r.stdout); }

// T22 [시각화] 밖 반투명 바탕 → 실패, 안쪽 반투명은 통과 (⑪)
{ const d = upTo("t22", "g4", { p4: P4({ web: { tint: true } }) }); const r = run("g4", "t22", "--figma-digest", d);
  const inside = checkFramesCore([{ id: "f", name: "F", width: 1920, height: 1080, fills: [], nodes: [{ id: "a", parent: "f", type: "FRAME", name: "[주목] x", fills: [] }, { id: "v", parent: "f", type: "FRAME", name: "[시각화] 히트맵", fills: [] }, { id: "c", parent: "v", type: "RECTANGLE", name: "정상", opacity: 0.2, inViz: true, fills: [{ type: "SOLID", hex: "#00BF40", var: "Status/Positive" }], radius: 8 }] }], RULES.figma, []);
  expect("T22", "시각화 밖 반투명 → 실패 / 시각화 안 → 허용", r.status === 1 && r.stdout.includes("옅은 바탕 금지") && !inside.some((x) => x.includes("옅은 바탕")), r.stdout + inside.join("\n")); }

// T23 [주목] 0개·2개 → 실패 (⑫)
{ const none = checkFramesCore([frame("N", 1920, 1080, "Light", { noFocus: true })], RULES.figma, []);
  const two = checkFramesCore([frame("T", 1920, 1080, "Light", { extraFocus: true })], RULES.figma, []);
  const one = checkFramesCore([frame("O", 1920, 1080, "Light")], RULES.figma, []);
  expect("T23", "주목 영역 0개·2개 → 위반, 1개 → 통과", none.some((x) => x.includes("주목 영역")) && two.some((x) => x.includes("주목 영역")) && !one.some((x) => x.includes("주목 영역")), [none, two, one].map((a) => a.join(" | ")).join("\n")); }

// T24 G3 통과 후 승인 전 시안 수정 → reopen g3 로 재판정
{ const d = upTo("t24", "g3"); const a = run("g3", "t24", "--figma-digest", d); const b = run("reopen", "t24", "--from", "g3"); const c = run("g3", "t24", "--figma-digest", d);
  expect("T24", "reopen g3: 승인 전 시안 수정 후 G3 재판정", a.status === 0 && b.status === 0 && c.status === 0, a.stdout + b.stdout + c.stdout); }

// ───────── 결과
let fail = 0;
for (const r of results) { console.log(`${r.ok ? "✅" : "❌"} ${r.id} ${r.name}`); if (!r.ok) { fail++; console.log("   " + r.detail.split("\n").slice(0, 8).join("\n   ")); } }
console.log(`\n${results.length - fail}/${results.length} 통과`);
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
