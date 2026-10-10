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
