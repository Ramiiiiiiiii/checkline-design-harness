#!/usr/bin/env node
// PreToolUse hook (Read · Grep · Glob — judge 일 때만 검사) — judge 는 작업 에이전트가 낸 figma-export.json 을 읽지 않는다.
// 지문(digest)은 judge 가 Figma 에서 직접 계산한 값만 쓰게 해서, export 안의 값을 베끼는 길을 막는다.
// 3차 보강: 폴더 단위 Grep·Glob 로 우회할 수 있어 judge 는 Grep·Glob 을 아예 쓰지 않는다(Read 로 정해진 파일만).
//          Read 는 실제 경로(심볼릭 링크 해석)의 파일 이름으로 판단한다. 입력·규칙을 못 읽으면 막는다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deny = (m) => { process.stderr.write(`[harness guard] ${m}\n`); process.exit(2); };
let input, R;
try { input = JSON.parse(fs.readFileSync(0, "utf8")); } catch { deny("hook 입력을 읽지 못해 안전하게 막습니다."); }
try {
  const YAML = (await import("yaml")).default;
  R = YAML.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "rules.yaml"), "utf8"));
} catch { deny("rules.yaml 을 읽지 못해 안전하게 막습니다."); }
// settings.json 에서 모든 에이전트에 걸리고, judge 일 때만 검사한다 (실측: subagent frontmatter hook 이 headless 실행에서 발동하지 않음 → settings 로 이중화)
if (String(input?.agent_type ?? "") !== R.guard.judge_agent) process.exit(0);
const tool = String(input?.tool_name ?? "");
if (tool !== "Read") deny(`judge 는 ${tool || "이 도구"}를 쓰지 않습니다. 판정에 필요한 파일은 Read 로 경로를 정확히 지정해 여세요.`);
const fp = String(input?.tool_input?.file_path ?? "");
if (!fp) deny("Read 경로가 없습니다.");
let real = path.resolve(input.cwd ?? process.cwd(), fp);
try { real = fs.realpathSync(real); } catch {}
const names = [path.basename(fp), path.basename(real)].map((s) => s.toLowerCase());
const ex = String(R.figma.export_file).toLowerCase();
if (names.some((n) => n === ex || n.includes(ex.replace(/\.json$/, ""))))
  deny(`judge 는 ${R.figma.export_file} 을 열지 않습니다. 지문은 'verify.mjs figma-code <gate> <slug>' 코드를 Figma 에서 실행해 직접 얻으세요.`);
process.exit(0);
