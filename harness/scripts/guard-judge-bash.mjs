#!/usr/bin/env node
// PreToolUse hook (judge 전용: Bash · use_figma) — judge 는 판정에 필요한 것만 실행한다.
// Bash: node harness/scripts/verify.mjs <g1|g2|g3-approval|status> <slug>
//       node harness/scripts/verify.mjs <g3|g4|g5> <slug> --figma-digest <지문>
//       node harness/scripts/verify.mjs figma-code <g3|g4|g5> <slug>
// use_figma: figma-code.mjs 가 만든 digest 코드(rules.yaml g3.page·g4.page)와 글자까지 같은 코드만 허용
// 모듈·규칙을 못 읽으면 막는다 (3차 보강: fail-closed)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deny = (m) => { process.stderr.write(`[harness guard] ${m}\n`); process.exit(2); };
let input;
try { input = JSON.parse(fs.readFileSync(0, "utf8")); } catch { deny("hook 입력을 읽지 못해 안전하게 막습니다."); }

let buildFigmaCode, R;
try {
  ({ buildFigmaCode } = await import("./figma-code.mjs"));
  const YAML = (await import("yaml")).default;
  R = YAML.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "rules.yaml"), "utf8"));
} catch { deny("판정 모듈·rules.yaml 을 읽지 못해 안전하게 막습니다."); }

// settings.json(use_figma) 과 judge frontmatter(Bash·use_figma) 양쪽에서 불린다.
// 작업 에이전트의 use_figma 는 자유. 메인 세션은 실행 중에 Figma 를 직접 고치지 않는다 (디자인은 작업 에이전트 몫 — 3차 보강)
// 실행 중에는 use_figma 를 judge(지문 코드만)와 R.gates.figma_agents(확인 대기·차단이 아닐 때)만 쓴다 (4차: 메인·기타 에이전트 우회 차단)
const who = String(input?.agent_type ?? "");
const FIGMA_WRITE = /(use_figma|generate_figma_design|upload_assets|create_new_file|generate_image|generate_diagram)$/; // 5차: use_figma 외 Figma 쓰기 도구도
if (who !== R.guard.judge_agent && FIGMA_WRITE.test(String(input?.tool_name ?? ""))) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const RUNS = path.join(ROOT, R.run.runs_dir);
  const sts = fs.existsSync(RUNS) ? fs.readdirSync(RUNS).map((s) => { try { return JSON.parse(fs.readFileSync(path.join(RUNS, s, "state.json"), "utf8")); } catch { return null; } }).filter((s) => s && !s.done) : [];
  if (!sts.length) process.exit(0);
  if (!R.gates.figma_agents.includes(who)) deny(`실행 중인 하네스(${sts.map((s) => s.slug).join(", ")})가 있습니다. Figma 는 ${R.gates.figma_agents.join("·")} 만 고칩니다 (현재: ${who || "메인 세션"}).`);
  const hold = sts.filter((s) => s.awaiting || s.blocked);
  if (hold.length) deny(`확인 대기·차단 중(${hold.map((s) => s.slug).join(", ")})에는 Figma 를 고치지 않습니다.`);
  process.exit(0);
}
if (who !== R.guard.judge_agent) process.exit(0);

if (FIGMA_WRITE.test(String(input?.tool_name ?? ""))) {
  if (!/use_figma$/.test(String(input?.tool_name))) deny("judge 는 Figma 에 쓰지 않습니다.");
  const norm = (s) => s.replace(/\r\n/g, "\n").trim();
  const code = norm(String(input?.tool_input?.code ?? ""));
  const ok = [R.g3.page, R.g4.page].some((page) => code === norm(buildFigmaCode({ mode: "digest", page })));
  if (!ok) deny("judge 의 use_figma 는 'verify.mjs figma-code <gate> <slug>' 가 출력한 digest 코드를 한 글자도 바꾸지 않고 실행할 때만 쓸 수 있습니다.");
  process.exit(0);
}

const cmd = String(input?.tool_input?.command ?? "").trim();
if (/[;&|`$<>(){}\\\n'"*?]/.test(cmd)) deny(`judge 명령에는 셸 연결·치환 문자(; & | ` + "`" + ` $ < > ( ) { } \\)를 쓸 수 없습니다. (요청: ${cmd.slice(0, 120)})`);
const pre = String.raw`^node\s+harness\/scripts\/verify\.mjs\s+`;
const slug = R.run.slug_pattern.replace(/^\^|\$$/g, "");
const ok = [
  `(g1|g2|g3-approval|status)\\s+${slug}$`,
  `(${R.gates.figma_gates.join("|")})\\s+${slug}\\s+--figma-digest\\s+${R.figma.digest_pattern.replace(/^\^|\$$/g, "")}$`,
  `figma-code\\s+(${R.gates.figma_gates.join("|")})\\s+${slug}$`,
].some((t) => new RegExp(pre + t).test(cmd));
if (!ok) deny(`judge 는 verify.mjs 판정 명령만 실행할 수 있습니다. 파일 확인은 Read 를 쓰세요. (요청: ${cmd.slice(0, 120)})`);
process.exit(0);
