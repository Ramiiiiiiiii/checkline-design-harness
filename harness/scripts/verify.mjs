#!/usr/bin/env node
// 체크라인 디자인 하네스 — 게이트 판정 스크립트
// 기준: harness/rules.yaml (SSOT). 이 스크립트만 state.json · qa-report.md 를 쓴다.
//
// 사용법
//   node harness/scripts/verify.mjs init <slug> --topic "<화면 주제>" [--figma <Figma URL>]
//   node harness/scripts/verify.mjs <g1|g2|g3-approval> <slug>
//   node harness/scripts/verify.mjs <g3|g4|g5> <slug> --figma-digest <지문>
//   node harness/scripts/verify.mjs figma-code <g3|g4|g5> <slug> [--mode export]   # Figma에서 실행할 검사 코드 (기본 digest = judge용)
//   node harness/scripts/verify.mjs status <slug>
//   figma-code … --mode export --page all                         # 모든 페이지 점검 (게이트 밖 화면용)
//   ── 아래 4개는 사람 전용: 에이전트의 Bash 는 guard-bash.mjs 가 막는다. 사람이 터미널이나 Claude Code '!' 입력으로 실행 ──
//   node harness/scripts/verify.mjs proceed <slug>   # G1·G2 통과 후 사용자가 "진행해"라고 했을 때
//   node harness/scripts/verify.mjs unblock <slug>   # 연속 실패 차단 해제
//   node harness/scripts/verify.mjs sign <slug>      # approval.md 를 사람이 확인했다는 서명 (없으면 g3-approval 대기)
//   node harness/scripts/verify.mjs reopen <slug> --from <g1|g2|g3>   # 승인 전 수정 → 재판정
//
// 종료 코드: 0 통과 · 1 실패/대기 · 2 사용법·전제 오류 · 3 차단(같은 게이트 연속 실패 한도)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { fnv, buildFigmaCode } from "./figma-code.mjs";

const HARNESS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(HARNESS_DIR, "..");
const R = YAML.parse(fs.readFileSync(path.join(HARNESS_DIR, "rules.yaml"), "utf8"));
// HARNESS_RUNS 는 테스트 전용: tests/.tmp 안을 가리킬 때만 따른다 (3차 보강 — 환경변수로 다른 runs 를 기준 삼는 우회 차단)
const _envRuns = process.env.HARNESS_RUNS ? path.resolve(process.env.HARNESS_RUNS) : null;
const _testRoot = path.join(ROOT, "tests", ".tmp");
const RUNS = _envRuns && (_envRuns === _testRoot || _envRuns.startsWith(_testRoot + path.sep)) ? _envRuns : path.join(ROOT, R.run.runs_dir);

// ───────────────────────────── 공통 도구
const out = (s = "") => process.stdout.write(s + "\n");
const die = (code, msg) => { out(msg); process.exit(code); };
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);
const sha = (s) => crypto.createHash("sha256").update(s ?? "").digest("hex").slice(0, 16);

// fnv·검사 로직·Figma 코드 생성은 figma-code.mjs / figma-check.lib.js 공용

