// 방문 통계 — 페이지뷰 1건을 Supabase page_views 에 기록(익명, 개인정보 없음).
// 편집/미리보기/관리자 화면은 집계에서 제외. 실패해도 사이트에 영향 없음.
(function () {
  try {
    if (/[?&](edit|preview)=1(&|$)/.test(location.search)) return;
    if (/admin\.html$/.test(location.pathname)) return;
    var S = window.SUPA;
    if (!S || !S.URL) return;

    // 세션 식별자 (기기 로컬, 개인정보 아님)
    var sid = localStorage.getItem("jc_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("jc_sid", sid);
    }

    // 같은 세션에서 같은 경로 30분 내 중복 제외
    var path = location.pathname.replace(/index\.html$/, "") || "/";
    var dedupeKey = "jc_v_" + path;
    var last = +sessionStorage.getItem(dedupeKey) || 0;
    if (Date.now() - last < 30 * 60 * 1000) return;
    sessionStorage.setItem(dedupeKey, String(Date.now()));

    var w = window.innerWidth || 0;
    var device = w <= 640 ? "mobile" : w <= 1024 ? "tablet" : "desktop";

    fetch(S.URL + "/rest/v1/page_views", {
      method: "POST",
      headers: {
        apikey: S.ANON_KEY,
        Authorization: "Bearer " + S.ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        path: path,
        referrer: document.referrer || "",
        session_id: sid,
        device: device,
      }),
      keepalive: true,
    }).catch(function () {});
  } catch (e) {}
})();
