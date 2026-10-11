#!/usr/bin/env node
// PreToolUse hook (Write|Edit|MultiEdit|NotebookEdit) — 하네스 저장 권한 강제
// 1) 서브에이전트는 runs/ 에 쓰지 않는다 (=== FILE: … === 블록으로 반환)
// 2) state.json · qa-report.md 는 스크립트만, approval.md 는 사람만
// 3) runs/<slug>/ 안에서는 현재 게이트 폴더에만 쓴다
// 4) 규칙·hook·저장소 설정(rules.yaml guard.always_protected: .git · CLAUDE.md · .claude · harness · docs · tests …)은
//    실행 중에는 아무도, 실행 중이 아닐 때도 사람이 HARNESS_DEV=1 로 띄운 세션에서만 고친다 (4차: .git/config 로 명령 실행 우회 차단)
// 5) 입력을 읽지 못하거나 규칙 파일을 못 읽으면 막는다 (fail-closed)
// 차단: exit 2 + stderr. Bash 로 쓰는 경로는 guard-bash.mjs 가 막는다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";


const HARNESS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(HARNESS_DIR, "..");
const deny = (m) => { process.stderr.write(`[harness guard] ${m}\n`); process.exit(2); };

let input;
try { input = JSON.parse(fs.readFileSync(0, "utf8")); } catch { deny("hook 입력을 읽지 못해 안전하게 막습니다."); }
let YAML;
try { YAML = (await import("yaml")).default; } catch { deny("yaml 패키지가 없어 규칙을 확인할 수 없습니다. 'cd harness && npm install' 후 다시 시도하세요."); }
const fp = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
if (!fp) process.exit(0);

let R;
try { R = YAML.parse(fs.readFileSync(path.join(HARNESS_DIR, "rules.yaml"), "utf8")); } catch { deny("rules.yaml 을 읽지 못해 안전하게 막습니다."); }
// HARNESS_RUNS 는 테스트 전용: tests/.tmp 안을 가리킬 때만 따른다 (3차 보강 — 환경변수로 다른 runs 를 기준 삼는 우회 차단)
const _envRuns = process.env.HARNESS_RUNS ? path.resolve(process.env.HARNESS_RUNS) : null;
const _testRoot = path.join(ROOT, "tests", ".tmp");
const RUNS = _envRuns && (_envRuns === _testRoot || _envRuns.startsWith(_testRoot + path.sep)) ? _envRuns : path.join(ROOT, R.run.runs_dir);
// 경로 비교 (3차 보강): 실제 경로(심볼릭 링크 해석) + 대소문자 무시 — macOS 기본 파일 시스템에서 RUNS/·Approval.md 같은 변형으로 우회하지 못하게
const realish = (p) => { let cur = p, tail = []; while (cur !== path.dirname(cur)) { try { return path.join(fs.realpathSync(cur), ...tail.reverse()); } catch { tail.push(path.basename(cur)); cur = path.dirname(cur); } } return p; };
const low = (p) => realish(p).toLowerCase();
const abs = path.resolve(input.cwd ?? ROOT, fp);
const absL = low(abs);
const inside = (dir) => { const r = path.relative(low(dir), absL); return !r.startsWith("..") && !path.isAbsolute(r) ? r : null; };

const states = fs.existsSync(RUNS)
  ? fs.readdirSync(RUNS).map((s) => { try { return JSON.parse(fs.readFileSync(path.join(RUNS, s, "state.json"), "utf8")); } catch { return null; } }).filter(Boolean)
  : [];
const active = states.filter((s) => !s.done);

// 4b) 실행 중에는 저장소 밖의 Claude Code 설정(~/.claude/ 의 agents·settings 등)도 고치지 않는다 — 에이전트 정의를 바꿔 hook 을 피하는 길 차단
// 5차: 실행 여부와 무관하게 — 실행 전에 disableAllHooks 를 심어 두고 init 하는 길 차단 (~/.claude/, ~/.claude.json)
if (inside(ROOT) === null && (absL.split(path.sep).includes(".claude") || /^\.claude.*\.json$/.test(path.basename(absL))))
  deny(`저장소 밖 Claude Code 설정(.claude/ · .claude*.json)은 에이전트가 고치지 않습니다: ${abs}`);
// 4)
const relRoot = inside(ROOT);
if (relRoot !== null && inside(RUNS) === null) {
  const top = relRoot.split(path.sep)[0];
  if (R.guard.always_protected.some((p) => p.toLowerCase() === top)) {
    if (active.length) deny(`실행 중인 하네스가 있습니다(${active.map((s) => s.slug).join(", ")}). 실행 중에는 ${top} 을(를) 고치지 않습니다. 규칙을 바꾸려면 사용자에게 먼저 알리고, 실행을 마치거나 runs/<slug> 를 보관한 뒤 고치세요.`);
    if (process.env[R.guard.dev_env] !== "1") deny(`${top} 은(는) 규칙·hook·저장소 설정입니다. 사람이 '${R.guard.dev_env}=1 claude' 로 띄운 세션에서만 (실행 중이 아닐 때) 고칠 수 있습니다.`);
  }
}

const rel = inside(RUNS);
if (rel === null) process.exit(0);
if (input.agent_type) deny(`서브에이전트(${input.agent_type})는 runs/ 에 쓰지 않습니다. 산출물은 === FILE: <파일명> === 블록으로 반환하세요.`); // 1)
const base = path.basename(absL);
if (base === String(R.figma.judge_record_file).toLowerCase()) deny(`${R.figma.judge_record_file} 은(는) judge 의 Figma 실행을 hook 이 기록하는 파일입니다.`);
if (base === "state.json" || base === R.g5.report_file.toLowerCase()) deny(`${base} 은(는) verify.mjs 만 씁니다.`); // 2)
if (base === "approval.md" || /^approval-(stale|rejected)-\d+\.md$/.test(base)) deny(`approval.md 는 사람만 작성합니다 (하네스의 유일한 사람 승인 지점).`);

const [slugL, dirL] = rel.split(path.sep);
const st = states.find((s) => s.slug.toLowerCase() === slugL);
const slug = st?.slug ?? slugL, dir = dirL;
if (!st) deny(`runs/${slug} 에 state.json 이 없습니다. 'verify.mjs init ${slug} --topic "..."' 을 먼저 실행하세요.`);
if (st.done) deny(`runs/${slug} 는 완료된 실행입니다.`);
if (st.awaiting || st.blocked) deny(`runs/${slug} 는 ${st.awaiting ? `${st.awaiting} 통과 후 사용자 확인 대기` : `${st.blocked} 차단`} 중입니다. 사용자 지시(proceed·reopen·unblock) 전에는 산출물을 쓰지 않습니다.`); // 5차
const cur = R.gates.order.find((g) => !st.passed.includes(g));
const allowed = R.gates.dirs[cur];
if (!allowed) deny(`지금 게이트(${cur})에는 저장할 산출물이 없습니다.`);
if (dir !== allowed.toLowerCase() || path.relative(path.join(RUNS, slug, allowed), abs).startsWith("..")) deny(`지금 게이트는 ${cur} 입니다. runs/${slug}/${allowed}/ 에만 저장할 수 있습니다 (요청: ${dir}/).`); // 3)
process.exit(0);
