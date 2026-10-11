#!/usr/bin/env node
// 체크라인 하네스 — 판정 스크립트·hook 테스트 (r8-verify.md T1~T9 + 실행 중 보완 T10~T37)
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

const rawRun = (...args) => spawnSync("node", [VERIFY, ...args], { env, encoding: "utf8" });
const hook = (name, payload) => spawnSync("node", [path.join(ROOT, "harness", "scripts", name)], { env, input: JSON.stringify(payload), encoding: "utf8" });
// judge 가 Figma 에서 digest 코드를 실행한 것처럼 PostToolUse hook 에 넣는다 (record-judge-digest.mjs 를 그대로 거침)
const judgeFigma = (page, digest, agent_type = "judge", fileKey = "TEST") => hook("record-judge-digest.mjs", { agent_type, tool_name: "mcp__Figma__use_figma", tool_input: { code: buildFigmaCode({ mode: "digest", page }) }, tool_response: [{ type: "text", text: JSON.stringify({ fileKey, page, digest }) }] });
// 일반 흐름 테스트용: 판정 전에 judge 의 Figma 실행 기록과 사람 서명을 갖춘다 (각각 따로 검사하는 테스트는 rawRun 사용)
const run = (...args) => {
  if (args[0] === "init" && !args.includes("--figma")) args.push("--figma", "https://www.figma.com/design/TEST/test"); // 테스트 export 의 fileKey = TEST
  const i = args.indexOf("--figma-digest");
  if (["g3", "g4", "g5"].includes(args[0]) && i > 0) judgeFigma(args[0] === "g3" ? RULES.g3.page : RULES.g4.page, args[i + 1]);
  if (args[0] === "g3-approval" && fs.existsSync(path.join(TMP, args[1], "p3-concept", "approval.md"))) rawRun("sign", args[1]);
  return rawRun(...args);
};
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
const SCREENS = `# P4 확장\n\n> 선택안: A\n\n| 프레임 | 크기 | node id |\n| --- | --- | --- |\n` + ["Web/Light", "Web/Dark", "Tablet/Light", "Tablet/Dark", "Mobile/Light", "Mobile/Dark"].map((n) => `| ${n} | - | ${n} |`).join("\n") + "\n";

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
{ const a = hook("guard-judge-bash.mjs", { agent_type: "judge", tool_name: "Bash", tool_input: { command: "rm -rf runs" } });
  const b = hook("guard-judge-bash.mjs", { agent_type: "judge", tool_name: "Bash", tool_input: { command: "node harness/scripts/verify.mjs g2 admin-dashboard" } });
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
  const a = hook("guard-judge-bash.mjs", { agent_type: "judge", tool_name: "mcp__Figma__use_figma", tool_input: { code } });
  const b = hook("guard-judge-bash.mjs", { agent_type: "judge", tool_name: "mcp__Figma__use_figma", tool_input: { code: code.replace("const MAX = 150;", "const MAX = 0;") } });
  const c = hook("guard-judge-bash.mjs", { agent_type: "judge", tool_name: "mcp__Figma__use_figma", tool_input: { code: buildFigmaCode({ mode: "export", page: "P4 확장" }) } });
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

// ───────── 2차 보강 (독립 채점 66점 → 지적 사항 반영)
const F0 = (nodes) => [{ id: "f", name: "F", width: 1920, height: 1080, fills: [{ type: "SOLID", hex: "#FFFFFF", var: "Background/Normal/Normal" }], nodes: [{ id: "fo", parent: "f", type: "FRAME", name: "[주목] x", fills: [] }, { id: "vz", parent: "f", type: "FRAME", name: "[시각화] y", fills: [] }, ...nodes] }];
const txt = (id, parent, text, extra = {}) => ({ id, parent, type: "TEXT", name: "Label 1/Normal - Bold", text, fontSize: 14, fontFamily: "Noto Sans KR", fontStyle: "Bold", lineHeight: 142.9, textStyle: null, fills: [{ type: "SOLID", hex: "#000000", var: "Label/Normal" }], ...extra });
const icon = (id, parent) => ({ id, parent, type: "INSTANCE", name: "Icon/Normal/Triangle Exclamation", component: "Icon/Normal/Triangle Exclamation", text: "", hasIcon: false, w: 18, h: 18 });

// T25 ★1 원문: '가동 정지' 옆에 '정상'
{ const v = checkFramesCore(F0([{ id: "g", parent: "f", type: "FRAME", name: "행", fills: [] }, icon("i", "g"), txt("a", "g", "가동 정지"), txt("b", "g", "정상")]), RULES.figma, []);
  const ok = checkFramesCore(F0([{ id: "g", parent: "f", type: "FRAME", name: "행", fills: [] }, icon("i", "g"), txt("a", "g", "가동 정지")]), RULES.figma, []);
  expect("T25", "★1 원문: 정지 라벨 옆 '정상' → 위반", v.some((x) => x.includes("★1 정지 설비가 정상으로 보임")) && !ok.some((x) => x.includes("★1")), v.join("\n")); }
// T26 ★2 원문: 기록 수정 버튼
{ const v = checkFramesCore(F0([{ id: "b", parent: "f", type: "INSTANCE", name: "Button", component: "Button/Button", text: "수정", hasIcon: false, w: 80, h: 48 }]), RULES.figma, []);
  expect("T26", "★2 원문: '수정' 버튼 → 위반", v.some((x) => x.includes("★2 기록 수정·삭제 버튼")), v.join("\n")); }
// T27 허용 외 색 변수 / 미연결 색
{ const v = checkFramesCore(F0([{ id: "r", parent: "f", type: "RECTANGLE", name: "r", fills: [{ type: "SOLID", hex: "#FF00FF", var: "Brand/Pink" }] }, { id: "r2", parent: "f", type: "RECTANGLE", name: "r2", fills: [{ type: "SOLID", hex: "#123456", var: null }] }]), RULES.figma, []);
  expect("T27", "허용 외 색 변수·미연결 색 → 위반", v.some((x) => x.includes("허용 외 색 변수")) && v.some((x) => x.includes("미연결 색")), v.join("\n")); }
// T28 허용 외 텍스트 스타일
{ const v = checkFramesCore(F0([txt("t", "f", "제목", { name: "Display 9/Bold", textStyle: null })]), RULES.figma, []);
  expect("T28", "허용 외 텍스트 스타일 → 위반", v.some((x) => x.includes("허용 외 텍스트 스타일")), v.join("\n")); }
// T29 guard-review: 확인 대기 중 작업 에이전트 차단, judge 허용
{ upTo("t29", "g1"); run("g1", "t29");
  const a = hook("guard-review.mjs", { tool_name: "Agent", tool_input: { subagent_type: "spec-writer" } });
  const b = hook("guard-review.mjs", { tool_name: "Agent", tool_input: { subagent_type: "judge" } });
  run("proceed", "t29");
  expect("T29", "hook: 확인 대기 중 작업 에이전트 차단, judge 허용", a.status === 2 && b.status === 0, a.stderr + b.stderr); }
// T30 guard-bash: 허용 목록 — 보호 폴더 쓰기·사람 전용 명령 차단, 읽기·판정은 역할에 맞게 허용 (3차 보강)
{ const B = (command, agent_type) => hook("guard-bash.mjs", { tool_name: "Bash", ...(agent_type ? { agent_type } : {}), tool_input: { command } }).status;
  const blocked = ["echo x > runs/a/p3-concept/approval.md", "cp /tmp/x harness/rules.yaml", "sed -i 's/a/b/' docs/design.md", "node -e \"require('fs').writeFileSync('runs/a/state.json','{}')\"", "node harness/scripts/verify.mjs proceed a", "node harness/scripts/verify.mjs unblock a", "rm -rf .claude/agents", "git checkout -- harness/rules.yaml"].map((c) => B(c));
  const allowed = [B("node harness/scripts/verify.mjs g1 a", "judge"), B("node harness/scripts/verify.mjs figma-code g4 a --mode export"), B("ls runs"), B("cat harness/rules.yaml"), B('node harness/scripts/verify.mjs init admin-dashboard --topic "관리자 대시보드" --figma https://www.figma.com/design/hGOPDklObkEWDq8twPDv5T/Checkline')];
  const bad = spawnSync("node", [path.join(ROOT, "harness", "scripts", "guard-bash.mjs")], { env, input: "not json", encoding: "utf8" }); // 입력 깨짐 → 막음
  expect("T30", "hook: Bash 허용 목록 — 쓰기·사람 전용 8종 차단, 읽기·판정·init 허용, 입력 오류 차단", blocked.every((x) => x === 2) && allowed.every((x) => x === 0) && bad.status === 2, JSON.stringify({ blocked, allowed })); }
// T31 guard-judge-bash: 명령 끼워넣기 차단
{ const J = (command) => hook("guard-judge-bash.mjs", { agent_type: "judge", tool_name: "Bash", tool_input: { command } }).status;
  const r = [J('cd "$(touch /tmp/pwned)" && node harness/scripts/verify.mjs status a'), J("node $(echo>/tmp/x)/harness/scripts/verify.mjs status a"), J("node harness/scripts/verify.mjs status a; rm -rf runs"), J("node harness/scripts/verify.mjs 'status' a"), J("node harness/scripts/verify.mjs status a")];
  expect("T31", "hook: judge 명령에 $()·cd&&·;·따옴표 끼워넣기 차단", r.slice(0, 4).every((x) => x === 2) && r[4] === 0, JSON.stringify(r)); }
// T32 guard-judge-read: judge 는 export 를 못 읽고, Grep·Glob 은 쓰지 않음
{ const J = (tool_name, tool_input) => hook("guard-judge-read.mjs", { agent_type: "judge", tool_name, cwd: ROOT, tool_input }).status;
  const r = [J("Read", { file_path: "runs/a/p4-expand/figma-export.json" }), J("Read", { file_path: "runs/a/p4-expand/FIGMA-EXPORT.json" }), J("Grep", { pattern: "digest", path: "runs/a/p3-concept" }), J("Glob", { pattern: "runs/**/*.json" }), J("Read", { file_path: "runs/a/p4-expand/screens.md" })];
  expect("T32", "hook: judge 의 figma-export 읽기·폴더 Grep·Glob 차단 (지문 베끼기 방지)", r.slice(0, 4).every((x) => x === 2) && r[4] === 0, JSON.stringify(r)); }
// T33 승인 뒤 P3 검사 결과(figma-export.json)를 바꾸면 승인 무효
{ const d = upTo("t33", "g4"); const p = path.join(TMP, "t33", "p3-concept", "figma-export.json"); const j = JSON.parse(fs.readFileSync(p, "utf8")); j.violationCount = 0; j.note = "tampered"; fs.writeFileSync(p, JSON.stringify(j));
  const r = run("g4", "t33", "--figma-digest", d);
  expect("T33", "승인 뒤 P3 export 변조 → 승인 무효", r.status === 1 && r.stdout.includes("승인 무효"), r.stdout); }
// T34 G1 실패: 진단 3개뿐
{ run("init", "t34", "--topic", "x"); put("t34", "p1-diagnosis/diagnosis.md", DIAG.split("### D4")[0]); put("t34", "p1-diagnosis/references.md", REFS);
  const r = run("g1", "t34"); expect("T34", "G1: 진단 5개 미만 → 실패", r.status === 1, r.stdout); }
// T35 G3 실패: 시안 2개뿐
{ upTo("t35", "g3"); const p3 = exportOf("P3 시안", [frame("A-위험우선", 1920, 1080, "Light"), frame("B-라인", 1920, 1080, "Light")]); put("t35", "p3-concept/figma-export.json", JSON.stringify(p3));
  const r = run("g3", "t35", "--figma-digest", p3.digest); expect("T35", "G3: 시안 프레임 2개 → 실패", r.status === 1, r.stdout); }
// T36 G5 전용: screens.md 선택안이 승인과 다름
{ const d = upTo("t36", "g4"); run("g4", "t36", "--figma-digest", d); put("t36", "p4-expand/screens.md", SCREENS.replace("선택안: A", "선택안: B"));
  const r = run("g5", "t36", "--figma-digest", d); expect("T36", "G5: 확장 결과의 선택안 ≠ 승인 시안 → 실패", r.status === 1 && r.stdout.includes("선택안"), r.stdout); }
// T37 SSOT 동기화: design.md 표기 값·figma-build 의 SPEC 이 rules.yaml 과 같다
{ const md = fs.readFileSync(path.join(ROOT, "docs", "design.md"), "utf8");
  const nums = (h) => (md.split(h)[1] || "").split("\n").find((l) => l.includes("허용 값")).replace("full(9999)", "9999").match(/\d+/g).map(Number);
  const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const issues = [];
  if (!sameList(nums("### 4-2"), RULES.figma.allowed_spacing)) issues.push("design.md 4-2 간격 ≠ rules.yaml");
  if (!sameList(nums("### 4-3"), RULES.figma.allowed_radius)) issues.push("design.md 4-3 모서리 ≠ rules.yaml");
  const specs = RULES.figma.text_fallback.specs;
  const dir = path.join(ROOT, "harness", "figma-build");
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const m = fs.readFileSync(path.join(dir, f), "utf8").match(/const SPEC = (\{[^;]+\});/); if (!m) continue;
    const spec = Function(`return ${m[1]}`)();
    for (const [k, v] of Object.entries(spec)) if (!specs[k] || specs[k][0] !== v[0] || Math.abs(specs[k][1] - v[1]) > 0.01) issues.push(`${f}: ${k} ${v} ≠ rules.yaml`);
  }
  // 3차 보강: 색 변수·텍스트 스타일·터치 높이도 design.md 와 대조 (rules.yaml 에 있는데 문서에 없으면 실패)
  for (const c of RULES.figma.allowed_color_variables) if (!md.includes("`" + c + "`")) issues.push(`design.md 에 허용 색 변수 \`${c}\` 없음`);
  for (const t of RULES.figma.allowed_text_styles) { const name = t.replace(/\/$/, "").replace(/\/Normal$/, ""); if (!new RegExp(`\\|\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(md)) issues.push(`design.md 3장 표에 텍스트 스타일 '${name}' 없음`); }
  for (const [k, [size]] of Object.entries(specs)) { const name = k.replace(/\/$/, "").replace(/\/Normal$/, ""); const row = md.split("\n").find((l) => new RegExp(`^\\|\\s*${name}\\b`).test(l)); if (row && !row.includes(`${size} /`)) issues.push(`design.md '${name}' 크기 ≠ ${size}`); }
  if (!md.includes(`Size=Large (${RULES.figma.min_touch_height})`)) issues.push(`design.md 최소 터치 높이 ≠ ${RULES.figma.min_touch_height}`);
  expect("T37", "SSOT 동기화: design.md 간격·모서리·색 변수·텍스트 스타일·터치 높이, figma-build 글자 규격 = rules.yaml", issues.length === 0, issues.join("\n")); }

// T38 시안 전부 반려 → '선택: 없음' 으로 기록, G3 로 복귀
{ const d = upTo("t38", "g3"); run("g3", "t38", "--figma-digest", d); put("t38", "p3-concept/approval.md", "선택: 없음\n판정: 반려\n반려 사유 분류: 방향\n메모: 셋 다 집중할 곳이 없음\n");
  const r = run("g3-approval", "t38");
  expect("T38", "시안 전부 반려('선택: 없음') → G3 복귀", r.stdout.includes("반려") && state("t38").passed.indexOf("g3") === -1, r.stdout); }

// T39 지문 불일치 메시지에 export 지문이 나오지 않음 (틀린 값을 넣어 정답을 알아내는 길 차단)
{ const d = upTo("t39", "g3"); const r = run("g3", "t39", "--figma-digest", "00000000-0-00000000");
  expect("T39", "지문 불일치 메시지에 export 지문 비노출", r.status === 1 && !r.stdout.includes(d) && !r.stderr.includes(d), r.stdout); }
// T40 승인 기록에 잠금 대상 파일이 빠져 있으면 건너뛰지 않고 실패 (fail-closed)
{ const d = upTo("t40", "g4"); setState("t40", (s) => { delete s.approval.hashes["p3-concept/figma-export.json"]; });
  const r = run("g4", "t40", "--figma-digest", d);
  expect("T40", "승인 잠금 누락 → G4 실패 (재승인 필요)", r.status === 1 && r.stdout.includes("잠금이 없습니다"), r.stdout); }
// T41 역할 분리: 판정 명령은 judge 만, export 코드·init·테스트는 메인 세션만
{ const B = (command, agent_type) => hook("guard-bash.mjs", { tool_name: "Bash", ...(agent_type ? { agent_type } : {}), tool_input: { command } }).status;
  const r = [B("node harness/scripts/verify.mjs g3 a --figma-digest 533a069b-734-d6bf173c", "concept-designer"), B("node harness/scripts/verify.mjs g3 a --figma-digest 533a069b-734-d6bf173c"), B("node harness/scripts/verify.mjs figma-code g3 a", "expander"), B("node harness/scripts/verify.mjs figma-code g3 a --mode export", "judge"), B("node tests/run.mjs", "expander"),
             B("node harness/scripts/verify.mjs g3 a --figma-digest 533a069b-734-d6bf173c", "judge"), B("node harness/scripts/verify.mjs figma-code g3 a", "judge"), B("node harness/scripts/verify.mjs status a", "expander")];
  expect("T41", "hook: 판정·지문 코드는 judge 만, export 코드·테스트는 메인만", r.slice(0, 5).every((x) => x === 2) && r.slice(5).every((x) => x === 0), JSON.stringify(r)); }
// T42 채점자가 찾은 Bash 우회 12종 → 모두 차단
{ const B = (command) => hook("guard-bash.mjs", { tool_name: "Bash", tool_input: { command } }).status;
  const tries = ['node harness/scripts/verify.mjs "proceed" a', "node harness/scripts/verify.mjs pro''ceed a", "A=proceed; node harness/scripts/verify.mjs $A a", "cd runs/a && echo > state.json", "python3 - <<E\nopen('runs/a/state.json','w')\nE", "node -e \"fs['write'+'File'+'Sync']('runs/a/state.json','')\"", "echo x | sponge runs/a/state.json", "sed -e s/a/b/ -i runs/a/state.json", "vim -c w! runs/a/state.json", "node /tmp/x.mjs", "grep --pre=sh x runs", "git -c core.pager=sh log"];
  const r = tries.map(B);
  expect("T42", "hook: 따옴표·변수·heredoc·cd·sponge·vim·외부 스크립트 등 우회 12종 차단", r.every((x) => x === 2), JSON.stringify(r)); }
// T43 NotebookEdit 도 저장 권한 검사
{ run("init", "t43", "--topic", "x"); const r = hook("guard-write.mjs", { tool_name: "NotebookEdit", agent_type: "expander", cwd: ROOT, tool_input: { notebook_path: path.join(TMP, "t43", "p1-diagnosis", "x.ipynb") } });
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude", "settings.json"), "utf8"));
  const covered = settings.hooks.PreToolUse.some((h) => new RegExp(`^(${h.matcher})$`).test("NotebookEdit") && h.hooks.some((x) => x.command.includes("guard-write")));
  expect("T43", "hook: NotebookEdit 로 runs/ 쓰기 차단 + settings matcher 포함", r.status === 2 && covered, r.stderr); }
// T44 작업 에이전트 도구에 Bash 없음, judge 도구에 Grep·Glob 없음
{ const tools = (a) => (fs.readFileSync(path.join(ROOT, ".claude", "agents", a + ".md"), "utf8").match(/^tools:\s*(.+)$/m) || [, ""])[1].split(/\s*,\s*/);
  const bad = [...RULES.gates.work_agents.filter((a) => tools(a).includes("Bash")).map((a) => a + ":Bash"), ...["Grep", "Glob", "Write", "Edit"].filter((t) => tools("judge").includes(t)).map((t) => "judge:" + t)];
  expect("T44", "역할: 작업 에이전트 Bash 없음 · judge 는 Read·Bash(판정)·use_figma 만", bad.length === 0, bad.join(", ")); }

// T45 judge 제한은 settings.json 에서도 걸림 (frontmatter hook 이 안 뜨는 환경 대비): judge 의 cat·export Read 차단, 다른 에이전트는 영향 없음
{ const st = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude", "settings.json"), "utf8")).hooks.PreToolUse;
  const has = (tool, script) => st.some((h) => new RegExp(`^(${h.matcher})$`).test(tool) && h.hooks.some((x) => x.command.includes(script)));
  const r = [hook("guard-bash.mjs", { agent_type: "judge", tool_name: "Bash", tool_input: { command: "cat runs/a/state.json" } }).status,
             hook("guard-judge-read.mjs", { agent_type: "spec-writer", tool_name: "Grep", cwd: ROOT, tool_input: { pattern: "x" } }).status,
             hook("guard-judge-bash.mjs", { agent_type: "expander", tool_name: "mcp__Figma__use_figma", tool_input: { code: "figma.createFrame()" } }).status];
  const ok = has("Read", "guard-judge-read") && has("Grep", "guard-judge-read") && has("mcp__Figma__use_figma", "guard-judge-bash") && r[0] === 2 && r[1] === 0 && r[2] === 0;
  expect("T45", "hook: judge 제한을 settings 에서도 적용 (cat 차단), 다른 에이전트는 통과", ok, JSON.stringify(r)); }

// T46 지문 출처: judge 의 Figma 실행 기록이 없거나 다르면 실패 (메인이 export 에서 읽은 값을 넘기는 길 차단)
{ const d = upTo("t46", "g3"); const rec = path.join(TMP, RULES.figma.judge_record_file);
  fs.rmSync(rec, { force: true }); const a = rawRun("g3", "t46", "--figma-digest", d);                       // 기록 없음
  judgeFigma(RULES.g3.page, d, "concept-designer"); const b = rawRun("g3", "t46", "--figma-digest", d);       // judge 아닌 에이전트의 실행은 기록 안 됨
  judgeFigma(RULES.g3.page, "0000000a-1-0000000b"); const c = rawRun("g3", "t46", "--figma-digest", d);       // 기록과 다른 값
  setState("t46", (x) => { x.attempts.g3 = 0; x.blocked = null; }); judgeFigma(RULES.g3.page, d); const ok = rawRun("g3", "t46", "--figma-digest", d);                         // 기록과 같음 → 통과
  expect("T46", "지문은 judge 의 use_figma 실행 기록(PostToolUse)과 같아야 함", a.status === 1 && b.status === 1 && c.status !== 0 && c.stdout.includes("기록과 다릅니다") && ok.status === 0, [c.stdout + c.stderr, ok.stdout + ok.stderr, String(c.status), String(ok.status)].join(" | ")); }
// T47 사람 서명: approval.md 만으로는 판정 안 함, sign 후 판정, 서명 뒤 내용이 바뀌면 다시 대기 / sign 은 에이전트 실행 불가
{ const d = upTo("t47", "g3"); run("g3", "t47", "--figma-digest", d); put("t47", "p3-concept/approval.md", "선택: A\n판정: 승인\n메모: x\n");
  const a = rawRun("g3-approval", "t47"); rawRun("sign", "t47"); put("t47", "p3-concept/approval.md", "선택: B\n판정: 승인\n메모: 바꿈\n");
  const b = rawRun("g3-approval", "t47"); rawRun("sign", "t47"); const c = rawRun("g3-approval", "t47");
  const g = hook("guard-bash.mjs", { tool_name: "Bash", tool_input: { command: "node harness/scripts/verify.mjs sign t47" } }).status;
  expect("T47", "approval.md 는 사람 서명(sign) 후에만 판정, 서명 뒤 변경 시 재서명, sign 은 사람 전용", a.stdout.includes("서명 대기") && b.stdout.includes("바뀌었습니다") && c.status === 0 && state("t47").approval.choice === "B" && g === 2, [a.stdout, b.stdout, c.stdout].join("\n")); }
// T48 경로 변형: 대소문자·심볼릭 링크로 approval.md·state.json·실행 중 규칙 수정 우회 차단, 기록 파일 직접 쓰기 차단
{ run("init", "t48", "--topic", "x"); const W = (fp) => hook("guard-write.mjs", { tool_name: "Write", cwd: ROOT, tool_input: { file_path: fp } }).status;
  const T = TMP.replace(/tests\/\.tmp$/, "TESTS/.TMP");
  fs.symlinkSync(path.join(TMP, "t48"), path.join(TMP, "t48link"), "dir");
  const r = [W(path.join(TMP, "t48", "p3-concept", "Approval.md")), W(path.join(TMP, "T48", "STATE.json")), W(path.join(ROOT, "Harness", "rules.yaml")), W(path.join(TMP, "t48link", "p1-diagnosis", "approval.md")), W(path.join(TMP, RULES.figma.judge_record_file)), W(path.join(TMP, "t48", "P2-SPEC", "x.md")), W(path.join(TMP, "t48", "p1-diagnosis", "diagnosis.md"))];
  expect("T48", "hook: 대소문자·링크 경로 변형 차단 (6종), 정상 경로 허용", r.slice(0, 6).every((x) => x === 2) && r[6] === 0, JSON.stringify(r)); }
// T49 실행 중 저장소 밖 .claude/ (에이전트 정의) 쓰기 차단, HARNESS_RUNS 는 tests/.tmp 밖이면 무시
{ const a = hook("guard-write.mjs", { tool_name: "Write", cwd: ROOT, tool_input: { file_path: path.join(process.env.HOME || "/root", ".claude", "agents", "judge.md") } }).status;
  const e2 = { ...process.env, HARNESS_RUNS: "/tmp/elsewhere-runs" };
  const b = spawnSync("node", [VERIFY, "status", "admin-dashboard"], { env: e2, encoding: "utf8" });
  expect("T49", "hook: 실행 중 ~/.claude 쓰기 차단 · HARNESS_RUNS 가 tests/.tmp 밖이면 실제 runs/ 사용", a === 2 && b.stdout.includes("admin-dashboard"), String(a) + b.stdout + b.stderr); }
// T50 메인 세션은 실행 중 Figma 를 직접 고치지 않음 (작업 에이전트는 자유)
{ const U = (agent_type) => hook("guard-judge-bash.mjs", { ...(agent_type ? { agent_type } : {}), tool_name: "mcp__Figma__use_figma", tool_input: { code: "figma.createFrame()" } }).status;
  const hasActive = fs.readdirSync(path.join(ROOT, RULES.run.runs_dir)).some((s) => { try { return !JSON.parse(fs.readFileSync(path.join(ROOT, RULES.run.runs_dir, s, "state.json"), "utf8")).done; } catch { return false; } });
  const r = [U(), U("expander")];
  expect("T50", "hook: 실행 중이면 메인 세션 use_figma 차단, 작업 에이전트 허용 (실제 runs/ 기준)", (hasActive ? r[0] === 2 : r[0] === 0) && r[1] === 0, JSON.stringify({ hasActive, r })); }

// T51 4차: .git·CLAUDE.md·.mcp.json 은 실행 여부와 무관하게 보호 (HARNESS_DEV=1 이고 실행 중이 아닐 때만 허용), git 명령 불가
{ const W = (rel, extra = {}) => spawnSync("node", [path.join(ROOT, "harness", "scripts", "guard-write.mjs")], { env: { ...process.env, HARNESS_RUNS: path.join(TMP, "empty-runs"), ...extra }, input: JSON.stringify({ tool_name: "Write", cwd: ROOT, tool_input: { file_path: path.join(ROOT, rel) } }), encoding: "utf8" }).status;
  fs.mkdirSync(path.join(TMP, "empty-runs"), { recursive: true });
  const r = [W(".git/config"), W("CLAUDE.md"), W(".mcp.json"), W("harness/rules.yaml"), W(".claude/agents/judge.md"), W("harness/rules.yaml", { HARNESS_DEV: "1" }), W("deliverables/x.md")];
  const g = hook("guard-bash.mjs", { tool_name: "Bash", tool_input: { command: "git status" } }).status;
  expect("T51", "hook: 실행 중이 아니어도 .git·CLAUDE.md·.mcp.json·규칙 보호, HARNESS_DEV=1 만 허용, git 불가", r.slice(0, 5).every((x) => x === 2) && r[5] === 0 && r[6] === 0 && g === 2, JSON.stringify({ r, g })); }
// T52 4차: 실행 중 하네스 밖 에이전트(general-purpose 등) 호출 차단, use_figma 는 작업 에이전트만 (확인 대기 중엔 금지)
{ upTo("t52", "g1"); run("g1", "t52");
  const A = (subagent_type) => hook("guard-review.mjs", { tool_name: "Agent", tool_input: subagent_type ? { subagent_type } : {} }).status;
  const r = [A("general-purpose"), A(), A("Explore"), A("judge")];
  run("proceed", "t52");
  expect("T52", "hook: 실행 중 general-purpose·Explore 호출 차단, judge 허용", r[0] === 2 && r[1] === 2 && r[2] === 2 && r[3] === 0, JSON.stringify(r)); }
// T53 4차: 지문은 이 실행의 Figma 파일에서 — 다른 파일에서 뽑은 export·지문은 실패
{ run("init", "t53", "--topic", "x", "--figma", "https://www.figma.com/design/REALKEY/x"); setState("t53", (s) => { s.passed = ["g1", "g2"]; });
  const p3 = P3(); put("t53", "p3-concept/figma-export.json", JSON.stringify(p3)); put("t53", "p3-concept/concepts.md", CONCEPTS);
  judgeFigma(RULES.g3.page, p3.digest, "judge", "TEST"); const a = rawRun("g3", "t53", "--figma-digest", p3.digest);
  expect("T53", "다른 Figma 파일(decoy)의 export·지문 → 실패", a.status === 1 && a.stdout.includes("다른 파일"), a.stdout); }

// T54 5차: 실행 전이라도 ~/.claude 설정·~/.claude.json 쓰기 차단 / 확인 대기 중 다음 단계 산출물 직접 쓰기 차단 / init 은 --figma 필수 / judge·메인의 다른 Figma 쓰기 도구 차단
{ const W = (fp) => spawnSync("node", [path.join(ROOT, "harness", "scripts", "guard-write.mjs")], { env: { ...process.env, HARNESS_RUNS: path.join(TMP, "empty-runs") }, input: JSON.stringify({ tool_name: "Write", cwd: ROOT, tool_input: { file_path: fp } }), encoding: "utf8" }).status;
  const home = process.env.HOME || "/root";
  const a = [W(path.join(home, ".claude", "settings.json")), W(path.join(home, ".claude.json"))];
  upTo("t54", "g1"); run("g1", "t54"); // g1 통과 → 확인 대기
  const b = hook("guard-write.mjs", { tool_name: "Write", cwd: ROOT, tool_input: { file_path: path.join(TMP, "t54", "p2-spec", "screen-spec.md") } }).status;
  run("proceed", "t54");
  const c = rawRun("init", "t54b", "--topic", "x").status;
  const d = [hook("guard-judge-bash.mjs", { agent_type: "judge", tool_name: "mcp__Figma__generate_figma_design", tool_input: {} }).status];
  expect("T54", "hook: ~/.claude 설정 상시 차단, 확인 대기 중 산출물 쓰기 차단, init --figma 필수, judge 의 Figma 쓰기 도구 차단", a.every((x) => x === 2) && b === 2 && c === 2 && d[0] === 2, JSON.stringify({ a, b, c, d })); }

// ───────── 결과
let fail = 0;
for (const r of results) { console.log(`${r.ok ? "✅" : "❌"} ${r.id} ${r.name}`); if (!r.ok) { fail++; console.log("   " + r.detail.split("\n").slice(0, 8).join("\n   ")); } }
console.log(`\n${results.length - fail}/${results.length} 통과`);
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
