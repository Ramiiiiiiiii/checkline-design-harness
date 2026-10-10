#!/usr/bin/env node
// PreToolUse hook (judge 전용: Bash · use_figma) — judge 는 판정에 필요한 것만 실행한다.
// Bash: node harness/scripts/verify.mjs <g1|g2|g3-approval|status> <slug>
//       node harness/scripts/verify.mjs <g3|g4|g5> <slug> --figma-digest <지문>
//       node harness/scripts/verify.mjs figma-code <g3|g4|g5> <slug>
// use_figma: figma-code.mjs 가 만든 digest 코드(P3 시안·P4 확장)와 글자까지 같은 코드만 허용
import fs from "node:fs";

const deny = (m) => { process.stderr.write(`[harness guard] ${m}\n`); process.exit(2); };
let input;
try { input = JSON.parse(fs.readFileSync(0, "utf8")); } catch { process.exit(0); }

if (/use_figma$/.test(String(input?.tool_name ?? ""))) {
  const { buildFigmaCode } = await import("./figma-code.mjs");
  const norm = (s) => s.replace(/\r\n/g, "\n").trim();
  const code = norm(String(input?.tool_input?.code ?? ""));
  const ok = ["P3 시안", "P4 확장"].some((page) => code === norm(buildFigmaCode({ mode: "digest", page })));
  if (!ok) deny("judge 의 use_figma 는 'verify.mjs figma-code <gate> <slug>' 가 출력한 digest 코드를 한 글자도 바꾸지 않고 실행할 때만 쓸 수 있습니다.");
  process.exit(0);
}

const cmd = String(input?.tool_input?.command ?? "").trim();
const pre = String.raw`^(cd\s+("[^"]+"|'[^']+'|\S+)\s*&&\s*)?node\s+(\S*\/)?harness\/scripts\/verify\.mjs\s+`;
const slug = String.raw`[a-z0-9][a-z0-9-]*`;
const ok = [
  `(g1|g2|g3-approval|status)\\s+${slug}$`,
  `(g3|g4|g5)\\s+${slug}\\s+--figma-digest\\s+[0-9a-f]{8}-\\d+-[0-9a-f]{8}$`,
  `figma-code\\s+(g3|g4|g5)\\s+${slug}$`,
].some((t) => new RegExp(pre + t).test(cmd));
if (!ok) deny(`judge 는 verify.mjs 판정 명령만 실행할 수 있습니다. 파일 확인은 Read/Grep 을 쓰세요. (요청: ${cmd.slice(0, 120)})`);
process.exit(0);
