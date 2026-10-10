#!/usr/bin/env node
// PreToolUse hook (Write|Edit|MultiEdit) — 하네스 저장 권한 강제
// 1) 서브에이전트는 runs/ 에 쓰지 않는다 (=== FILE: … === 블록으로 반환)
// 2) state.json · qa-report.md 는 스크립트만, approval.md 는 사람만
// 3) runs/<slug>/ 안에서는 현재 게이트 폴더에만 쓴다
// 4) 진행 중인 실행이 있으면 docs/ 와 harness/ (규칙·템플릿·스크립트)를 고치지 않는다
// 차단: exit 2 + stderr. 한계: Bash 로 쓰는 파일은 보지 못한다 (CLAUDE.md 금지 사항).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const HARNESS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(HARNESS_DIR, "..");
const deny = (m) => { process.stderr.write(`[harness guard] ${m}\n`); process.exit(2); };

let input;
try { input = JSON.parse(fs.readFileSync(0, "utf8")); } catch { process.exit(0); }
const fp = input?.tool_input?.file_path;
if (!fp) process.exit(0);

const R = YAML.parse(fs.readFileSync(path.join(HARNESS_DIR, "rules.yaml"), "utf8"));
const RUNS = process.env.HARNESS_RUNS ? path.resolve(process.env.HARNESS_RUNS) : path.join(ROOT, R.run.runs_dir);
const abs = path.resolve(input.cwd ?? ROOT, fp);
const inside = (dir) => { const r = path.relative(dir, abs); return !r.startsWith("..") && !path.isAbsolute(r) ? r : null; };

const states = fs.existsSync(RUNS)
  ? fs.readdirSync(RUNS).map((s) => { try { return JSON.parse(fs.readFileSync(path.join(RUNS, s, "state.json"), "utf8")); } catch { return null; } }).filter(Boolean)
  : [];
const active = states.filter((s) => !s.done);

// 4)
if (active.length && (inside(path.join(ROOT, "docs")) !== null || inside(HARNESS_DIR) !== null))
  deny(`실행 중인 하네스가 있습니다(${active.map((s) => s.slug).join(", ")}). 실행 중에는 docs/ 와 harness/ 를 고치지 않습니다. 규칙을 바꾸려면 사용자에게 먼저 알리고, 실행을 마치거나 runs/<slug> 를 보관한 뒤 고치세요.`);

const rel = inside(RUNS);
if (rel === null) process.exit(0);
if (input.agent_type) deny(`서브에이전트(${input.agent_type})는 runs/ 에 쓰지 않습니다. 산출물은 === FILE: <파일명> === 블록으로 반환하세요.`); // 1)
const base = path.basename(abs);
if (base === "state.json" || base === R.g5.report_file) deny(`${base} 은(는) verify.mjs 만 씁니다.`); // 2)
if (base === "approval.md" || /^approval-(stale|rejected)-\d+\.md$/.test(base)) deny(`approval.md 는 사람만 작성합니다 (하네스의 유일한 사람 승인 지점).`);

const [slug, dir] = rel.split(path.sep);
const st = states.find((s) => s.slug === slug);
if (!st) deny(`runs/${slug} 에 state.json 이 없습니다. 'verify.mjs init ${slug} --topic "..."' 을 먼저 실행하세요.`);
if (st.done) deny(`runs/${slug} 는 완료된 실행입니다.`);
const cur = R.gates.order.find((g) => !st.passed.includes(g));
const allowed = R.gates.dirs[cur];
if (!allowed) deny(`지금 게이트(${cur})에는 저장할 산출물이 없습니다.`);
if (dir !== allowed) deny(`지금 게이트는 ${cur} 입니다. runs/${slug}/${allowed}/ 에만 저장할 수 있습니다 (요청: ${dir}/).`); // 3)
process.exit(0);
