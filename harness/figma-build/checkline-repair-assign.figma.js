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

const COL = await figma.variables.getVariableCollectionByIdAsync(V["Label/Normal"].variableCollectionId);
let page = figma.root.children.find((p) => p.name === "수리 배정"); if (!page) { page = figma.createPage(); page.name = "수리 배정"; }
const webSrc = P0.children.find((n) => n.name === "Web/Light");
const sideSrc = webSrc.findOne((n) => n.name === "[DS 없음 · 조합] 사이드 내비");
await figma.setCurrentPageAsync(page);
for (const n of [...page.children]) n.remove();
function frame(name, w, h, x, y, dir = "VERTICAL") {
  const F = figma.createFrame(); F.name = name; F.x = x; F.y = y; F.layoutMode = dir;
  if (dir === "VERTICAL") { F.counterAxisSizingMode = "FIXED"; F.resize(w, h); F.primaryAxisSizingMode = "AUTO"; }
  else { F.primaryAxisSizingMode = "FIXED"; F.resize(w, h); F.counterAxisSizingMode = "AUTO"; }
  F.minHeight = h; F.fills = [paint("Background/Normal/Alternative"), paint("Fill/Alternative")]; page.appendChild(F); return F;
}
function card(name, o = {}) { return AL("VERTICAL", { name, gap: o.gap ?? 20, pad: o.pad ?? [24, 24, 24, 24], fill: CARD, radius: 16 }); }
async function cardHead(c, title, o = {}) {
  const h = AL("HORIZONTAL", { name: "Card Header", gap: 8, align: "CENTER" });
  add(h, await T(title, o.style ?? "Headline 1/Bold"));
  if (o.tag) add(h, await T(o.tag, "Caption 1/Bold", "Primary/Normal"));
  if (o.right) { spacer(h); add(h, await T(o.right, o.small, "Label/Alternative")); }
  add(c, h, true); return h;
}
function progress(ratio, w, name) { const f = figma.createFrame(); f.name = name; f.resize(w, 8); f.fills = [paint("Fill/Normal")]; f.cornerRadius = 4; f.clipsContent = true; f.appendChild(rect(w * ratio, 8, "Label/Neutral", 4, "value")); return f; }
function dot(size, color) { const e = figma.createEllipse(); e.name = "점"; e.resize(size, size); e.fills = [paint(color)]; return e; }
async function stepTitle(n, label, small, tag) {
  const r = AL("HORIZONTAL", { name: `단계 ${n}`, gap: 8, align: "CENTER" });
  const c = AL("HORIZONTAL", { name: "번호", pad: [2, 8, 2, 8], radius: 9999, stroke: "Label/Normal", sw: 1.5, align: "CENTER" }); add(c, await T(String(n), "Caption 1/Bold")); add(r, c);
  add(r, await T(label, "Body 1/Normal - Bold"));
  if (tag) add(r, await T(tag, "Caption 1/Bold", "Primary/Normal"));
  return r;
}
async function riskSeg() {
  const s = AL("HORIZONTAL", { name: "[DS 없음 · 조합] 위험 등급 선택", stroke: "Line/Solid/Normal", radius: 12 }); s.clipsContent = true;
  for (const [l, on] of [["낮음"], ["보통"], ["즉시 정지", 1]]) {
    const c = AL("HORIZONTAL", { name: `등급/${l}`, pad: [14, 0, 14, 0], align: "CENTER", main: "CENTER", fill: on ? "Label/Normal" : undefined });
    add(c, await T(l, on ? "Body 1/Normal - Bold" : "Body 1/Normal - Medium", on ? CARD : "Label/Neutral")); add(s, c, true);
  }
  return s;
}
const PEOPLE = [["박수리", "설비보전팀 · A·B라인", 1, "대기 중", 1], ["이정비", "설비보전팀 · 전 라인", 3, "수리 중 · 컨베이어 2", 0], ["최용접", "외주 · 용접 전담", 2, "수리 중 · 용접로봇 4", 0]];
async function person(p, small, compact) {
  const on = !!p[4];
  const r = AL("HORIZONTAL", { name: "담당자", gap: 14, pad: [14, 16, 14, 16], radius: 12, stroke: on ? "Label/Normal" : "Line/Solid/Normal", sw: on ? 2 : 1, align: "CENTER" });
  const rd = figma.createFrame(); rd.name = "[DS 없음 · 조합] 라디오"; rd.resize(20, 20); rd.fills = []; rd.cornerRadius = 9999;
  if (on) { const o = dot(20, "Label/Normal"); rd.appendChild(o); const i = dot(8, CARD); rd.appendChild(i); i.x = 6; i.y = 6; }
  else { const o = figma.createEllipse(); o.name = "테두리"; o.resize(20, 20); o.fills = []; o.strokes = [paint("Label/Assistive")]; o.strokeWeight = 1.5; rd.appendChild(o); }
  add(r, rd);
  const nm = AL("VERTICAL", { name: "이름", gap: 2 }); add(nm, await T(p[0], "Body 1/Normal - Bold")); add(nm, await T(p[1], small, "Label/Alternative"));
  if (compact) add(nm, await T(p[3], small, "Label/Alternative"));
  add(r, nm); fixW(nm, compact ? 140 : 180);
  const ld = AL("HORIZONTAL", { name: "[시각화] 작업량", gap: 4, align: "CENTER" });
  for (let k = 0; k < 4; k++) add(ld, rect(compact ? 14 : 24, 10, k < p[2] ? "Label/Neutral" : "Fill/Normal", 4, "칸"));
  add(ld, await T(`${p[2]}건`, small, "Label/Alternative")); add(r, ld);
  if (!compact) { spacer(r); add(r, await T(p[3], "Label 1/Normal - Regular", "Label/Alternative")); }
  return r;
}
async function focusCard(field, compact) {
  const small = field ? "Caption 1/Regular" : "Label 2/Regular";
  const c = card("[주목] 수리 배정", { gap: 24, pad: compact ? [20, 16, 20, 16] : [32, 32, 32, 32] });
  await cardHead(c, "수리 배정", { style: "Heading 2/Bold" });
  const s1 = AL("VERTICAL", { name: "① 위험 등급", gap: 12 }); add(s1, await stepTitle(1, "위험 등급 확정")); add(s1, await riskSeg(), true);
  add(s1, await T("작업자 판단: 즉시 정지", "Label 1/Normal - Regular", "Label/Alternative"), true);
  add(s1, await T("즉시 정지로 확정하면 대시보드와 작업자 화면에 '가동 정지'로 표시돼요", "Label 1/Normal - Bold", "Status/Negative"), true);
  add(c, s1, true);
  const s2 = AL("VERTICAL", { name: "② 담당자", gap: 12 }); add(s2, await stepTitle(2, "수리 담당자", small, "[추가 제안] 현재 작업량"));
  for (const p of PEOPLE) add(s2, await person(p, small, compact), true);
  add(c, s2, true);
  const s3 = AL("VERTICAL", { name: "③ 메모", gap: 12 }); add(s3, await stepTitle(3, "메모 (선택)"));
  const memo = AL("VERTICAL", { name: "[DS 없음 · 조합] 메모 입력", pad: [14, 16, 14, 16], radius: 12, stroke: "Line/Solid/Normal" });
  add(memo, await T("담당자에게 전달할 내용", "Body 1/Normal - Regular", "Label/Assistive"), true); memo.minHeight = 88; add(s3, memo, true); add(c, s3, true);
  const act = AL(compact ? "VERTICAL" : "HORIZONTAL", { name: "버튼", gap: 10, main: compact ? undefined : "MAX" });
  if (compact) { add(act, button("박수리에게 배정하기", true), true); add(act, button("취소"), true); }
  else { add(act, button("취소")); add(act, button("박수리에게 배정하기", true)); }
  add(c, act, true);
  return c;
}
async function reportCard(field, compact) {
  const small = field ? "Caption 1/Regular" : "Label 2/Regular";
  const c = card("이상 보고", { pad: compact ? [20, 16, 20, 16] : [24, 24, 24, 24] }); await cardHead(c, "이상 보고", { right: "수정 불가 원본", small });
  const ph = AL("HORIZONTAL", { name: "사진", gap: 8 });
  for (const l of ["현장 사진 1", "현장 사진 2"]) { const b = AL("VERTICAL", { name: "[DS 없음 · 조합] 사진 자리", fill: "Fill/Normal", radius: 12, align: "CENTER", main: "CENTER" }); b.resize(100, compact ? 120 : 160); b.primaryAxisSizingMode = "FIXED"; add(b, await T(l, small, "Label/Alternative")); add(ph, b, true); }
  add(c, ph, true);
  const kv = AL("VERTICAL", { name: "보고 내용", gap: 10 });
  for (const [k, v] of [["보고자", "김현장 · 10:42 · 현장 태블릿"], ["항목", "진동 · 소음"], ["메모", "가동 중 진동이 평소보다 심하고 금속 긁히는 소리"]]) {
    const r = AL("HORIZONTAL", { name: `항목/${k}`, gap: 12 }); const kk = await T(k, "Label 1/Normal - Regular", "Label/Alternative"); add(r, kk); fixW(kk, 84); add(r, await T(v, "Label 1/Normal - Regular"), true); add(kv, r, true);
  }
  const r = AL("HORIZONTAL", { name: "항목/작업자 판단", gap: 12, align: "CENTER" }); const kk = await T("작업자 판단", "Label 1/Normal - Regular", "Label/Alternative"); add(r, kk); fixW(kk, 84);
  const g = AL("HORIZONTAL", { name: "즉시 정지", gap: 6, align: "CENTER" }); add(g, await icon("Triangle Exclamation", "Status/Negative", 18)); add(g, await T("즉시 정지", "Label 1/Normal - Bold", "Status/Negative")); add(r, g); add(kv, r, true);
  add(c, kv, true); return c;
}
async function historyCard(field, compact) {
  const small = field ? "Caption 1/Regular" : "Label 2/Regular";
  const c = card("최근 이력", { pad: compact ? [20, 16, 20, 16] : [24, 24, 24, 24] }); await cardHead(c, "이 설비 최근 이력", { tag: "[추가 제안]" });
  const tl = AL("VERTICAL", { name: "[시각화] 이력 타임라인", gap: 14 });
  for (const [d, t, now] of [["오늘 10:42", "이상 보고 · 진동 이상 (지금 이 건)", 1], ["9/29", "수리 완료 · 유압 호스 교체 · 박수리"], ["9/12", "이상 보고 · 유압 누유"]]) {
    const r = AL("HORIZONTAL", { name: "이력", gap: 12, align: "CENTER" }); const dd = await T(d, small, "Label/Alternative"); add(r, dd); fixW(dd, 72);
    add(r, dot(10, now ? "Status/Negative" : "Label/Assistive")); add(r, await T(t, "Label 1/Normal - Regular"), true); add(tl, r, true);
  }
  add(c, tl, true); return c;
}
async function head(field, compact) {
  const small = field ? "Caption 1/Regular" : "Label 2/Regular";
  const box = AL("VERTICAL", { name: "Header", gap: 8 });
  add(box, await T("설비 현황 › 이상 보고 › 수리 배정", field ? "Label 1/Normal - Regular" : "Label 1/Normal - Regular", "Label/Alternative"));
  const row = AL(compact ? "VERTICAL" : "HORIZONTAL", { name: "제목줄", gap: compact ? 10 : 16, align: compact ? undefined : "CENTER" });
  const tt = AL("HORIZONTAL", { name: "제목", gap: 12, align: "CENTER" }); add(tt, await T("프레스 3호기 · A라인", compact ? "Heading 2/Bold" : "Title 3/Bold")); add(tt, await status("가동 정지")); add(row, tt);
  if (!compact) spacer(row);
  const el = AL("VERTICAL", { name: "경과", gap: 4, align: compact ? undefined : "MAX" });
  add(el, await T("긴급 · 25분 경과", "Body 1/Normal - Bold", "Status/Negative"));
  const sub = AL("HORIZONTAL", { name: "목표", gap: 6, align: "CENTER" }); add(sub, await T("목표 30분까지 5분 남음", small, "Label/Alternative")); add(sub, await T("[추가 제안]", "Caption 1/Bold", "Primary/Normal")); add(el, sub);
  add(el, progress(25 / 30, compact ? 328 : 240, "[시각화] 목표 대비 경과"));
  add(row, el, compact); add(box, row, true); return box;
}
const out = {};
// Web
{
  const F = frame("Web/Light", 1920, 1080, 0, 0, "HORIZONTAL");
  const side = sideSrc.clone(); add(F, side); side.layoutSizingVertical = "FILL";
  const items = side.findAll((n) => n.name === "내비 항목");
  for (const it of items) {
    const t = it.findOne((n) => n.type === "TEXT"); const on = t.characters === "수리";
    it.fills = on ? [paint("Fill/Normal")] : [];
    const ic = it.findOne((n) => n.type === "INSTANCE"); for (const r of ic.children.filter((c) => c.name === "Ratio")) r.visible = false;
    for (const v of ic.findAll((x) => x.type === "VECTOR" && x.visible && Array.isArray(x.fills) && x.fills.length)) v.fills = [paint(on ? "Primary/Normal" : "Label/Alternative")];
    t.fontName = { family: "Noto Sans KR", style: on ? "Bold" : "Medium" }; t.name = on ? "Body 2/Normal - Bold" : "Body 2/Normal - Medium"; t.fills = [paint(on ? "Label/Normal" : "Label/Alternative")];
  }
  const main = AL("VERTICAL", { name: "본문", gap: 24, pad: [40, 40, 40, 40] }); add(F, main, true);
  add(main, await head(false, false), true);
  const cols = AL("HORIZONTAL", { name: "본문 2단", gap: 24 }); add(main, cols, true);
  add(cols, await focusCard(false, false), true);
  const rc = AL("VERTICAL", { name: "참고", gap: 24 }); add(cols, rc); fixW(rc, 520);
  add(rc, await reportCard(false, false), true); add(rc, await historyCard(false, false), true);
  out.web = F.id;
}
// Tablet
{
  const F = frame("Tablet/Light", 1280, 800, 0, 1300, "HORIZONTAL");
  const r = await rail("수리"); add(F, r); fixW(r, 88); r.layoutSizingVertical = "FILL";
  const main = AL("VERTICAL", { name: "본문", gap: 20, pad: [24, 24, 32, 24] }); add(F, main, true);
  add(main, await head(true, false), true);
  const cols = AL("HORIZONTAL", { name: "본문 2단", gap: 16 }); add(main, cols, true);
  add(cols, await focusCard(true, false), true);
  const rc = AL("VERTICAL", { name: "참고", gap: 16 }); add(cols, rc); fixW(rc, 380);
  add(rc, await reportCard(true, false), true); add(rc, await historyCard(true, false), true);
  out.tablet = F.id;
}
// Mobile
{
  const F = frame("Mobile/Light", 360, 740, 2700, 1300);
  F.paddingTop = 16; F.paddingLeft = F.paddingRight = 16; F.itemSpacing = 12;
  add(F, await head(true, true), true);
  add(F, await focusCard(true, true), true);
  add(F, await reportCard(true, true), true);
  add(F, await historyCard(true, true), true);
  await addTabBar(F, "수리");
  out.mobile = F.id;
}
// Dark
for (const [src, x, y] of [["Web/Light", 2020, 0], ["Tablet/Light", 1380, 1300], ["Mobile/Light", 3160, 1300]]) {
  const L = page.children.find((n) => n.name === src); L.setExplicitVariableModeForCollection(COL, "15633:1");
  const D = L.clone(); page.appendChild(D); D.name = src.replace("Light", "Dark"); D.x = x; D.y = y; D.setExplicitVariableModeForCollection(COL, "15633:2");
  out[D.name] = [D.id, Math.round(D.width), Math.round(D.height)]; out[src] = [L.id, Math.round(L.width), Math.round(L.height)];
}
return out;
