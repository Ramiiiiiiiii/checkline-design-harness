// 체크라인 디자인 하네스 — Figma 검사 코드 템플릿 (직접 실행하지 않음)
// 실행 코드는 'node harness/scripts/verify.mjs figma-code <g3|g4|g5> <slug> [--mode export]' 가 만든다.
//   - rules.yaml 의 figma 섹션과 figma-check.lib.js 를 이 템플릿에 끼워 넣는다 (규칙 SSOT 유지).
//   - export 모드: 작업 에이전트가 실행 → 반환 JSON 을 figma-export.json 으로 저장
//   - digest 모드: judge 가 실행 → { digest } 만 반환
// use_figma 반환 한도(20KB) 때문에 전체 노드는 돌려주지 않고, Figma 안에서 검사한 위반 목록과 프레임 요약만 돌려준다.
// 수집 범위: 페이지 최상위 FRAME 과 그 하위 노드. INSTANCE 안쪽(원티드 DS 내부)은 들어가지 않는다.
const MODE = "export";
const PAGE_NAME = "P3 시안";
const F = __RULES_FIGMA__;
__CHECK_LIB__

function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
const hex = (c) => "#" + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const varCache = {};
async function varName(id) {
  if (!id) return null;
  if (!(id in varCache)) { const v = await figma.variables.getVariableByIdAsync(id); varCache[id] = v ? v.name : null; }
  return varCache[id];
}
async function paints(arr) {
  if (!arr || arr === figma.mixed) return [];
  const res = [];
  for (const p of arr) {
    if (p.visible === false) continue;
    if (p.type === "SOLID") res.push({ type: "SOLID", hex: hex(p.color), var: await varName(p.boundVariables && p.boundVariables.color && p.boundVariables.color.id) });
    else res.push({ type: p.type, hex: null, var: null });
  }
  return res;
}
async function compName(inst) {
  const mc = await inst.getMainComponentAsync();
  if (!mc) return null;
  return mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent.name : mc.name;
}
async function modeOf(frame) {
  const em = frame.explicitVariableModes || {};
  for (const cid of Object.keys(em)) {
    const col = await figma.variables.getVariableCollectionByIdAsync(cid);
    const m = col && col.modes.find((x) => x.modeId === em[cid]);
    if (m && /dark/i.test(m.name)) return "Dark";
    if (m && /light/i.test(m.name)) return "Light";
  }
  return "Light";
}

const page = figma.root.children.find((p) => p.name === PAGE_NAME);
if (!page) return { error: `페이지 '${PAGE_NAME}' 없음`, pages: figma.root.children.map((p) => p.name) };
await figma.setCurrentPageAsync(page);

const frames = [];
const localComponents = [];
const tops = page.children.filter((n) => n.type === "FRAME").sort((a, b) => (a.x - b.x) || (a.y - b.y));
for (const n of page.children) if (n.type === "COMPONENT" || n.type === "COMPONENT_SET") localComponents.push(n.name);
for (const fr of tops) {
  const nodes = [];
  async function visit(n, parentId, inViz) {
    inViz = inViz || (n.name || "").includes(F.viz_tag || "\u0000");
    const rec = { id: n.id, parent: parentId, type: n.type, name: n.name, w: Math.round(n.width), h: Math.round(n.height) };
    if (n.opacity < 1) { rec.opacity = Math.round(n.opacity * 100) / 100; rec.inViz = inViz; }
    if ("fills" in n) rec.fills = await paints(n.fills);
    if ("strokes" in n && n.strokes.length) rec.strokes = await paints(n.strokes);
    if ("cornerRadius" in n && n.type !== "TEXT")
      rec.radius = n.cornerRadius === figma.mixed ? [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius].map(Math.round) : Math.round(n.cornerRadius);
    if ("layoutMode" in n && n.layoutMode !== "NONE") {
      rec.gap = Math.round(n.itemSpacing);
      rec.padding = [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(Math.round);
    }
    if (n.type === "TEXT") {
      rec.text = n.characters;
      rec.fontSize = n.fontSize === figma.mixed ? "MIXED" : n.fontSize;
      rec.fontFamily = n.fontName === figma.mixed ? "MIXED" : n.fontName.family;
      rec.fontStyle = n.fontName === figma.mixed ? "MIXED" : n.fontName.style;
      const lh = n.lineHeight;
      rec.lineHeight = lh === figma.mixed ? "MIXED" : lh.unit === "PERCENT" ? Math.round(lh.value * 10) / 10 : lh.unit === "PIXELS" && typeof rec.fontSize === "number" ? Math.round((lh.value / rec.fontSize) * 1000) / 10 : "AUTO";
      if (n.textStyleId === figma.mixed) rec.textStyle = "MIXED";
      else if (n.textStyleId) { const s = await figma.getStyleByIdAsync(n.textStyleId); rec.textStyle = s ? s.name : null; }
      else rec.textStyle = null;
    }
    if (n.type === "COMPONENT" || n.type === "COMPONENT_SET") localComponents.push(n.name);
    if (n.type === "INSTANCE") {
      rec.component = await compName(n);
      rec.text = n.findAll((x) => x.type === "TEXT" && x.visible).map((x) => x.characters).join(" ");
      rec.hasIcon = false; // 상태 라벨이 든 인스턴스만, 안쪽 인스턴스의 실제 컴포넌트가 아이콘인지 확인 (레이어 이름이 슬롯명이어도 잡힘)
      if (rec.text.includes(F.stop_text))
        for (const x of n.findAll((y) => y.type === "INSTANCE" && y.visible)) {
          const cn = (await compName(x)) || "";
          if (F.icon_component_prefix.some((q) => cn.startsWith(q)) || /icon/i.test(x.name)) { rec.hasIcon = true; break; }
        }
      nodes.push(rec);
      return; // 원티드 DS 내부로 들어가지 않음
    }
    nodes.push(rec);
    if ("children" in n) for (const c of n.children) await visit(c, n.id, inViz);
  }
  const root = { id: fr.id, name: fr.name, width: Math.round(fr.width), height: Math.round(fr.height), mode: await modeOf(fr), fills: await paints(fr.fills) };
  if ("cornerRadius" in fr && fr.cornerRadius !== figma.mixed) root.radius = Math.round(fr.cornerRadius);
  for (const c of fr.children) await visit(c, fr.id, false);
  root.nodes = nodes;
  frames.push(root);
}

const all = checkFramesCore(frames, F, localComponents);
const MAX = 150;
const summary = {
  frames: frames.map((f) => ({ id: f.id, name: f.name, width: f.width, height: f.height, mode: f.mode, nodeCount: f.nodes.length })),
  localComponents,
  violationCount: all.length,
  violations: all.slice(0, MAX),
};
const count = frames.reduce((n, f) => n + 1 + f.nodes.length, 0);
const digest = `${fnv(JSON.stringify(frames))}-${count}-${fnv(JSON.stringify(summary))}`;
if (MODE === "digest") return { fileKey: figma.fileKey, page: PAGE_NAME, digest };
return Object.assign({ version: 2, page: PAGE_NAME, fileKey: figma.fileKey, exportedAt: new Date().toISOString() }, summary, { digest });
