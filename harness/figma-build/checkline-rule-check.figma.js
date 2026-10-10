// 체크라인 디자인 하네스 — Figma 검사 코드 템플릿 (직접 실행하지 않음)
// 실행 코드는 'node harness/scripts/verify.mjs figma-code <g3|g4|g5> <slug> [--mode export]' 가 만든다.
//   - rules.yaml 의 figma 섹션과 figma-check.lib.js 를 이 템플릿에 끼워 넣는다 (규칙 SSOT 유지).
//   - export 모드: 작업 에이전트가 실행 → 반환 JSON 을 figma-export.json 으로 저장
//   - digest 모드: judge 가 실행 → { digest } 만 반환
// use_figma 반환 한도(20KB) 때문에 전체 노드는 돌려주지 않고, Figma 안에서 검사한 위반 목록과 프레임 요약만 돌려준다.
// 수집 범위: 페이지 최상위 FRAME 과 그 하위 노드. INSTANCE 안쪽(원티드 DS 내부)은 들어가지 않는다.
const MODE = "export";

const F = {"export_file":"figma-export.json","require_digest":true,"allowed_color_variables":["Primary/Normal","Primary/Strong","Label/Normal","Label/Strong","Label/Neutral","Label/Alternative","Label/Assistive","Label/Disable","Background/Normal/Normal","Background/Normal/Alternative","Background/Elevated/Normal","Line/Normal/Normal","Line/Solid/Normal","Fill/Normal","Fill/Alternative","Interaction/Disable","Material/Dimmer","Status/Positive","Status/Cautionary","Status/Negative","Interaction/Inactive","Accent/Foreground/Violet","Static/White","Static/Black"],"allowed_text_styles":["Display 1/","Title 3/","Heading 1/","Heading 2/","Headline 1/","Body 1/Normal","Body 2/Normal","Label 1/Normal","Label 2/","Caption 1/"],"text_fallback":{"enabled":true,"font":"Noto Sans KR","weight_map":{"Regular":"Regular","Medium":"Medium","Bold":"Bold"},"line_height_tolerance":0.6,"specs":{"Display 1/":[56,128.6],"Title 3/":[24,133.4],"Heading 1/":[22,136.4],"Heading 2/":[20,140],"Headline 1/":[18,144.5],"Body 1/Normal":[16,150],"Body 2/Normal":[15,146.7],"Label 1/Normal":[14,142.9],"Label 2/":[13,138.5],"Caption 1/":[12,133.4]}},"field_min_font_size":14,"field_small_ok_styles":["Caption 1/"],"allowed_spacing":[0,2,4,6,8,10,12,14,16,20,24,32,40,48,56,64,72,80],"allowed_radius":[0,4,8,10,12,14,16,20,24,28,32,9999],"field_frame_widths":[1280,360],"min_touch_height":48,"interactive_components":["Button/","Segmented Control/","Chip/","Control/","Select/","Textinput/","List Cell/","Tab/"],"icon_component_prefix":["Icon/","Icons/"],"stop_text":"가동 정지","stop_label_max_len":10,"local_component_tag":"[DS 없음","viz_tag":"[시각화]","min_viz_per_frame":1,"no_status_stroke_prefix":"Status/","no_translucent_outside_viz":true,"focus_tag":"[주목]","focus_per_frame":1};
// 체크라인 디자인 하네스 — Figma 프레임 검사 로직 (공용)
// 같은 소스를 두 곳에서 쓴다: ① Figma 안(use_figma 코드에 그대로 삽입) ② verify.mjs·테스트(Node).
// 입력: frames(전체 노드), F(rules.yaml 의 figma 섹션), localComponents
// 출력: 위반 문자열 배열
function checkFramesCore(frames, F, localComponents) {
  const v = [];
  const fieldW = new Set(F.field_frame_widths);
  const allowedVar = new Set(F.allowed_color_variables);
  const okStyle = (s) => !!s && F.allowed_text_styles.some((p) => s.startsWith(p));
  for (const fr of frames) {
    const tag = `[${fr.name}]`;
    const field = fieldW.has(fr.width);
    const nodes = fr.nodes || [];
    const all = [Object.assign({}, fr, { parent: null })].concat(nodes);
    for (const n of all) {
      const at = `${tag} ${n.name || n.type} (${n.id})`;
      for (const kind of n.type === "INSTANCE" ? [] : ["fills", "strokes"]) // 인스턴스 자체의 채움·보더는 원티드 DS 소유
        for (const p of n[kind] || []) {
          if (p.type === "IMAGE") continue;
          if (!p.var) v.push(`미연결 색: ${at} ${kind} ${p.hex || p.type} — 변수에 연결해야 다크 모드가 동작함`);
          else if (!allowedVar.has(p.var)) v.push(`허용 외 색 변수: ${at} ${p.var}`);
        }
      if (n.type === "TEXT") {
        if (!okStyle(n.textStyle)) {
          const fb = F.text_fallback;
          const pre = fb && fb.enabled && !n.textStyle ? Object.keys(fb.specs).find((q) => (n.name || "").startsWith(q)) : null;
          if (!pre) v.push(`허용 외 텍스트 스타일: ${at} ${n.textStyle || "스타일 없음"}${fb && fb.enabled ? " (대체 글꼴이면 레이어 이름을 원티드 스타일 이름으로)" : ""}`);
          else {
            const size = fb.specs[pre][0], lh = fb.specs[pre][1];
            const word = Object.keys(fb.weight_map).find((w) => (n.name || "").endsWith(w)) || "Regular";
            const want = fb.weight_map[word];
            const bad = [];
            if (n.fontFamily !== fb.font) bad.push(`글꼴 ${n.fontFamily}≠${fb.font}`);
            if (n.fontSize !== size) bad.push(`크기 ${n.fontSize}≠${size}`);
            if (n.fontStyle !== want) bad.push(`굵기 ${n.fontStyle}≠${want}`);
            if (typeof n.lineHeight !== "number" || Math.abs(n.lineHeight - lh) > fb.line_height_tolerance) bad.push(`행간 ${n.lineHeight}≠${lh}%`);
            if (bad.length) v.push(`대체 글꼴 값 불일치: ${at} (${pre}) ${bad.join(", ")}`);
          }
        }
        if (field && typeof n.fontSize === "number" && n.fontSize < F.field_min_font_size && !F.field_small_ok_styles.some((q) => (n.textStyle || n.name || "").startsWith(q)))
          v.push(`현장 화면 글자 크기: ${at} ${n.fontSize}px < ${F.field_min_font_size}px`);
      }
      if (n.type !== "INSTANCE" && F.no_status_stroke_prefix) // ⑩
        for (const p of n.strokes || []) if ((p.var || "").startsWith(F.no_status_stroke_prefix)) v.push(`상태 색 테두리 금지: ${at} ${p.var} — 강조는 크기·위치·굵기로`);
      if (F.no_translucent_outside_viz && typeof n.opacity === "number" && n.opacity < 1 && !n.inViz) // ⑪
        v.push(`옅은 바탕 금지: ${at} 불투명도 ${n.opacity} — [시각화] 밖에서는 반투명 레이어를 쓰지 않음 (상태 = 아이콘·점 + 색 글자)`);
      if (n.type !== "INSTANCE") { // 인스턴스 자체의 모서리·간격은 원티드 DS가 정한 값이라 검사하지 않음
        for (const r of [].concat(n.radius === undefined ? [] : n.radius)) if (!F.allowed_radius.includes(r)) v.push(`허용 외 모서리: ${at} ${r}`);
        for (const s of [n.gap].concat(n.padding || []).filter((x) => typeof x === "number"))
          if (!F.allowed_spacing.includes(s)) v.push(`허용 외 간격: ${at} ${s}`);
      }
      if (field && n.type === "INSTANCE" && F.interactive_components.some((q) => (n.component || "").startsWith(q)) && n.h < F.min_touch_height)
        v.push(`터치 영역: ${at} ${n.component} 높이 ${n.h} < ${F.min_touch_height}`);
    }
    if (F.viz_tag) {
      const nViz = nodes.filter((x) => (x.name || "").includes(F.viz_tag)).length;
      if (nViz < (F.min_viz_per_frame || 0)) v.push(`시각화 부족: ${tag} '${F.viz_tag}' 요소 ${nViz}개 < ${F.min_viz_per_frame}개 — 글자·목록만으로 된 화면 (차트·진행 막대·히트맵 등 필요)`);
    }
    if (F.focus_tag) { // ⑫
      const nF = nodes.filter((x) => (x.name || "").includes(F.focus_tag)).length;
      if (nF !== F.focus_per_frame) v.push(`주목 영역 개수: ${tag} '${F.focus_tag}' ${nF}개 ≠ ${F.focus_per_frame}개 — 시선이 갈 곳을 한 곳으로`);
    }
    const isIcon = (x) => x.type === "INSTANCE" && (F.icon_component_prefix.some((q) => (x.component || "").startsWith(q)) || /icon/i.test(x.name || ""));
    for (const n of nodes) {
      const txt = (n.text || "").trim();
      if (!txt.includes(F.stop_text) || txt.length > F.stop_label_max_len) continue; // 상태 라벨만 (설명 문장 제외)
      const ok = (n.type === "INSTANCE" && n.hasIcon) || nodes.some((s) => s.id !== n.id && s.parent === n.parent && (isIcon(s) || s.hasIcon));
      if (!ok) v.push(`★1 가동 정지 아이콘 없음: ${tag} ${n.name} (${n.id}) — 색+아이콘+텍스트를 함께 써야 함`);
    }
  }
  for (const c of localComponents || [])
    if (!c.includes(F.local_component_tag)) v.push(`DS 없음 미표기: 로컬 컴포넌트 '${c}' — 원티드 DS에 있는 건 인스턴스로, 없는 건 '[DS 없음 · 조합]' 표기`);
  return v;
}


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

const frames = [];
const localComponents = [];
for (const page of figma.root.children) {
await figma.setCurrentPageAsync(page);
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
  const root = { id: fr.id, name: page.name + " / " + fr.name, width: Math.round(fr.width), height: Math.round(fr.height), mode: await modeOf(fr), fills: await paints(fr.fills) };
  if ("cornerRadius" in fr && fr.cornerRadius !== figma.mixed) root.radius = Math.round(fr.cornerRadius);
  for (const c of fr.children) await visit(c, fr.id, false);
  root.nodes = nodes;
  frames.push(root);
}

}
const all = checkFramesCore(frames, F, localComponents);
return { frames: frames.map((f) => `${f.name} ${f.width}x${f.height} ${f.mode} nodes ${f.nodes.length}`), violationCount: all.length, violations: all.slice(0, 60) };
