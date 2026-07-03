// 인라인 편집 모드 — 실제 사이트를 보면서 클릭해서 바로 수정.
// 주소에 ?edit=1 이 있을 때만 동작하며, 관리자 로그인이 있어야 저장됩니다.
// 편집 대상: data-cms(내용) · data-cms-href(링크) · data-cms-src(이미지) 가 붙은 요소.
(function () {
  if (!/[?&]edit=1(&|$)/.test(location.search)) return; // 일반 방문자에겐 아무 영향 없음

  var SUPABASE_URL = "https://jqxhdajpehnwaewrfjld.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_aD4lD4JuNZWJrjFUVUpOLQ_0rc9r8dx";
  var sb = null;

  // ---- 스타일 ----
  var css =
    ".cms-edit-mode .promo{display:none!important;}" +
    "[data-cms],[data-cms-href],[data-cms-src]{cursor:pointer;}" +
    ".cms-edit-mode [data-cms],.cms-edit-mode [data-cms-href],.cms-edit-mode [data-cms-src]{outline:1.5px dashed rgba(66,140,185,.5);outline-offset:3px;transition:outline-color .15s;}" +
    ".cms-edit-mode [data-cms]:hover,.cms-edit-mode [data-cms-href]:hover,.cms-edit-mode [data-cms-src]:hover{outline:2px solid #428cb9;outline-offset:3px;background:rgba(66,140,185,.06);}" +
    "#cms-bar{position:fixed;top:0;left:0;right:0;z-index:99998;background:#1d1d1f;color:#fff;font:600 14px/1 -apple-system,'Apple SD Gothic Neo',sans-serif;display:flex;align-items:center;justify-content:space-between;padding:11px 16px;box-shadow:0 2px 10px rgba(0,0,0,.2);}" +
    "#cms-bar .t{display:flex;align-items:center;gap:8px;}#cms-bar .dot{color:#f4c430;}" +
    "#cms-bar button{font:inherit;background:#fff;color:#1d1d1f;border:0;border-radius:8px;padding:8px 14px;cursor:pointer;}" +
    "body.cms-has-bar{padding-top:44px;}" +
    "#cms-pop{position:fixed;z-index:99999;left:50%;bottom:22px;transform:translateX(-50%);width:min(560px,92vw);background:#fff;color:#1d1d1f;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.28);padding:18px 18px 16px;font:14px/1.5 -apple-system,'Apple SD Gothic Neo',sans-serif;}" +
    "#cms-pop h4{font-size:15px;font-weight:800;margin:0 0 3px;}#cms-pop .k{font-size:12px;color:#888;margin:0 0 12px;}" +
    "#cms-pop textarea,#cms-pop input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #d2d2d7;border-radius:12px;font:inherit;font-size:14.5px;line-height:1.6;background:#fff;}" +
    "#cms-pop textarea{min-height:96px;resize:vertical;}" +
    "#cms-pop .foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:12px;}" +
    "#cms-pop .msg{margin-right:auto;color:#888;font-size:13px;}" +
    "#cms-pop .btn-primary{background:#428cb9;color:#fff;border:0;border-radius:10px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer;}" +
    "#cms-pop .btn-ghost{background:transparent;border:0;color:#6e6e73;padding:10px 8px;cursor:pointer;font:inherit;}" +
    "#cms-hint{font-size:12.5px;color:#a1a1a6;font-weight:500;}" +
    "#cms-login{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;}" +
    "#cms-login .box{background:#fff;border-radius:16px;padding:24px;width:min(340px,90vw);font:14px -apple-system,'Apple SD Gothic Neo',sans-serif;}" +
    "#cms-login h3{margin:0 0 14px;font-size:17px;font-weight:800;}" +
    "#cms-login input{width:100%;box-sizing:border-box;padding:11px 13px;margin-bottom:9px;border:1px solid #d2d2d7;border-radius:10px;font:inherit;}" +
    "#cms-login button{width:100%;padding:11px;border:0;border-radius:10px;background:#428cb9;color:#fff;font:inherit;font-weight:700;cursor:pointer;}" +
    "#cms-login .err{color:#c0392b;font-size:13px;margin-top:8px;min-height:16px;}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  // supabase-js 동적 로드
  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
  s.onload = init;
  s.onerror = function () { alert("편집 도구를 불러오지 못했습니다. 네트워크를 확인해 주세요."); };
  document.head.appendChild(s);

  function init() {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) enable();
      else showLogin();
    });
  }

  // ---- 로그인 오버레이 ----
  function showLogin() {
    var o = document.createElement("div");
    o.id = "cms-login";
    o.innerHTML =
      '<div class="box"><h3>관리자 로그인</h3>' +
      '<input id="cms-le" type="email" placeholder="이메일" autocomplete="username">' +
      '<input id="cms-lp" type="password" placeholder="비밀번호" autocomplete="current-password">' +
      '<button id="cms-lb">로그인</button><p class="err" id="cms-lerr"></p></div>';
    document.body.appendChild(o);
    document.getElementById("cms-lb").addEventListener("click", function () {
      var email = document.getElementById("cms-le").value.trim();
      var password = document.getElementById("cms-lp").value;
      sb.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
        if (r.error) document.getElementById("cms-lerr").textContent = r.error.message;
        else { o.remove(); enable(); }
      });
    });
  }

  // ---- 편집 활성화 ----
  function enable() {
    document.documentElement.classList.add("cms-edit-mode");
    document.body.classList.add("cms-has-bar");

    var bar = document.createElement("div");
    bar.id = "cms-bar";
    bar.innerHTML =
      '<span class="t"><span class="dot">✎</span> 편집 모드 <span id="cms-hint">— 바꾸고 싶은 부분을 클릭하세요</span></span>' +
      "<button id=\"cms-exit\">나가기</button>";
    document.body.appendChild(bar);
    document.getElementById("cms-exit").addEventListener("click", function () {
      location.href = location.pathname + location.hash;
    });

    // 편집 요소 클릭 가로채기 (링크 이동 방지)
    document.addEventListener("click", onClick, true);
  }

  function onClick(e) {
    var el = e.target.closest("[data-cms],[data-cms-href],[data-cms-src]");
    if (!el) return;
    if (e.target.closest("#cms-bar,#cms-pop,#cms-login")) return;
    e.preventDefault();
    e.stopPropagation();
    openEditor(el);
  }

  function fieldOf(el) {
    if (el.hasAttribute("data-cms")) return { key: el.getAttribute("data-cms"), type: "content", cur: el.innerHTML.trim() };
    if (el.hasAttribute("data-cms-href")) return { key: el.getAttribute("data-cms-href"), type: "href", cur: el.getAttribute("href") || "" };
    return { key: el.getAttribute("data-cms-src"), type: "src", cur: el.getAttribute("src") || "" };
  }

  var pop = null;
  function openEditor(el) {
    if (pop) pop.remove();
    var f = fieldOf(el);
    var multiline = f.type === "content";
    pop = document.createElement("div");
    pop.id = "cms-pop";
    var typeLabel = f.type === "content" ? "내용" : f.type === "href" ? "링크 주소" : "이미지 주소";
    pop.innerHTML =
      "<h4>" + typeLabel + " 편집</h4><p class=\"k\">" + f.key + "</p>" +
      (multiline
        ? '<textarea id="cms-val"></textarea>'
        : '<input id="cms-val" type="text" placeholder="https://… 또는 worship.html">') +
      '<div class="foot"><span class="msg" id="cms-msg"></span>' +
      '<button class="btn-ghost" id="cms-cancel">취소</button>' +
      '<button class="btn-primary" id="cms-save">저장</button></div>';
    document.body.appendChild(pop);
    var input = document.getElementById("cms-val");
    input.value = f.cur;
    input.focus();

    document.getElementById("cms-cancel").addEventListener("click", function () { pop.remove(); pop = null; });
    document.getElementById("cms-save").addEventListener("click", function () {
      var val = input.value;
      var msg = document.getElementById("cms-msg");
      msg.textContent = "저장 중…";
      sb.from("site_settings")
        .update({ value: val, updated_at: new Date().toISOString() })
        .eq("key", f.key)
        .then(function (r) {
          if (r.error) { msg.textContent = "오류: " + r.error.message; return; }
          applyLive(f.key, f.type, val);
          msg.textContent = "저장됨 ✓";
          setTimeout(function () { if (pop) { pop.remove(); pop = null; } }, 700);
        });
    });
  }

  // 저장 즉시 화면에 반영 (같은 key를 쓰는 모든 요소)
  function applyLive(key, type, val) {
    if (type === "content")
      document.querySelectorAll('[data-cms="' + key + '"]').forEach(function (el) { el.innerHTML = val; });
    else if (type === "href")
      document.querySelectorAll('[data-cms-href="' + key + '"]').forEach(function (el) { el.setAttribute("href", val); });
    else
      document.querySelectorAll('[data-cms-src="' + key + '"]').forEach(function (el) { el.setAttribute("src", val); });
  }
})();
