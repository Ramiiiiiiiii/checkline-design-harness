const P0 = figma.root.children[0];
await figma.setCurrentPageAsync(P0);
for (const st of ["Regular", "Medium", "Bold"]) await figma.loadFontAsync({ family: "Noto Sans KR", style: st });
const V = {};
for (const n of P0.findAll((x) => "fills" in x && Array.isArray(x.fills)))
  for (const f of n.fills) if (f.boundVariables && f.boundVariables.color) { const id = f.boundVariables.color.id; if (!Object.values(V).some((v) => v.id === id)) { const v = await figma.variables.getVariableByIdAsync(id); if (v) V[v.name] = v; } }
const paint = (name) => { if (!V[name]) throw new Error("no var " + name); return figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V[name]); };
const SPEC = { "Display 1/": [56, 128.6], "Title 3/": [24, 133.4], "Heading 1/": [22, 136.4], "Heading 2/": [20, 140], "Headline 1/": [18, 144.5], "Body 1/Normal": [16, 150], "Body 2/Normal": [15, 146.7], "Label 1/Normal": [14, 142.9], "Label 2/": [13, 138.5], "Caption 1/": [12, 133.4] };
const CARD = "Background/Elevated/Normal";
async function T(str, style, color = "Label/Normal", align) {
  const t = figma.createText(); const pre = Object.keys(SPEC).find((p) => style.startsWith(p));
  t.fontName = { family: "Noto Sans KR", style: style.endsWith("Bold") ? "Bold" : style.endsWith("Medium") ? "Medium" : "Regular" };
  t.fontSize = SPEC[pre][0]; t.lineHeight = { unit: "PERCENT", value: SPEC[pre][1] }; t.characters = String(str); t.name = style; t.fills = [paint(color)];
  if (align) t.textAlignHorizontal = align; return t;
}
function AL(dir, o = {}) {
  const f = figma.createAutoLayout(dir); f.name = o.name || "Group"; f.itemSpacing = o.gap ?? 0;
  const p = o.pad ?? [0, 0, 0, 0]; f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3];
  f.fills = o.fill ? [paint(o.fill)] : []; if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = o.sw ?? 1; }
  if (o.radius !== undefined) f.cornerRadius = o.radius; if (o.align) f.counterAxisAlignItems = o.align; if (o.main) f.primaryAxisAlignItems = o.main; return f;
}
function add(parent, child, fillW = false) { parent.appendChild(child); if (fillW) { child.layoutSizingHorizontal = "FILL"; if (child.type === "TEXT") child.textAutoResize = "HEIGHT"; } return child; }
function fixW(node, w) { node.resize(w, node.height); node.layoutSizingHorizontal = "FIXED"; if (node.type === "TEXT") node.textAutoResize = "HEIGHT"; return node; }
function spacer(parent) { const s = AL("HORIZONTAL", { name: "spacer" }); s.resize(1, 1); add(parent, s, true); s.layoutSizingVertical = "FIXED"; s.resize(s.width, 1); return s; }
// 원격 원티드 컴포넌트: 붙여넣은 인스턴스에서 메인 컴포넌트를 찾아 재사용
const MC = {};
for (const inst of P0.findAll((x) => x.type === "INSTANCE" && /^(Icon\/|Button)/.test(x.name))) {
  const mc = await inst.getMainComponentAsync(); if (!mc) continue;
  const setName = mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent.name : mc.name;
  if (setName.startsWith("Icon/")) MC[setName] = mc; else if (setName === "Button/Button") MC.btnSet = mc.parent;
}
async function icon(name, color, size = 20) {
  const i = MC["Icon/Normal/" + name].createInstance(); i.resize(size, size);
  for (const r of i.children.filter((c) => c.name === "Ratio")) r.visible = false; // 보조 레이어 끄기
  for (const n of i.findAll((x) => (x.type === "VECTOR" || x.type === "BOOLEAN_OPERATION" || x.type === "ELLIPSE") && x.visible && Array.isArray(x.fills) && x.fills.length)) n.fills = [paint(color)];
  return i;
}
function setLabel(inst, str) { const t = inst.findOne((n) => n.type === "TEXT" && n.visible); if (!t) return inst; const cur = t.fontName === figma.mixed ? "Regular" : t.fontName.style; t.fontName = { family: "Noto Sans KR", style: /Bold|SemiBold/.test(cur) ? "Bold" : /Medium/.test(cur) ? "Medium" : "Regular" }; t.characters = String(str); return inst; }
function button(label, primary = false, size = "Large") {
  const name = primary ? `Variant=Solid, Color=Primary, Size=${size}, Icon Only=False, Disable=False` : `Variant=Outlined, Color=Assistive, Size=${size}, Icon Only=False, Disable=False`;
  const v = MC.btnSet.children.find((c) => c.name === name); return setLabel(v.createInstance(), label);
}
const STATUS = { "가동 정지": "Status/Negative", "이상": "Status/Cautionary", "미점검": "Interaction/Inactive", "수리 중": "Accent/Foreground/Violet", "정상": "Status/Positive" };
async function status(s, style = "Label 1/Normal - Bold") {
  const f = AL("HORIZONTAL", { name: `Status/${s}`, gap: 6, align: "CENTER" });
  if (s === "가동 정지") add(f, await icon("Triangle Exclamation", STATUS[s], 18)); else { const d = figma.createEllipse(); d.name = "점"; d.resize(8, 8); d.fills = [paint(STATUS[s])]; add(f, d); }
  add(f, await T(s, style, STATUS[s])); return f;
}
function rect(w, h, color, r = 4, name = "bar") { const x = figma.createRectangle(); x.name = name; x.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); x.fills = [paint(color)]; x.cornerRadius = r; return x; }
const MENU = [["Home", "대시보드"], ["Apps", "설비"], ["Document Text", "점검 기록"], ["Bell", "이상 보고"], ["Calendar", "수리"], ["Persons", "담당자"], ["Setting", "설정"]];
// 태블릿: 왼쪽 레일 메뉴
async function rail(active) {
  const r = AL("VERTICAL", { name: "[DS 없음 · 조합] 내비 레일", gap: 4, pad: [20, 8, 20, 8], fill: CARD, align: "CENTER" });
  const lg = AL("VERTICAL", { name: "로고", pad: [0, 0, 16, 0], align: "CENTER" }); add(lg, await icon("Circle Check", "Primary/Normal", 28)); add(r, lg, true);
  for (const [ic, label] of MENU) {
    const on = label === active;
    const it = AL("VERTICAL", { name: "레일 항목", gap: 4, pad: [10, 0, 10, 0], radius: 12, align: "CENTER", fill: on ? "Fill/Normal" : undefined });
    add(it, await icon(ic, on ? "Primary/Normal" : "Label/Alternative", 24));
    add(it, await T(label, on ? "Caption 1/Bold" : "Caption 1/Medium", on ? "Label/Normal" : "Label/Alternative", "CENTER"), true);
    add(r, it, true);
  }
  return r;
}
// 모바일: 하단 탭
const TABS = [["Home", "대시보드"], ["Apps", "설비"], ["Bell", "이상 보고"], ["Calendar", "수리"], ["Setting", "설정"]];
async function tabBar(active) {
  const b = AL("HORIZONTAL", { name: "[DS 없음 · 조합] 하단 탭", pad: [8, 4, 12, 4], fill: CARD });
  b.strokes = [paint("Line/Solid/Normal")]; b.strokeTopWeight = 1; b.strokeBottomWeight = 0; b.strokeLeftWeight = 0; b.strokeRightWeight = 0;
  for (const [ic, label] of TABS) {
    const on = label === active;
    const it = AL("VERTICAL", { name: "탭", gap: 2, pad: [4, 0, 4, 0], align: "CENTER" });
    add(it, await icon(ic, on ? "Primary/Normal" : "Label/Alternative", 24));
    add(it, await T(label, on ? "Caption 1/Bold" : "Caption 1/Medium", on ? "Label/Normal" : "Label/Alternative", "CENTER"), true);
    add(b, it, true);
  }
  return b;
}
async function addRail(F, active) {
  const content = AL("VERTICAL", { name: "본문", gap: F.itemSpacing, pad: [F.paddingTop, F.paddingRight, F.paddingBottom, F.paddingLeft] });
  const kids = [...F.children];
  const W = F.width;
  F.layoutMode = "HORIZONTAL"; F.itemSpacing = 0; F.paddingTop = F.paddingBottom = F.paddingLeft = F.paddingRight = 0;
  F.primaryAxisSizingMode = "FIXED"; F.resize(W, F.height); F.counterAxisSizingMode = "AUTO";
  const r = await rail(active); add(F, r); fixW(r, 88); r.layoutSizingVertical = "FILL";
  add(F, content, true);
  for (const k of kids) { content.appendChild(k); k.layoutSizingHorizontal = "FILL"; }
  return content;
}
async function addTabBar(F, active) {
  F.paddingBottom = 80;
  const b = await tabBar(active); F.appendChild(b); b.layoutPositioning = "ABSOLUTE"; b.resize(F.width, b.height);
  b.x = 0; b.y = F.height - b.height; b.constraints = { horizontal: "STRETCH", vertical: "MAX" };
  return b;
}

const out = {};
for (const F of P0.children.filter((n) => n.type === "FRAME")) {
  if (F.name.startsWith("Tablet/")) {
    const h = F.findOne((n) => n.name === "Header"); if (h) { h.children[0].remove(); h.children[0].remove(); }
    await addRail(F, "대시보드");
  }
  if (F.name.startsWith("Mobile/")) await addTabBar(F, "대시보드");
  out[F.name] = [F.id, Math.round(F.width), Math.round(F.height)];
}
return out;
