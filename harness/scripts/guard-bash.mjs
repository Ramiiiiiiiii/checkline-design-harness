#!/usr/bin/env node
// PreToolUse hook (Bash) — 모든 에이전트(메인 포함)의 셸 명령을 본다. 3차 보강: 금지 목록이 아니라 **허용 목록**.
// 허용 목록 밖의 명령은 모두 막는다. 기준값은 rules.yaml `guard` (SSOT).
//   judge 는 verify.mjs 만. 그 밖의 누구나: 읽기 명령(ls·cat·grep …; git 은 .git/config 로 명령 실행이 가능해 제외), verify.mjs status <slug>
//   judge 만    : verify.mjs <g1|g2|g3|g3-approval|g4|g5> <slug> [--figma-digest <지문>], figma-code <g3|g4|g5> <slug> (지문 코드)
//   메인 세션만 : verify.mjs init …, figma-code … --mode export [--page all], node tests/run.mjs, npm ci|install --prefix harness
//   아무도 못 함: verify.mjs proceed|unblock|reopen (사람이 '! node …' 로 직접 실행)
// 셸 연결·치환·리다이렉션·따옴표·변수·글롭 문자는 모두 금지 (init --topic "…" 한 곳만 정해진 모양으로 허용)
// 입력·규칙을 읽지 못하면 막는다 (fail-closed)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deny = (m) => { process.stderr.write(`[harness guard] ${m}\n`); process.exit(2); };
let input, R;
try { input = JSON.parse(fs.readFileSync(0, "utf8")); } catch { deny("hook 입력을 읽지 못해 안전하게 막습니다."); }
try {
  const YAML = (await import("yaml")).default;
  const HARNESS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  R = YAML.parse(fs.readFileSync(path.join(HARNESS_DIR, "rules.yaml"), "utf8"));
  if (!R?.guard) throw 0;
} catch { deny("rules.yaml(guard) 를 읽지 못해 안전하게 막습니다. 'cd harness && npm install' 을 확인하세요."); }

const G = R.guard;
const cmd = String(input?.tool_input?.command ?? "").trim();
if (!cmd) process.exit(0);
const who = String(input?.agent_type ?? ""); // 비어 있으면 메인 세션(오케스트레이터)
const isMain = who === "", isJudge = who === G.judge_agent;
const short = cmd.slice(0, 120);
const VERIFY = "harness/scripts/verify.mjs";
const slug = new RegExp(R.run.slug_pattern.replace(/^\^|\$$/g, ""));

// init 은 주제에 띄어쓰기가 있어 따옴표가 필요 — 정해진 모양 하나만 허용
const initRe = new RegExp(String.raw`^node (?:\./)?harness/scripts/verify\.mjs init (${slug.source}) --topic "[^"\\$\`!\n]{1,80}"(?: --figma https://www\.figma\.com/(?:design|file)/[A-Za-z0-9]+(?:/[A-Za-z0-9_-]*)?)?$`);
if (initRe.test(cmd)) { if (!isMain) deny(`init 은 메인 세션만 실행합니다. (${who})`); process.exit(0); }

for (const ch of G.shell_forbidden_chars) if (cmd.includes(ch))
  deny(`셸 연결·치환·리다이렉션·따옴표·변수·글롭 문자(${JSON.stringify(ch)})는 쓸 수 없습니다. 허용 명령을 한 줄에 하나씩 실행하세요. (요청: ${short})`);

const t = cmd.split(/\s+/).map((x) => x.replace(/^\.\//, ""));
const badFlag = t.find((x) => G.banned_flags.some((f) => x === f || x.startsWith(f + "=")));
if (badFlag) deny(`'${badFlag}' 옵션은 쓸 수 없습니다 (외부 실행·파일 쓰기). (요청: ${short})`);

// judge 는 verify.mjs 만 (읽기는 Read 도구로 — export 를 cat 으로 우회하지 못하게)
const isVerify = t[0] === "node" && t[1] === VERIFY;
if (isJudge && !isVerify) deny(`judge 는 verify.mjs 판정 명령만 실행합니다. 파일은 Read 도구로 여세요. (요청: ${short})`);

// 읽기 명령
if (G.readonly_commands.includes(t[0])) process.exit(0);

// 테스트·의존성 (메인만)
if (t[0] === "node" && t[1] === "tests/run.mjs" && t.length === 2) { if (!isMain) deny("테스트는 메인 세션만 실행합니다."); process.exit(0); }
if (t[0] === "npm" && ["ci", "install"].includes(t[1]) && t[2] === "--prefix" && t[3] === "harness" && t.length === 4) { if (!isMain) deny("npm 은 메인 세션만 실행합니다."); process.exit(0); }

// verify.mjs
if (t[0] === "node" && t[1] === VERIFY) {
  const [, , sub, ...a] = t;
  if (G.human_only.includes(sub)) deny(`'${sub}' 는 사람 전용입니다. 사용자에게 '! node ${VERIFY} ${sub} …' 로 직접 실행해 달라고 하세요.`);
  const isSlug = (s) => new RegExp(R.run.slug_pattern).test(s ?? "");
  if (sub === "status" && a.length === 1 && isSlug(a[0])) process.exit(0);
  if (G.judge_only.includes(sub) && isSlug(a[0])) {
    if (!isJudge) deny(`판정 명령(${sub})은 judge 만 실행합니다. judge 에이전트를 부르세요. (현재: ${who || "메인 세션"})`);
    const rest = a.slice(1);
    if (rest.length === 0 || (rest.length === 2 && rest[0] === "--figma-digest" && new RegExp(R.figma.digest_pattern).test(rest[1]))) process.exit(0);
  }
  if (sub === "figma-code" && R.gates.figma_gates.includes(a[0]) && isSlug(a[1])) {
    const rest = a.slice(2);
    if (rest.length === 0) { if (!isJudge) deny("지문(digest) 코드는 judge 만 받습니다."); process.exit(0); }
    const ok = rest[0] === "--mode" && rest[1] === "export" && (rest.length === 2 || (rest.length === 4 && rest[2] === "--page" && rest[3] === "all"));
    if (ok) { if (!isMain) deny("export 코드는 메인 세션(오케스트레이터)이 받아 작업 에이전트에게 넘깁니다."); process.exit(0); }
  }
}
deny(`허용 목록 밖의 명령입니다: ${short}\n허용: 읽기(${G.readonly_commands.join("·")}), verify.mjs status·판정(judge)·figma-code, node tests/run.mjs. 파일 쓰기는 Write 도구로.`);
