// 관리자 화면(admin.html)에서 수정한 콘텐츠·디자인 값을 Supabase에서 불러와
// 페이지에 적용합니다. 네트워크 오류 시 기존 정적 HTML이 그대로 보입니다.
(function () {
  const SUPABASE_URL = (window.SUPA && window.SUPA.URL) || "https://jqxhdajpehnwaewrfjld.supabase.co";
  const SUPABASE_ANON_KEY = (window.SUPA && window.SUPA.ANON_KEY) || "sb_publishable_aD4lD4JuNZWJrjFUVUpOLQ_0rc9r8dx";

  function applySettings(rows) {
    rows.forEach((row) => {
      if (row.group_name === "theme") {
        const cssVar = "--" + row.key.replace(/^color-/, "");
        document.documentElement.style.setProperty(cssVar, row.value);
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
  }

  fetch(SUPABASE_URL + "/rest/v1/site_settings?select=key,value,group_name", {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then(applySettings)
    .catch((err) => console.warn("CMS 콘텐츠를 불러오지 못해 기본 내용을 표시합니다.", err));
})();
