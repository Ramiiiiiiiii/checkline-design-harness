const THEME_COL = "VariableCollectionId:15633:32390"; const LIGHT = "15633:1", DARK = "15633:2";
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync("COLOR")) if (v.variableCollectionId === THEME_COL) V[v.name] = v;
const COL = await figma.variables.getVariableCollectionByIdAsync(THEME_COL);
for (const st of ["Regular", "Medium", "Bold"]) await figma.loadFontAsync({ family: "Noto Sans KR", style: st });
const SPEC = { "Display 1/": [56, 128.6], "Title 3/": [24, 133.4], "Heading 1/": [22, 136.4], "Heading 2/": [20, 140], "Headline 1/": [18, 144.5], "Body 1/Normal": [16, 150], "Body 2/Normal": [15, 146.7], "Label 1/Normal": [14, 142.9], "Caption 1/": [12, 133.4] };
const paint = (name) => figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V[name]);
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
  f.fills = o.fill ? [].concat(o.fill).map(paint) : []; if (o.radius !== undefined) f.cornerRadius = o.radius; if (o.align) f.counterAxisAlignItems = o.align; return f;
}
function add(parent, child, fillW = false) { parent.appendChild(child); if (fillW) { child.layoutSizingHorizontal = "FILL"; if (child.type === "TEXT") child.textAutoResize = "HEIGHT"; } return child; }
function fixW(node, w) { node.resize(w, node.height); node.layoutSizingHorizontal = "FIXED"; if (node.type === "TEXT") node.textAutoResize = "HEIGHT"; return node; }
function spacer(parent) { const s = AL("HORIZONTAL", { name: "spacer" }); s.resize(1, 1); add(parent, s, true); s.layoutSizingVertical = "FIXED"; s.resize(s.width, 1); return s; }
const comp = async (id) => figma.getNodeByIdAsync(id);
function setLabel(inst, str) { const t = inst.findOne((n) => n.type === "TEXT" && n.visible); if (!t) return inst; const cur = t.fontName === figma.mixed ? "Regular" : t.fontName.style; t.fontName = { family: "Noto Sans KR", style: /Bold|SemiBold/.test(cur) ? "Bold" : /Medium/.test(cur) ? "Medium" : "Regular" }; t.characters = String(str); return inst; }
async function button(label, primary = false) {
  const s = await comp("16215:37602"); const name = primary ? "Variant=Solid, Color=Primary, Size=Large, Icon Only=False, Disable=False" : "Variant=Outlined, Color=Assistive, Size=Large, Icon Only=False, Disable=False";
  return setLabel((s.children.find((c) => c.name === name) || s.defaultVariant).createInstance(), label);
}
const ICON = { stop: "16215:16616", check: "16215:14394" };
async function icon(key, color, size = 20) { const i = (await comp(ICON[key])).createInstance(); i.resize(size, size); for (const n of i.findAll((x) => (x.type === "VECTOR" || x.type === "BOOLEAN_OPERATION" || x.type === "ELLIPSE") && x.visible && Array.isArray(x.fills) && x.fills.length)) n.fills = [paint(color)]; return i; }
const STATUS = { "가동 정지": "Status/Negative", "이상": "Status/Cautionary", "미점검": "Interaction/Inactive", "수리 중": "Accent/Foreground/Violet", "정상": "Status/Positive" };
const BAR = { ...STATUS, "정상": "Line/Solid/Normal" };
async function status(s) {
  const f = AL("HORIZONTAL", { name: `Status/${s}`, gap: 6, align: "CENTER" });
  if (s === "가동 정지") add(f, await icon("stop", STATUS[s], 18)); else { const d = figma.createEllipse(); d.name = "점"; d.resize(8, 8); d.fills = [paint(STATUS[s])]; add(f, d); }
  add(f, await T(s, "Label 1/Normal - Bold", STATUS[s])); return f;
}
async function card(name, title, o = {}) {
  const c = AL("VERTICAL", { name, gap: o.gap ?? 16, pad: o.pad ?? [20, 20, 20, 20], fill: CARD, radius: 16 });
  if (title) { const head = AL("HORIZONTAL", { name: "Card Header", gap: 6, align: "CENTER" }); add(head, await T(title, "Headline 1/Bold"));
    if (o.tag) add(head, await T(o.tag, "Caption 1/Bold", "Primary/Normal")); if (o.right) { spacer(head); add(head, await T(o.right, "Label 1/Normal - Regular", "Label/Alternative")); } add(c, head, true); }
  return c;
}
function rect(w, h, color, r = 4, name = "bar") { const x = figma.createRectangle(); x.name = name; x.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); x.fills = [paint(color)]; x.cornerRadius = r; return x; }
function progress(ratio, w, name) { const f = figma.createFrame(); f.name = name; f.resize(w, 8); f.fills = [paint("Fill/Normal")]; f.cornerRadius = 4; f.clipsContent = true; f.appendChild(rect(w * ratio, 8, "Label/Neutral", 4, "value")); return f; }
const COUNTS = [["가동 정지", 2], ["이상", 5], ["미점검", 7], ["수리 중", 3], ["정상", 42]];
const LINES = [["A라인", 16, { "가동 정지": 1, "이상": 2, "미점검": 1, "수리 중": 1 }], ["B라인", 14, { "가동 정지": 1, "이상": 1, "미점검": 2, "수리 중": 1 }], ["C라인", 12, { "이상": 2, "미점검": 1, "수리 중": 1 }], ["D라인", 9, { "미점검": 1 }], ["물류", 8, { "미점검": 2 }]];
const TODO = [["가동 정지", "프레스 3호기", "A라인 · 10:42 진동 이상 · 담당 김현장", "긴급 · 25분", "수리 배정하기", 1], ["가동 정지", "컨베이어 2", "B라인 · 09:15 벨트 이탈 · 수리 중 · 박수리", "긴급 · 1시간 52분", "재가동 확인", 0], ["이상", "사출기 1호기", "A라인 · 어제 08:50 온도 상승 · 담당 박성형", "1일 3시간", "위험 등급 확정", 0]];
const STG = [["접수", 1], ["배정", 2], ["수리 중", 3], ["수리 완료", 1], ["재가동 확인", 1]];
const DAYS = [["9/27", 4], ["9/28", 3], ["9/29", 6], ["9/30", 2], ["10/1", 5], ["10/2", 3], ["10/3", 4], ["10/4", 3], ["10/5", 5], ["10/6", 2], ["10/7", 4], ["10/8", 6], ["10/9", 3], ["오늘", 4, 1]];
const elColor = (s) => (s === "가동 정지" ? "Status/Negative" : "Status/Cautionary");
async function donut(D) {
  const box = AL("HORIZONTAL", { name: "도넛·범례", gap: 24, align: "CENTER" });
  const f = figma.createFrame(); f.name = "[시각화] 상태 도넛"; f.resize(D, D); f.fills = [];
  let a = -Math.PI / 2; for (const [s, n] of COUNTS) { const sw = (2 * Math.PI * n) / 59; const e = figma.createEllipse(); e.name = s; e.resize(D, D); e.arcData = { startingAngle: a, endingAngle: a + Math.max(sw - 0.03, 0.02), innerRadius: 0.72 }; e.fills = [paint(BAR[s])]; f.appendChild(e); a += sw; }
  const n = await T("59", "Title 3/Bold", "Label/Normal", "CENTER"); f.appendChild(n); n.resize(D, n.height); n.x = 0; n.y = D / 2 - 22;
  const u = await T("전체 설비", "Caption 1/Regular", "Label/Alternative", "CENTER"); f.appendChild(u); u.resize(D, u.height); u.x = 0; u.y = D / 2 + 10;
  add(box, f);
  const lg = AL("VERTICAL", { name: "범례", gap: 8 });
  for (const [s, c] of COUNTS) { const r = AL("HORIZONTAL", { name: `범례/${s}`, gap: 8, align: "CENTER" }); add(r, await status(s)); spacer(r); add(r, await T(`${c}대`, "Body 1/Normal - Bold")); add(lg, r, true); }
  add(box, lg, true); return box;
}
async function ring(p, D) {
  const f = figma.createFrame(); f.name = "[시각화] 점검 완료율 링"; f.resize(D, D); f.fills = [];
  const bg = figma.createEllipse(); bg.name = "track"; bg.resize(D, D); bg.arcData = { startingAngle: 0, endingAngle: 2 * Math.PI, innerRadius: 0.8 }; bg.fills = [paint("Fill/Normal")]; f.appendChild(bg);
  const fg = figma.createEllipse(); fg.name = "value"; fg.resize(D, D); fg.arcData = { startingAngle: -Math.PI / 2, endingAngle: -Math.PI / 2 + 2 * Math.PI * p, innerRadius: 0.8 }; fg.fills = [paint("Label/Neutral")]; f.appendChild(fg);
  const t = await T(`${Math.round(p * 100)}%`, "Headline 1/Bold", "Label/Normal", "CENTER"); f.appendChild(t); t.resize(D, t.height); t.x = 0; t.y = D / 2 - 13; return f;
}
async function cols(items, max, name, o = {}) {
  const f = AL("HORIZONTAL", { name, gap: o.gap ?? 8, align: "MAX" });
  for (const [l, n, today] of items) {
    const c = AL("VERTICAL", { name: `막대/${l}`, gap: 6, align: "CENTER" });
    if (o.nums !== false) add(c, await T(String(n), today || o.boldNums ? "Label 1/Normal - Bold" : "Caption 1/Regular", today || o.boldNums ? "Label/Normal" : "Label/Alternative"));
    const r = rect(10, Math.max(4, (n / max) * (o.h ?? 80)), today ? "Label/Neutral" : "Label/Assistive", 4, "값"); add(c, r); r.layoutSizingHorizontal = "FILL";
    if (o.labels !== false) add(c, await T(l, today ? "Caption 1/Bold" : "Caption 1/Regular", today ? "Label/Normal" : "Label/Alternative", "CENTER"), true);
    add(f, c, true);
  }
  return f;
}
async function lineBars(trackW, labelW) {
  const f = AL("VERTICAL", { name: "[시각화] 라인별 막대", gap: 12 });
  for (const [ln, total, m] of LINES) {
    const row = AL("HORIZONTAL", { name: `라인/${ln}`, gap: 10, align: "CENTER" });
    const l = await T(ln, "Label 1/Normal - Bold", "Label/Neutral"); add(row, l); fixW(l, labelW);
    const track = AL("HORIZONTAL", { name: "막대", gap: 2 });
    const parts = ["가동 정지", "이상", "미점검", "수리 중"].map((s) => [s, m[s] || 0]); const ok = total - parts.reduce((a, p) => a + p[1], 0);
    for (const [s, n] of parts.concat([["정상", ok]])) if (n) add(track, rect((trackW * n) / 16, 12, BAR[s], 4, s));
    add(row, track); spacer(row); add(row, await T(`${total}대`, "Label 1/Normal - Regular", "Label/Alternative")); add(f, row, true);
  }
  return f;
}
async function inspectRows(w) {
  const ls = AL("VERTICAL", { name: "라인별 점검", gap: 8 });
  for (const [ln, t, m] of LINES) { const d = t - (m["미점검"] || 0); const row = AL("HORIZONTAL", { name: `점검/${ln}`, gap: 8, align: "CENTER" });
    const l = await T(ln, "Caption 1/Medium", "Label/Neutral"); add(row, l); fixW(l, 40); add(row, progress(d / t, w, `[시각화] ${ln} 점검률`)); spacer(row);
    add(row, await T(`${d}/${t}`, "Caption 1/Regular", "Label/Alternative")); add(ls, row, true); }
  return ls;
}
function frame(page, name, w, h, x, y) {
  const F = figma.createFrame(); F.name = name; F.x = x; F.y = y; F.layoutMode = "VERTICAL"; F.counterAxisSizingMode = "FIXED"; F.resize(w, h); F.primaryAxisSizingMode = "AUTO"; F.minHeight = h;
  F.fills = [paint("Background/Normal/Alternative"), paint("Fill/Alternative")]; page.appendChild(F); return F;
}

