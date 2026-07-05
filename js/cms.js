// 관리자 화면(admin.html)에서 수정한 콘텐츠·디자인 값을 Supabase에서 불러와
// 페이지에 적용합니다. 네트워크 오류 시 기존 정적 HTML이 그대로 보입니다.
// v5: data-cms-list(반복 항목 HTML) + layout_<page>(섹션 순서/숨김) 적용 추가.
(function () {
  const SUPABASE_URL = (window.SUPA && window.SUPA.URL) || "https://jqxhdajpehnwaewrfjld.supabase.co";
  const SUPABASE_ANON_KEY = (window.SUPA && window.SUPA.ANON_KEY) || "sb_publishable_aD4lD4JuNZWJrjFUVUpOLQ_0rc9r8dx";

  // 현재 페이지 이름 → layout_<page> 키 매칭 (index.html → home)
  const PAGE = (function () {
    const f = location.pathname.split("/").pop();
    return !f || f === "index.html" ? "home" : f.replace(/\.html$/, "");
  })();

  const st = document.createElement("style");
  st.textContent = ".cms-sec-hidden{display:none!important}";
  document.head.appendChild(st);

  // innerHTML 교체 뒤의 .reveal 요소는 IntersectionObserver(main.js)가 다시
  // 관찰하지 않으므로 바로 표시 상태로 만든다.
  function showReveals(el) {
    if (el.classList.contains("reveal")) el.classList.add("visible");
    el.querySelectorAll(".reveal").forEach((n) => n.classList.add("visible"));
  }

  // layout_<page> JSON: [{"id":"identity","hidden":false}, …] — 순서대로 재배치 + 숨김
  function applyLayout(json) {
    let list;
    try { list = JSON.parse(json); } catch (e) { return; }
    if (!Array.isArray(list)) return;
    const byParent = new Map();
    list.forEach((it) => {
      const el = it && it.id && document.querySelector('[data-section="' + it.id + '"]');
      if (!el) return;
      if (it.hidden) el.classList.add("cms-sec-hidden");
      if (!byParent.has(el.parentNode)) byParent.set(el.parentNode, []);
      byParent.get(el.parentNode).push(el);
    });
    byParent.forEach((els, parent) => {
      // 문서상 가장 앞에 있는 섹션 위치를 기준으로 layout 순서대로 다시 끼워넣기
      const first = els.slice().sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)[0];
      const marker = document.createComment("cms-layout");
      parent.insertBefore(marker, first);
      els.forEach((el) => parent.insertBefore(el, marker));
      parent.removeChild(marker);
    });
  }

  function applySettings(rows) {
    let layout = null;
    // 1) 반복 항목(리스트) 먼저 — 안의 개별 키는 2단계에서 덮어쓴다
    rows.forEach((row) => {
      if (row.value == null) return;
      document.querySelectorAll('[data-cms-list="' + row.key + '"]').forEach((el) => {
        el.innerHTML = row.value;
        showReveals(el);
      });
    });
    // 2) 개별 값
    rows.forEach((row) => {
      if (row.value == null) return;
      if (row.group_name === "theme") {
        const cssVar = "--" + row.key.replace(/^color-/, "");
        document.documentElement.style.setProperty(cssVar, row.value);
      } else if (row.key === "layout_" + PAGE) {
        layout = row.value;
      } else {
        // 텍스트/HTML 내용
        document.querySelectorAll('[data-cms="' + row.key + '"]').forEach((el) => {
          el.innerHTML = row.value;
        });
        // 링크 주소 (href)
        document.querySelectorAll('[data-cms-href="' + row.key + '"]').forEach((el) => {
          el.setAttribute("href", row.value);
        });
        // 이미지 주소 (src)
        document.querySelectorAll('[data-cms-src="' + row.key + '"]').forEach((el) => {
          el.setAttribute("src", row.value);
        });
      }
    });
    // 3) 섹션 순서/숨김
    if (layout) applyLayout(layout);
  }

  fetch(SUPABASE_URL + "/rest/v1/public_site_settings?select=key,value,group_name", {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then(applySettings)
    .catch((err) => console.warn("CMS 콘텐츠를 불러오지 못해 기본 내용을 표시합니다.", err));
})();
