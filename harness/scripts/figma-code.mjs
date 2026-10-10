// 체크라인 디자인 하네스 — Figma 검사 코드 생성기 (verify.mjs · guard-judge-bash.mjs · 테스트 공용)
// figma-export.figma.js 템플릿에 rules.yaml(figma 섹션)과 figma-check.lib.js 를 끼워 실행 코드를 만든다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = path.resolve(SCRIPTS, "..");

export function loadRules() {
  return YAML.parse(fs.readFileSync(path.join(HARNESS_DIR, "rules.yaml"), "utf8"));
}
export function checkLibSource() {
  return fs.readFileSync(path.join(SCRIPTS, "figma-check.lib.js"), "utf8");
}
// Node 에서 같은 검사 함수를 쓰기 위한 로더
export function loadCheckFn() {
  return new Function(`${checkLibSource()}\nreturn checkFramesCore;`)();
}
export function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
export function buildFigmaCode({ mode, page }) {
  const R = loadRules();
  return fs.readFileSync(path.join(SCRIPTS, "figma-export.figma.js"), "utf8")
    .replace(/^const MODE = ".*";$/m, `const MODE = ${JSON.stringify(mode)};`)
    .replace(/^const PAGE_NAME = ".*";$/m, `const PAGE_NAME = ${JSON.stringify(page)};`)
    .replace("__RULES_FIGMA__", JSON.stringify(R.figma))
    .replace("__CHECK_LIB__", checkLibSource());
}