let page = figma.root.children.find((p) => p.name === "P4 확장"); if (!page) { page = figma.createPage(); page.name = "P4 확장"; }
await figma.setCurrentPageAsync(page);
for (const n of [...page.children]) n.remove();

// ── Web: 승인된 A 프레임 복제
const A = await figma.getNodeByIdAsync("15644:46465");
const wl = A.clone(); page.appendChild(wl); wl.name = "Web/Light"; wl.x = 0; wl.y = 0;

// ── Tablet 1280×800
{
const F = frame(page, "Tablet/Light", 1280, 800, 0, 1300);
F.paddingTop = 24; F.paddingBottom = 32; F.paddingLeft = F.paddingRight = 24; F.itemSpacing = 16;
const h = AL("HORIZONTAL", { name: "Header", gap: 12, align: "CENTER" }); add(F, h, true);
add(h, await icon("check", "Primary/Normal", 24)); add(h, await T("체크라인", "Headline 1/Bold", "Primary/Normal"));
add(h, await T("설비 현황", "Heading 1/Bold")); spacer(h);
add(h, await T("10월 10일 · 11:20 갱신", "Label 1/Normal - Regular", "Label/Alternative")); add(h, await button("전체 라인"));
const hero = AL("HORIZONTAL", { name: "[주목] 지금 처리할 일", gap: 32, pad: [24, 24, 24, 24], fill: CARD, radius: 16 }); add(F, hero, true);
const lt = AL("VERTICAL", { name: "요약", gap: 8 }); add(hero, lt); fixW(lt, 220);
add(lt, await T("지금 처리할 일", "Headline 1/Bold", "Label/Neutral"));
const nr = AL("HORIZONTAL", { name: "숫자", gap: 6, align: "MAX" }); add(nr, await T("3", "Display 1/Bold")); add(nr, await T("건", "Title 3/Bold", "Label/Neutral")); add(lt, nr);
add(lt, await T("가동 정지 2대 · 24시간 넘은 이상 1건", "Label 1/Normal - Regular", "Label/Alternative"), true);
const list = AL("VERTICAL", { name: "처리 목록" }); add(hero, list, true);
for (let i = 0; i < TODO.length; i++) { const r = TODO[i];
  const row = AL("HORIZONTAL", { name: "처리 항목", gap: 16, pad: [12, 0, 12, 0], align: "CENTER" });
  const sw = AL("HORIZONTAL", { name: "상태 칸" }); add(row, sw); fixW(sw, 104); add(sw, await status(r[0]));
  const info = AL("VERTICAL", { name: "정보", gap: 2 }); add(info, await T(r[1], "Headline 1/Bold")); add(info, await T(r[2], "Label 1/Normal - Regular", "Label/Alternative")); add(row, info, true);
  const el = await T(r[3], "Body 1/Normal - Bold", elColor(r[0]), "RIGHT"); add(row, el); fixW(el, 150);
  add(row, await button(r[4], !!r[5])); add(list, row, true);
  if (i < TODO.length - 1) add(list, rect(10, 1, "Line/Solid/Normal", 0, "구분선"), true); }
const g3 = AL("HORIZONTAL", { name: "현황", gap: 16 }); add(F, g3, true);
const c1 = await card("상태 분포", "전체 59대 상태"); add(g3, c1, true); add(c1, await donut(132), true);
const c2 = await card("오늘 점검", "오늘 점검", { right: "52 / 59대" }); add(g3, c2, true);
const rr = AL("HORIZONTAL", { name: "링·라인", gap: 20, align: "CENTER" }); add(rr, await ring(52 / 59, 108)); add(rr, await inspectRows(100), true); add(c2, rr, true);
add(c2, await button("미점검 7대 알림"));
const c3 = await card("수리 진행 단계", "수리 진행 단계"); add(g3, c3, true); add(c3, await cols(STG, 3, "[시각화] 수리 단계 막대", { boldNums: true, h: 96 }), true);
const g2 = AL("HORIZONTAL", { name: "추이·라인", gap: 16 }); add(F, g2, true);
const c4 = await card("최근 2주 이상 보고", "최근 2주 이상 보고", { tag: "[추가 제안]", right: "하루 평균 4건" }); add(g2, c4, true);
add(c4, await cols(DAYS, 6, "[시각화] 2주 이상 보고 막대", { gap: 6, h: 80 }), true);
const c5 = await card("라인별 설비", "라인별 설비"); add(g2, c5); fixW(c5, 500); add(c5, await lineBars(300, 52), true);
for (const row of [g3, g2]) for (const c of row.children) c.layoutSizingVertical = "FILL";
}
// ── Mobile 360×740
{
const F = frame(page, "Mobile/Light", 360, 740, 2700, 1300);
F.paddingTop = 16; F.paddingBottom = 24; F.paddingLeft = F.paddingRight = 16; F.itemSpacing = 12;
const h = AL("HORIZONTAL", { name: "App Bar", gap: 8, pad: [4, 0, 4, 0], align: "CENTER" }); add(F, h, true);
add(h, await icon("check", "Primary/Normal", 24)); add(h, await T("설비 현황", "Headline 1/Bold")); spacer(h); add(h, await T("11:20 갱신", "Caption 1/Regular", "Label/Alternative"));
const fb = await button("전체 라인"); add(F, fb, true);
const hero = AL("VERTICAL", { name: "[주목] 지금 처리할 일", gap: 4, pad: [20, 16, 12, 16], fill: CARD, radius: 16 }); add(F, hero, true);
const hh = AL("HORIZONTAL", { name: "요약", gap: 4, align: "MAX" }); add(hh, await T("지금 처리할 일", "Headline 1/Bold", "Label/Neutral")); spacer(hh); add(hh, await T("3", "Title 3/Bold")); add(hh, await T("건", "Body 1/Normal - Bold", "Label/Neutral")); add(hero, hh, true);
for (let i = 0; i < TODO.length; i++) { const r = TODO[i];
  if (i) add(hero, rect(10, 1, "Line/Solid/Normal", 0, "구분선"), true);
  const it = AL("VERTICAL", { name: "처리 항목", gap: 6, pad: [14, 0, 14, 0] });
  const top = AL("HORIZONTAL", { name: "상태·경과", gap: 8, align: "CENTER" }); add(top, await status(r[0])); spacer(top); add(top, await T(r[3], "Label 1/Normal - Bold", elColor(r[0]))); add(it, top, true);
  add(it, await T(r[1], "Headline 1/Bold"), true); add(it, await T(r[2], "Label 1/Normal - Regular", "Label/Alternative"), true);
  const b = await button(r[4], !!r[5]); add(it, b, true); add(hero, it, true); }
const c1 = await card("상태 분포", "전체 59대 상태"); add(F, c1, true); add(c1, await donut(112), true);
const c2 = await card("오늘 점검", "오늘 점검", { right: "52 / 59대" }); add(F, c2, true);
const rr = AL("HORIZONTAL", { name: "링·요약", gap: 16, align: "CENTER" }); add(rr, await ring(52 / 59, 88));
const rs = AL("VERTICAL", { name: "미점검", gap: 2 }); add(rs, await status("미점검")); add(rs, await T("7대 · 컴프레서 1, 지게차 2 외", "Label 1/Normal - Regular", "Label/Alternative"), true); add(rr, rs, true);
add(c2, rr, true); add(c2, await inspectRows(150), true); add(c2, await button("미점검 7대 알림"), true);
const c3 = await card("수리 진행 단계", "수리 진행 단계"); add(F, c3, true); add(c3, await cols(STG, 3, "[시각화] 수리 단계 막대", { boldNums: true, h: 72 }), true);
const c5 = await card("라인별 설비", "라인별 설비"); add(F, c5, true); add(c5, await lineBars(170, 44), true);
const c4 = await card("최근 2주 이상 보고", "최근 2주 이상 보고", { tag: "[추가 제안]" }); add(F, c4, true);
add(c4, await cols(DAYS, 6, "[시각화] 2주 이상 보고 막대", { gap: 4, h: 64, nums: false, labels: false }), true);
const ax = AL("HORIZONTAL", { name: "축", align: "CENTER" }); add(ax, await T("9/27", "Caption 1/Regular", "Label/Alternative")); spacer(ax); add(ax, await T("하루 평균 4건 · 오늘 4건", "Caption 1/Bold", "Label/Normal")); add(c4, ax, true);
}
// ── Dark: 복제 + Theme 모드
const out = {};
for (const [src, x, y] of [["Web/Light", 2020, 0], ["Tablet/Light", 1380, 1300], ["Mobile/Light", 3160, 1300]]) {
  const L = page.findOne((n) => n.name === src && n.parent === page); L.setExplicitVariableModeForCollection(COL, LIGHT);
  const D = L.clone(); page.appendChild(D); D.name = src.replace("Light", "Dark"); D.x = x; D.y = y; D.setExplicitVariableModeForCollection(COL, DARK);
  out[src] = [L.id, L.width, L.height]; out[D.name] = [D.id, D.width, D.height];
}
return out;
