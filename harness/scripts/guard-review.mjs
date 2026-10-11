#!/usr/bin/env node
// PreToolUse hook (Agent|Task) — 사용자 확인 대기·차단 중에는 작업 에이전트를 부르지 않는다.
// judge 는 막지 않는다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HARNESS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(HARNESS_DIR, "..");
let input;
try { input = JSON.parse(fs.readFileSync(0, "utf8")); } catch { process.stderr.write("[harness guard] hook 입력을 읽지 못해 안전하게 막습니다.\n"); process.exit(2); }
let R; // 3차 보강: yaml·규칙을 못 읽으면 막는다 (fail-closed)
try { const YAML = (await import("yaml")).default; R = YAML.parse(fs.readFileSync(path.join(HARNESS_DIR, "rules.yaml"), "utf8")); }
catch { process.stderr.write("[harness guard] rules.yaml 을 읽지 못해 안전하게 막습니다.\n"); process.exit(2); }
const agent = String(input?.tool_input?.subagent_type ?? "general-purpose");
// HARNESS_RUNS 는 테스트 전용: tests/.tmp 안을 가리킬 때만 따른다 (3차 보강 — 환경변수로 다른 runs 를 기준 삼는 우회 차단)
const _envRuns = process.env.HARNESS_RUNS ? path.resolve(process.env.HARNESS_RUNS) : null;
const _testRoot = path.join(ROOT, "tests", ".tmp");
const RUNS = _envRuns && (_envRuns === _testRoot || _envRuns.startsWith(_testRoot + path.sep)) ? _envRuns : path.join(ROOT, R.run.runs_dir);
if (!fs.existsSync(RUNS)) process.exit(0);
// 4차: 실행 중에는 하네스 에이전트(작업 에이전트 + judge)만 부른다 — general-purpose 등으로 역할·확인 대기를 우회하지 못하게
const active = fs.readdirSync(RUNS).filter((s) => { try { return !JSON.parse(fs.readFileSync(path.join(RUNS, s, "state.json"), "utf8")).done; } catch { return false; } });
if (active.length && ![...R.gates.work_agents, R.guard.judge_agent].includes(agent)) {
  process.stderr.write(`[harness guard] 실행 중인 하네스(${active.join(", ")})가 있습니다. 부를 수 있는 에이전트: ${[...R.gates.work_agents, R.guard.judge_agent].join(", ")} (요청: ${agent})\n`);
  process.exit(2);
}
if (!R.gates.work_agents.includes(agent)) process.exit(0);
const hold = [];
for (const s of fs.readdirSync(RUNS)) {
  try {
    const st = JSON.parse(fs.readFileSync(path.join(RUNS, s, "state.json"), "utf8"));
    if (st.awaiting) hold.push(`${s}: ${st.awaiting} 통과 후 사용자 확인 대기`);
    if (st.blocked) hold.push(`${s}: ${st.blocked} 차단`);
  } catch {}
}
if (hold.length) {
  process.stderr.write(`[harness guard] ${hold.join(" / ")} — ${agent} 를 부르지 않습니다. 사용자에게 결과를 보여주고 지시를 받은 뒤 'verify.mjs proceed <slug>' (차단은 'unblock').\n`);
  process.exit(2);
}
process.exit(0);