// 마크다운 섹션: "## 제목" 아래 다음 "## " 전까지
function section(md, title) {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${title}\\s*$`).test(l.trim()));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s+/.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}
// "### X" 블록들
function blocks(md, headingRe) {
  const re = new RegExp(headingRe);
  const lines = md.split("\n");
  const res = [];
  let cur = null;
  for (const l of lines) {
    const m = l.match(re);
    if (m) { cur = { m, body: [] }; res.push(cur); continue; }
    if (/^#{2,3}\s+/.test(l)) { cur = null; continue; }
    if (cur) cur.body.push(l);
  }
  return res.map((b) => ({ m: b.m, body: b.body.join("\n") }));
}
const placeholderHits = (md) => md.match(new RegExp(R.run.placeholder_pattern, "g")) ?? [];

// ───────────────────────────── 상태
const runDir = (slug) => path.join(RUNS, slug);
const statePath = (slug) => path.join(runDir(slug), "state.json");
function loadState(slug) {
  if (!new RegExp(R.run.slug_pattern).test(slug ?? "")) die(2, `❗ slug 형식 오류: ${slug} (${R.run.slug_pattern})`);
  const s = read(statePath(slug));
  if (!s) die(2, `❗ runs/${slug}/state.json 이 없습니다. 먼저 'verify.mjs init ${slug} --topic "..."' 을 실행하세요.`);
  return JSON.parse(s);
}
function saveState(slug, st) {
  st.updated = new Date().toISOString();
  fs.writeFileSync(statePath(slug), JSON.stringify(st, null, 2) + "\n");
}
const currentGate = (st) => R.gates.order.find((g) => !st.passed.includes(g)) ?? null;
const dirOf = (g) => R.gates.dirs[g];

// ───────────────────────────── G1 진단
function checkG1(slug) {
  const v = [];
  const dir = path.join(runDir(slug), dirOf("g1"));
  const C = R.g1;
  for (const f of C.files) if (!fs.existsSync(path.join(dir, f))) v.push(`필수 파일 없음: ${dirOf("g1")}/${f}`);
  if (v.length) return v;
  const dx = read(path.join(dir, "diagnosis.md"));
  const rf = read(path.join(dir, "references.md"));
  for (const [n, md] of [["diagnosis.md", dx], ["references.md", rf]]) {
    const ph = placeholderHits(md);
    if (ph.length) v.push(`${n}: 템플릿 미작성 표시 ${ph.length}개 (${ph.slice(0, 3).join(", ")})`);
  }
  const ds = blocks(dx, C.diagnosis.heading);
  if (ds.length < C.diagnosis.min) v.push(`diagnosis.md: 문제점(### D<n>.) ${ds.length}개 < 최소 ${C.diagnosis.min}개`);
  for (const d of ds) {
    for (const req of C.diagnosis.required_lines)
      if (!new RegExp(req, "m").test(d.body)) v.push(`diagnosis.md D${d.m[1]}: '${req.replace(/\\s\*\[:：\]/, "")}:' 줄 없음`);
    const p = d.body.match(/관점\s*[:：]\s*(.+)/);
    if (p && !C.diagnosis.perspectives.some((k) => p[1].includes(k)))
      v.push(`diagnosis.md D${d.m[1]}: 관점은 ${C.diagnosis.perspectives.join("/")} 중 하나여야 함 (현재: ${p[1].trim()})`);
  }
  const refs = blocks(rf, C.references.heading);
  if (refs.length < C.references.min) v.push(`references.md: 레퍼런스(### R<n>. 앱명 — 화면) ${refs.length}개 < 최소 ${C.references.min}개`);
  const apps = {};
  for (const r of refs) {
    if (!new RegExp(C.references.url_pattern).test(r.body)) v.push(`references.md R${r.m[1]}: uibowl.io 링크 없음`);
    const app = r.m[2].trim().toLowerCase();
    apps[app] = (apps[app] ?? 0) + 1;
  }
  for (const [a, n] of Object.entries(apps)) if (n > C.references.max_same_app) v.push(`references.md: 같은 앱 '${a}' ${n}개 > 최대 ${C.references.max_same_app}개`);
  const refIds = new Set(refs.map((r) => r.m[1]));
  const pts = blocks(rf, C.points.heading);
  if (pts.length < C.points.min) v.push(`references.md: 반영 포인트(### RP-<n>.) ${pts.length}개 < 최소 ${C.points.min}개`);
  for (const p of pts) {
    const s = p.body.match(new RegExp(C.points.source_pattern));
    if (!s) v.push(`references.md RP-${p.m[1]}: '출처: R<n>' 없음`);
    else if (!refIds.has(s[1])) v.push(`references.md RP-${p.m[1]}: 출처 R${s[1]} 이 레퍼런스 목록에 없음`);
  }
  return v;
}

// ───────────────────────────── G2 설계
function checkG2(slug) {
  const v = [];
  const C = R.g2;
  const md = read(path.join(runDir(slug), dirOf("g2"), "screen-spec.md"));
  if (!md) return [`필수 파일 없음: ${dirOf("g2")}/screen-spec.md`];
  const ph = placeholderHits(md);
  if (ph.length) v.push(`screen-spec.md: 템플릿 미작성 표시 ${ph.length}개 (${ph.slice(0, 3).join(", ")})`);
  for (const s of C.required_sections) if (section(md, s) === null) v.push(`screen-spec.md: 필수 섹션 '## ${s}' 없음`);
  const us = section(md, "연결 유저스토리") ?? "";
  if (!new RegExp(C.story_pattern).test(us)) v.push(`screen-spec.md: 연결 유저스토리에 US-1~US-5 가 하나도 없음`);
  // ★1 가동 정지
  const st = section(md, C.stop_status.section) ?? "";
  const stopLines = st.split("\n").filter((l) => l.includes(C.stop_status.keyword));
  if (!stopLines.length) v.push(`★1 상태 섹션에 '${C.stop_status.keyword}' 행 없음`);
  else if (!stopLines.some((l) => C.stop_status.must_include.every((k) => l.includes(k))))
    v.push(`★1 '${C.stop_status.keyword}' 행에 ${C.stop_status.must_include.join("·")} 표현이 함께 있어야 함 (색만으로 표시 금지)`);
  // ★2 기록 수정 금지
  const comp = section(md, C.record_immutable.section) ?? "";
  comp.split("\n").forEach((l, i) => {
    if (!l.includes(C.record_immutable.trigger)) return;
    const bad = C.record_immutable.forbidden.filter((w) => l.replace(new RegExp(`${C.record_immutable.allowed_if}[^|]*`, "g"), "").includes(w));
    if (bad.length) v.push(`★2 화면 구성 ${i + 1}행: 제출 기록에 '${bad.join("·")}' 액션 금지 ("정정 기록 남기기"만 허용) → ${l.trim().slice(0, 80)}`);
  });
  // 임의 기획 방지
  md.split("\n").forEach((l, i) => {
    for (const k of C.excluded_keywords)
      if (l.includes(k) && !l.includes(C.proposal_tag) && !C.excluded_ok_words.some((w) => l.includes(w)))
        v.push(`임의 기획: ${i + 1}줄 '${k}' 는 MVP 제외 기능 — '${C.proposal_tag}' 표기와 근거가 필요함`);
  });
  return v;
}

// ───────────────────────────── Figma (G3·G4·G5 공통)
function loadExport(slug, gate, digestArg) {
  const p = path.join(runDir(slug), dirOf(gate === "g5" ? "g4" : gate), R.figma.export_file);
  const raw = read(p);
  if (!raw) return { err: [`필수 파일 없음: ${path.relative(runDir(slug), p)} ('verify.mjs figma-code ${gate} ${slug} --mode export' 코드를 Figma에서 실행한 결과)`] };
  let ex;
  try { ex = JSON.parse(raw); } catch { return { err: [`${R.figma.export_file}: JSON 아님`] }; }
  if (ex.version !== 2 || !Array.isArray(ex.violations)) return { err: [`${R.figma.export_file}: 형식이 다릅니다 (version 2 필요). figma-code 로 다시 뽑으세요.`] };
  const v = [];
  // 4차: export·지문은 이 실행의 Figma 파일(state.fileKey)에서 나와야 함 — 다른(위반 없는) 파일에서 뽑은 export 차단
  const stFile = loadState(slug).fileKey;
  if (!stFile || ex.fileKey !== stFile) v.push(`export 가 이 실행의 Figma 파일(${stFile})이 아닌 다른 파일(${ex.fileKey ?? "없음"})에서 나왔습니다.`);
  const summary = { frames: ex.frames, localComponents: ex.localComponents, violationCount: ex.violationCount, violations: ex.violations };
  const tail = fnv(JSON.stringify(summary));
  if (!String(ex.digest ?? "").endsWith(`-${tail}`)) v.push(`export 지문 불일치: 파일 안 요약(프레임·위반 목록)이 Figma가 계산한 값과 다름 — export를 손으로 고쳤을 수 있음`);
  if (R.figma.require_digest) {
    if (!digestArg) return { err: [`--figma-digest 가 필요합니다. judge가 'verify.mjs figma-code ${gate} ${slug}' 코드를 Figma에서 실행한 값을 넘기세요.`], usage: true };
    // 지문 값은 메시지에 싣지 않는다 — 틀린 값을 넣어 정답을 알아내는 길을 막음 (3차 보강)
    if (digestArg !== ex.digest) v.push(`Figma 실물 지문 ≠ export 지문 — export 이후 Figma가 바뀌었거나 다른 파일입니다. export를 다시 뽑으세요.`);
    // 지문 출처 확인 (3차 보강): judge 의 use_figma 결과를 PostToolUse hook(record-judge-digest.mjs)이 기록한 값과 같아야 하고, export 저장 뒤에 계산된 것이어야 함
    if (R.figma.require_judge_record) {
      const page = gate === "g3" ? R.g3.page : R.g4.page;
      let rec; try { rec = JSON.parse(read(path.join(RUNS, R.figma.judge_record_file)) || "{}")[`${ex.fileKey}::${page}`]; } catch {}
      if (!rec) v.push(`judge 가 Figma 에서 계산한 지문 기록이 없습니다 — judge 가 'figma-code ${gate} ${slug}' 코드를 use_figma 로 직접 실행해야 합니다.`);
      else if (rec.digest !== digestArg) v.push(`넘긴 지문이 judge 의 Figma 실행 기록과 다릅니다 — 다른 곳에서 받은 값은 쓸 수 없습니다.`);
      else if (Date.parse(rec.at) < fs.statSync(p).mtimeMs - 1000) v.push(`judge 지문 기록이 export 저장보다 먼저입니다 — export 를 저장한 뒤 judge 가 다시 계산해야 합니다.`);
    }
  }
  v.push(...ex.violations);
  if (ex.violationCount > ex.violations.length) v.push(`(위반 ${ex.violationCount - ex.violations.length}건 더 있음 — 앞의 것부터 고치세요)`);
  return { ex, v };
}

function checkG3(slug, digestArg) {
  const { ex, v = [], err, usage } = loadExport(slug, "g3", digestArg);
  if (err) return { v: err, usage };
  const C = R.g3;
  if (ex.page !== C.page) v.push(`export 페이지가 '${C.page}' 가 아님 (${ex.page})`);
  if (ex.frames.length !== C.frames.count) v.push(`시안 프레임 ${ex.frames.length}개 ≠ ${C.frames.count}개`);
  for (const pre of C.frames.name_prefixes) {
    const f = ex.frames.filter((x) => x.name.startsWith(pre));
    if (f.length !== 1) v.push(`시안 프레임 '${pre}…' ${f.length}개 (정확히 1개 필요)`);
  }
  for (const f of ex.frames) {
    if (f.width !== C.frames.size[0] || f.height < C.frames.size[1]) v.push(`[${f.name}] 크기 ${f.width}×${f.height} — 너비 ${C.frames.size[0]}, 높이 ${C.frames.size[1]} 이상`);
    if (f.mode !== "Light") v.push(`[${f.name}] 시안은 Light 모드 (현재 ${f.mode})`);
  }
  const md = read(path.join(runDir(slug), dirOf("g3"), C.concepts.file));
  if (!md) v.push(`필수 파일 없음: ${dirOf("g3")}/${C.concepts.file}`);
  else {
    const ph = placeholderHits(md);
    if (ph.length) v.push(`${C.concepts.file}: 템플릿 미작성 표시 ${ph.length}개`);
    const cs = blocks(md.replace(/^##\s+시안/gm, "### 시안"), C.concepts.concept_heading.replace("^##", "^###"));
    for (const k of C.frames.name_prefixes.map((p) => p.replace(/-$/, ""))) {
      const c = cs.find((x) => x.m[1] === k);
      if (!c) { v.push(`${C.concepts.file}: '## 시안 ${k}' 없음`); continue; }
      const n = c.body.split("\n").filter((l) => new RegExp(C.concepts.solved_pattern).test(l)).length;
      if (n < C.concepts.min_solved) v.push(`${C.concepts.file} 시안 ${k}: '해결한 문제:' ${n}개 < ${C.concepts.min_solved}개`);
    }
    if (!new RegExp(C.concepts.proposal_section, "m").test(md)) v.push(`${C.concepts.file}: '## 추가 제안' 섹션 없음 (없으면 "없음"이라고 적기)`);
  }
  return { v };
}

function lockCheck(slug, st) {
  if (!st.approval) return [`승인 기록 없음 — g3-approval 을 먼저 통과해야 함`];
  // 잠금 대상이 승인 기록에 없으면 건너뛰지 않고 실패 (3차 보강: fail-closed) — 사람이 다시 승인해야 함
  const missing = R.g3_approval.lock_files.filter((f) => !(f in st.approval.hashes));
  if (missing.length) return [`🔒 승인 기록에 ${missing.join(", ")} 잠금이 없습니다. 이 승인은 지금 규칙으로 잠기지 않았으므로 사람이 approval.md 를 다시 확인한 뒤 g3-approval 을 다시 판정하세요.`];
  const files = R.g3_approval.lock_files;
  const now = Object.fromEntries(files.map((f) => [f, sha(read(path.join(runDir(slug), f)))]));
  const changed = Object.keys(now).filter((f) => now[f] !== st.approval.hashes[f]);
  if (!changed.length) return [];
  // 승인 무효 처리
  const ap = path.join(runDir(slug), dirOf("g3"), R.g3_approval.file);
  if (fs.existsSync(ap)) {
    let n = 1; while (fs.existsSync(path.join(runDir(slug), dirOf("g3"), `approval-stale-${n}.md`))) n++;
    fs.renameSync(ap, path.join(runDir(slug), dirOf("g3"), `approval-stale-${n}.md`));
  }
  st.passed = st.passed.filter((g) => !["g3-approval", "g4", "g5"].includes(g));
  st.approval = null;
  st.log.push({ at: new Date().toISOString(), event: "approval-stale", changed });
  saveState(slug, st);
  return [`🔒 승인 무효: 승인 뒤에 ${changed.join(", ")} 이(가) 바뀌었습니다. approval.md 를 보관하고 g3-approval 로 돌아갑니다.`];
}

function checkG4(slug, st, digestArg) {
  const lock = lockCheck(slug, st);
  if (lock.length) return { v: lock, lock: true };
  const { ex, v = [], err, usage } = loadExport(slug, "g4", digestArg);
  if (err) return { v: err, usage };
  const C = R.g4;
  if (ex.page !== C.page) v.push(`export 페이지가 '${C.page}' 가 아님 (${ex.page})`);
  for (const req of C.frames.required) {
    const f = ex.frames.filter((x) => x.name.endsWith(req.name));
    if (f.length !== 1) { v.push(`프레임 '…${req.name}' ${f.length}개 (정확히 1개 필요)`); continue; }
    const fr = f[0];
    if (fr.width !== req.size[0] || fr.height < req.size[1]) v.push(`[${fr.name}] 크기 ${fr.width}×${fr.height} — 너비 ${req.size[0]}, 높이 ${req.size[1]} 이상`);
    if (fr.mode !== req.mode) v.push(`[${fr.name}] 모드 ${fr.mode} ≠ ${req.mode}`);
  }
  const sm = read(path.join(runDir(slug), dirOf("g4"), C.screens_file));
  if (!sm) v.push(`필수 파일 없음: ${dirOf("g4")}/${C.screens_file}`);
  else if (placeholderHits(sm).length) v.push(`${C.screens_file}: 템플릿 미작성 표시 ${placeholderHits(sm).length}개`);
  return { v };
}

// G5 전용: 확장 결과가 승인된 시안과 이어지는지, 화면 목록이 Figma 실물과 같은지
function checkG5Extra(slug, st) {
  const v = [];
  const sm = read(path.join(runDir(slug), dirOf("g4"), R.g4.screens_file)) ?? "";
  const ex = JSON.parse(read(path.join(runDir(slug), dirOf("g4"), R.figma.export_file)) ?? "{}");
  const pick = sm.match(/선택안\s*[:：]\s*([ABC])\b/)?.[1];
  if (!st.approval) v.push("승인 기록 없음");
  else if (pick !== st.approval.choice) v.push(`screens.md 선택안(${pick ?? "없음"}) ≠ 승인한 시안(${st.approval.choice})`);
  for (const f of ex.frames ?? []) if (!sm.includes(f.id)) v.push(`screens.md 에 Figma 프레임 '${f.name}'(${f.id}) 이 없음 — 화면 목록과 실물이 다름`);
  return v;
}

function checkApproval(slug, st) {
  const C = R.g3_approval;
  const p = path.join(runDir(slug), dirOf("g3"), C.file);
  const md = read(p);
  if (!md) return { wait: true, v: [`⏳ 시안 선택 대기: runs/${slug}/p3-concept/approval.md 를 사람이 작성해야 합니다 (템플릿: harness/templates/approval.md).`] };
  if (placeholderHits(md).length) return { wait: true, v: [`⏳ approval.md 에 템플릿 미작성 표시가 남아 있습니다.`] };
  const choice = md.match(new RegExp(C.choice_pattern))?.[1];
  const verdict = md.match(new RegExp(C.verdict_pattern))?.[1];
  if (!choice || !verdict) return { wait: true, v: [`⏳ approval.md 에 '선택: A|B|C' 와 '판정: 승인|반려' 가 있어야 합니다.`] };
  if (verdict === "승인" && choice === "없음") return { wait: true, v: [`⏳ 승인하려면 선택: A|B|C 중 하나가 필요합니다.`] };
  // 사람 서명 (3차 보강): approval.md 를 누가 썼든, 사람이 '! node harness/scripts/verify.mjs sign <slug>' 로 지금 내용을 확인해야 판정한다 (sign 은 에이전트가 실행 불가)
  if (!st.signed || st.signed.hash !== sha(md)) return { wait: true, v: [`⏳ 사람 서명 대기: 사용자가 approval.md 내용을 확인한 뒤 직접 '! node harness/scripts/verify.mjs sign ${slug}' 를 실행해야 합니다.${st.signed ? " (서명 뒤 approval.md 가 바뀌었습니다)" : ""}`] };
  if (verdict === "승인") {
    const hashes = Object.fromEntries(C.lock_files.map((f) => [f, sha(read(path.join(runDir(slug), f)))]));
    st.approval = { choice, at: new Date().toISOString(), hashes };
    return { pass: true, v: [`✅ 시안 ${choice} 승인 — 설계·시안·승인 파일 잠금`] };
  }
  const reason = md.match(new RegExp(C.reason_pattern))?.[1];
  if (!reason) return { wait: true, v: [`⏳ 반려일 때는 '반려 사유 분류: 방향|문제 정의' 가 필요합니다.`] };
  const back = C.return_to[reason];
  let n = 1; while (fs.existsSync(path.join(runDir(slug), dirOf("g3"), `approval-rejected-${n}.md`))) n++;
  fs.renameSync(p, path.join(runDir(slug), dirOf("g3"), `approval-rejected-${n}.md`));
  st.signed = null;
  const drop = back === "g2" ? ["g2", "g3"] : ["g3"];
  st.passed = st.passed.filter((g) => !drop.includes(g));
  st.log.push({ at: new Date().toISOString(), event: "rejected", reason, back });
  return { rejected: true, v: [`↩️ 반려(${reason}) — approval-rejected-${n}.md 로 보관, ${back} 로 돌아갑니다.`] };
}

// ───────────────────────────── QA 리포트 (스크립트만 씀)
function writeReport(slug, st, v, digest) {
  const dir = path.join(runDir(slug), R.g5.report_dir);
  fs.mkdirSync(dir, { recursive: true });
  const lines = [
    `# P5 QA 리포트 — ${st.topic}`,
    ``,
    `> 이 파일은 verify.mjs 가 작성합니다. 손으로 고치지 마세요.`,
    ``,
    `| 항목 | 값 |`,
    `| --- | --- |`,
    `| 실행 | runs/${slug} |`,
    `| 선택 시안 | ${st.approval?.choice ?? "-"} |`,
    `| Figma 지문 | ${digest ?? "-"} |`,
    `| 판정 시각 | ${new Date().toISOString()} |`,
    `| 결과 | ${v.length ? `❌ 위반 ${v.length}건` : "✅ 통과"} |`,
    ``,
    `## 검사 범위`,
    `- 프레임 6종(Web·Tablet·Mobile × Light·Dark) 크기·모드`,
    `- 색 변수 연결·허용 변수, 텍스트 스타일, 간격·모서리, 현장 터치 영역`,
    `- ★1 가동 정지 아이콘+텍스트, DS 없음 표기, 승인 잠금`,
    `- ⑨ 프레임별 [시각화] 요소, ⑩ 상태 색 테두리 금지, ⑪ [시각화] 밖 반투명 금지, ⑫ [주목] 영역 1개`,
    ``,
    `## 위반`,
    ...(v.length ? v.map((x) => `- ${x}`) : ["- 없음"]),
    ``,
  ];
  fs.writeFileSync(path.join(dir, R.g5.report_file), lines.join("\n"));
}

// ───────────────────────────── 명령
const [cmd, a1, a2, ...rest] = process.argv.slice(2);
const flag = (name, arr) => { const i = arr.indexOf(name); return i >= 0 ? arr[i + 1] : undefined; };

function finish(slug, st, gate, res) {
  if (res.usage) die(2, `❗ ${res.v.join("\n")}`);
  if (res.wait) { saveState(slug, st); die(1, res.v.join("\n")); }
  if (res.rejected || res.lock) { saveState(slug, st); die(1, res.v.join("\n") + `\n복귀: ${currentGate(st)}`); }
  const v = res.v ?? [];
  if (res.pass || !v.length) {
    st.passed.push(gate);
    st.attempts[gate] = 0;
    if (R.gates.review_after.includes(gate)) st.awaiting = gate;
    if (gate === "g5") st.done = true;
    st.log.push({ at: new Date().toISOString(), event: "pass", gate });
    saveState(slug, st);
    out(`✅ ${gate} 통과 (runs/${slug})`);
    for (const x of res.v ?? []) if (x.startsWith("✅")) out(x);
    if (st.awaiting) out(`⏸ 사용자 확인 대기 — 결과를 보여드리고 "진행해"를 들은 뒤 'verify.mjs proceed ${slug}'`);
    else if (!st.done) out(`다음 게이트: ${currentGate(st)}`);
    else out(`🎉 하네스 완료 — 사용자에게 최종 확인을 받으세요.`);
    process.exit(0);
  }
  st.attempts[gate] = (st.attempts[gate] ?? 0) + 1;
  st.log.push({ at: new Date().toISOString(), event: "fail", gate, count: v.length });
  const blocked = st.attempts[gate] >= R.run.max_attempts;
  if (blocked) st.blocked = gate;
  saveState(slug, st);
  out(`❌ ${gate} 실패 — 위반 ${v.length}건 (연속 실패 ${st.attempts[gate]}/${R.run.max_attempts})`);
  for (const x of v) out(`- ${x}`);
  out(`복귀: ${gate === "g5" ? "g4 수정 후 g5 재판정" : gate}`);
  if (blocked) die(3, `🛑 차단: ${gate} 연속 ${R.run.max_attempts}회 실패. 사용자에게 보고하고, 사용자가 요청하면 'verify.mjs unblock ${slug}'.`);
  process.exit(1);
}

if (cmd === "init") {
  const slug = a1;
  if (!new RegExp(R.run.slug_pattern).test(slug ?? "")) die(2, `❗ slug 형식 오류: ${slug}`);
  const topic = flag("--topic", [a2, ...rest]);
  if (!topic) die(2, `❗ --topic "<화면 주제>" 가 필요합니다.`);
  if (fs.existsSync(statePath(slug))) die(2, `❗ runs/${slug} 는 이미 있습니다. 'status ${slug}' 로 확인하세요.`);
  const figma = flag("--figma", [a2, ...rest]) ?? null;
  if (R.figma.require_judge_record && !figma?.match(/figma\.com\/(?:design|file)\/[A-Za-z0-9]+/)) die(2, `❗ --figma <작업 파일 URL> 이 필요합니다 (지문을 이 파일에 묶기 위해).`); // 5차
  for (const g of R.gates.order) if (dirOf(g)) fs.mkdirSync(path.join(runDir(slug), dirOf(g)), { recursive: true });
  const st = { slug, topic, figma, fileKey: figma?.match(/figma\.com\/(?:design|file)\/([A-Za-z0-9]+)/)?.[1] ?? null,
    created: new Date().toISOString(), passed: [], attempts: {}, awaiting: null, blocked: null, approval: null, done: false, log: [] };
  saveState(slug, st);
  die(0, `✅ runs/${slug} 생성 — 다음 게이트: g1 (researcher)`);
}

if (cmd === "status") {
  const st = loadState(a1);
  out(`실행: runs/${a1} · 주제: ${st.topic}`);
  out(`통과: ${st.passed.join(" → ") || "-"}`);
  out(`현재 게이트: ${st.done ? "완료" : currentGate(st)}${st.awaiting ? ` (⏸ ${st.awaiting} 통과 후 사용자 확인 대기)` : ""}${st.blocked ? ` (🛑 ${st.blocked} 차단)` : ""}`);
  out(`연속 실패: ${JSON.stringify(st.attempts)}`);
  if (st.approval) out(`승인: 시안 ${st.approval.choice} (${st.approval.at})`);
  process.exit(0);
}

if (cmd === "sign") {
  // 사람 전용: approval.md 를 사람이 확인했다는 서명 (내용 해시를 기록 — 이후 바뀌면 다시 서명)
  const st = loadState(a1);
  const md = read(path.join(runDir(a1), dirOf("g3"), R.g3_approval.file));
  if (!md) die(2, `❗ runs/${a1}/p3-concept/approval.md 가 없습니다.`);
  st.signed = { hash: sha(md), at: new Date().toISOString() };
  st.log.push({ at: st.signed.at, event: "signed" });
  saveState(a1, st);
  die(0, `✍️ approval.md 서명 완료 — 이제 judge 가 g3-approval 을 판정합니다.`);
}

if (cmd === "proceed") {
  const st = loadState(a1);
  if (!st.awaiting) die(2, `❗ 확인 대기 중이 아닙니다.`);
  out(`▶ ${st.awaiting} 확인 완료 — 다음 게이트: ${currentGate(st)}`);
  st.awaiting = null;
  saveState(a1, st);
  process.exit(0);
}

if (cmd === "reopen") {
  // 확인 대기 중 사용자가 수정을 요청했을 때: 해당 게이트와 그 뒤를 다시 연다. 승인 이후 게이트는 열 수 없다(승인 잠금).
  const st = loadState(a1);
  const from = flag("--from", [a2, ...rest]);
  const reopenable = R.gates.reopenable ?? R.gates.review_after;
  if (!reopenable.includes(from)) die(2, `❗ reopen 은 ${reopenable.join("|")} 만 가능합니다 (승인 이후는 반려 절차로).`);
  if (!st.passed.includes(from)) die(2, `❗ ${from} 은(는) 아직 통과하지 않았습니다.`);
  if (st.passed.includes("g3-approval")) die(2, `❗ 승인 이후에는 reopen 할 수 없습니다. approval.md 반려 절차를 쓰세요.`);
  const i = R.gates.order.indexOf(from);
  st.passed = st.passed.filter((g) => R.gates.order.indexOf(g) < i);
  st.awaiting = null;
  st.log.push({ at: new Date().toISOString(), event: "reopen", from });
  saveState(a1, st);
  die(0, `↩️ ${from} 다시 열림 — runs/${a1}/${dirOf(from)}/ 수정 후 ${from} 재판정`);
}

if (cmd === "unblock") {
  const st = loadState(a1);
  if (!st.blocked) die(2, `❗ 차단 상태가 아닙니다.`);
  out(`🔓 ${st.blocked} 차단 해제 (연속 실패 초기화)`);
  st.attempts[st.blocked] = 0;
  st.blocked = null;
  saveState(a1, st);
  process.exit(0);
}

if (cmd === "figma-code") {
  const gate = a1, slug = a2;
  if (!R.gates.figma_gates.includes(gate)) die(2, `❗ figma-code 는 ${R.gates.figma_gates.join("|")} 만`);
  const st = loadState(slug);
  const mode = flag("--mode", rest) === "export" ? "export" : "digest";
  const pg = flag("--page", rest);
  const page = pg === "all" ? "*" : pg ?? (gate === "g3" ? R.g3.page : R.g4.page); // --page all = 모든 페이지 (게이트 밖 점검용)
  out(`fileKey: ${st.fileKey ?? "(state.json 에 fileKey 없음 — init --figma 로 지정)"}`);
  out(`===== use_figma code (${mode}, 한 글자도 바꾸지 말고 실행) =====`);
  out(buildFigmaCode({ mode, page }));
  process.exit(0);
}

if (R.gates.order.includes(cmd)) {
  const gate = cmd, slug = a1;
  const st = loadState(slug);
  if (st.done) die(2, `❗ runs/${slug} 는 완료된 실행입니다.`);
  if (st.blocked) die(3, `🛑 ${st.blocked} 차단 상태입니다. 사용자에게 보고하세요.`);
  const cur = currentGate(st);
  if (st.awaiting) die(2, `❗ ${st.awaiting} 통과 후 사용자 확인 대기 중입니다. 사용자가 "진행해"라고 하면 'verify.mjs proceed ${slug}'.`);
  if (gate !== cur) die(2, `❗ 지금 판정할 게이트는 ${cur} 입니다 (요청: ${gate}).`);
  const dg = flag("--figma-digest", [a2, ...rest]);
  if (gate === "g1") finish(slug, st, gate, { v: checkG1(slug) });
  if (gate === "g2") finish(slug, st, gate, { v: checkG2(slug) });
  if (gate === "g3") finish(slug, st, gate, checkG3(slug, dg));
  if (gate === "g3-approval") finish(slug, st, gate, checkApproval(slug, st));
  if (gate === "g4") finish(slug, st, gate, checkG4(slug, st, dg));
  if (gate === "g5") {
    const res = checkG4(slug, st, dg);
    if (res.usage || res.lock) finish(slug, st, gate, res);
    res.v = res.v.concat(checkG5Extra(slug, st)); // G5 에만 있는 검사
    writeReport(slug, st, res.v, dg);
    finish(slug, st, gate, res);
  }
}

die(2, `사용법: verify.mjs <init|status|proceed|unblock|reopen|sign|figma-code|${R.gates.order.join("|")}> <slug> ...`);
