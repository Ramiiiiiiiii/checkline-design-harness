#!/usr/bin/env node
// PreToolUse hook (Agent|Task) — 사용자 확인 대기·차단 중에는 작업 에이전트를 부르지 않는다.
// judge 는 막지 않는다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const HARNESS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(HARNESS_DIR, "..");
let input;
try { input = JSON.parse(fs.readFileSync(0, "utf8")); } catch { process.exit(0); }
const R = YAML.parse(fs.readFileSync(path.join(HARNESS_DIR, "rules.yaml"), "utf8"));
const agent = String(input?.tool_input?.subagent_type ?? "");
if (!R.gates.work_agents.includes(agent)) process.exit(0);
const RUNS = process.env.HARNESS_RUNS ? path.resolve(process.env.HARNESS_RUNS) : path.join(ROOT, R.run.runs_dir);
if (!fs.existsSync(RUNS)) process.exit(0);
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
