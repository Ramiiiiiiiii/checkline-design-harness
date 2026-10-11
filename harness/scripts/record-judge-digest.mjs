#!/usr/bin/env node
// PostToolUse hook (use_figma) — judge 가 생성된 지문(digest) 코드를 Figma 에서 실제로 실행한 결과를 기록한다.
// verify.mjs 는 --figma-digest 값이 이 기록과 같을 때만 받는다 (rules.yaml figma.require_judge_record).
// → 메인 세션이 export 에서 읽은 지문을 judge 프롬프트로 넘겨주는 길을 막는다. 기록 파일은 이 hook 만 쓴다 (guard-write·guard-bash 가 막음).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HARNESS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(HARNESS_DIR, "..");
let input, R, buildFigmaCode;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
  const YAML = (await import("yaml")).default;
  R = YAML.parse(fs.readFileSync(path.join(HARNESS_DIR, "rules.yaml"), "utf8"));
  ({ buildFigmaCode } = await import("./figma-code.mjs"));
} catch { process.exit(0); } // 기록 실패 = 기록 없음 → verify.mjs 가 판정을 거부 (fail-closed 는 판정 쪽에서)
if (String(input?.agent_type ?? "") !== R.guard.judge_agent) process.exit(0);
const norm = (s) => String(s).replace(/\r\n/g, "\n").trim();
const code = norm(input?.tool_input?.code ?? "");
const page = [R.g3.page, R.g4.page].find((pg) => code === norm(buildFigmaCode({ mode: "digest", page: pg })));
if (!page) process.exit(0);
// 응답을 정규식이 아니라 JSON 으로 파싱해 정확한 필드만 읽는다 (4차): { fileKey, page, digest } 이고 page 가 실행한 코드의 페이지와 같아야 함
const texts = [];
const walk = (x) => { if (typeof x === "string") texts.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if ("digest" in x) texts.push(JSON.stringify(x)); Object.values(x).forEach(walk); } };
walk(input?.tool_response);
let hit = null;
for (const t of texts) { try { const o = JSON.parse(t); if (o && typeof o.digest === "string" && new RegExp(R.figma.digest_pattern).test(o.digest) && o.page === page && typeof o.fileKey === "string" && o.fileKey) { hit = o; break; } } catch {} }
if (!hit) process.exit(0);
const _envRuns = process.env.HARNESS_RUNS ? path.resolve(process.env.HARNESS_RUNS) : null;
const _testRoot = path.join(ROOT, "tests", ".tmp");
const RUNS = _envRuns && (_envRuns === _testRoot || _envRuns.startsWith(_testRoot + path.sep)) ? _envRuns : path.join(ROOT, R.run.runs_dir);
const file = path.join(RUNS, R.figma.judge_record_file);
let rec = {}; try { rec = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
rec[`${hit.fileKey}::${page}`] = { digest: hit.digest, at: new Date().toISOString() };
fs.mkdirSync(RUNS, { recursive: true });
fs.writeFileSync(file, JSON.stringify(rec, null, 2));
process.exit(0);
