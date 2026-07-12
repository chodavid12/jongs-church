// 인라인 편집 모드 — 실제 사이트를 보면서 클릭해서 바로 수정.
// ?edit=1 : 편집 모드(관리자 로그인 필요). ?preview=1 : 초안 미리보기(편집 UI 없음).
// 편집 대상: data-cms(내용) · data-cms-href(링크) · data-cms-src(이미지/영상).
// v7: 섹션 순서/숨김(data-section → layout_<page>) + 반복 항목 복제/삭제(data-cms-list) 추가.
(function () {
  var EDIT = /[?&]edit=1(&|$)/.test(location.search);
  var PREVIEW = /[?&]preview=1(&|$)/.test(location.search);
  if (!EDIT && !PREVIEW) return; // 일반 방문자에겐 아무 영향 없음

  var SUPABASE_URL = (window.SUPA && window.SUPA.URL) || "https://jqxhdajpehnwaewrfjld.supabase.co";
  var SUPABASE_ANON_KEY = (window.SUPA && window.SUPA.ANON_KEY) || "sb_publishable_aD4lD4JuNZWJrjFUVUpOLQ_0rc9r8dx";
  var sb = null;

  // 현재 페이지 이름 → layout_<page> 키 (index.html → home)
  var PAGE = (function () {
    var f = location.pathname.split("/").pop();
    return !f || f === "index.html" ? "home" : f.replace(/\.html$/, "");
  })();

  var css =
    ".cms-edit-mode .promo,.cms-preview .promo{display:none!important;}" +
    ".cms-edit-mode [data-cms],.cms-edit-mode [data-cms-href],.cms-edit-mode [data-cms-src]{cursor:pointer;outline:1.5px dashed rgba(66,140,185,.5);outline-offset:3px;transition:outline-color .15s;}" +
    ".cms-edit-mode [data-cms]:hover,.cms-edit-mode [data-cms-href]:hover,.cms-edit-mode [data-cms-src]:hover{outline:2px solid #428cb9;outline-offset:3px;background:rgba(66,140,185,.06);}" +
    "#cms-bar{position:fixed;top:0;left:0;right:0;z-index:99998;background:#1d1d1f;color:#fff;font:600 14px/1 -apple-system,'Apple SD Gothic Neo',sans-serif;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 16px;box-shadow:0 2px 10px rgba(0,0,0,.2);}" +
    "#cms-bar .t{display:flex;align-items:center;gap:8px;min-width:0;}#cms-bar .dot{color:#f4c430;}" +
    "#cms-bar .acts{display:flex;gap:8px;flex:none;}" +
    "#cms-bar button{font:inherit;background:#fff;color:#1d1d1f;border:0;border-radius:8px;padding:8px 13px;cursor:pointer;}" +
    "#cms-bar button.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.35);}" +
    "body.cms-has-bar{padding-top:44px;}" +
    "#cms-pop{position:fixed;z-index:99999;left:50%;bottom:22px;transform:translateX(-50%);width:min(560px,92vw);background:#fff;color:#1d1d1f;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.28);padding:18px;font:14px/1.5 -apple-system,'Apple SD Gothic Neo',sans-serif;}" +
    "#cms-pop h4{font-size:15px;font-weight:800;margin:0 0 3px;}#cms-pop .k{font-size:12px;color:#888;margin:0 0 12px;}" +
    "#cms-pop textarea,#cms-pop input[type=text]{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #d2d2d7;border-radius:12px;font:inherit;font-size:14.5px;line-height:1.6;background:#fff;}" +
    "#cms-pop textarea{min-height:96px;resize:vertical;}" +
    "#cms-pop .upl{margin-bottom:10px;padding:12px;border:1px dashed #c9c9d0;border-radius:12px;background:#fafafb;font-size:13px;}" +
    "#cms-pop .upl b{color:#428cb9;}" +
    "#cms-pop .foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:12px;}" +
    "#cms-pop .msg{margin-right:auto;color:#888;font-size:13px;}" +
    "#cms-pop .btn-primary{background:#428cb9;color:#fff;border:0;border-radius:10px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer;}" +
    "#cms-pop .btn-ghost{background:transparent;border:0;color:#6e6e73;padding:10px 8px;cursor:pointer;font:inherit;}" +
    "#cms-login{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;}" +
    "#cms-login .box{background:#fff;border-radius:16px;padding:24px;width:min(340px,90vw);font:14px -apple-system,'Apple SD Gothic Neo',sans-serif;}" +
    "#cms-login h3{margin:0 0 14px;font-size:17px;font-weight:800;}" +
    "#cms-login input{width:100%;box-sizing:border-box;padding:11px 13px;margin-bottom:9px;border:1px solid #d2d2d7;border-radius:10px;font:inherit;}" +
    "#cms-login button{width:100%;padding:11px;border:0;border-radius:10px;background:#428cb9;color:#fff;font:inherit;font-weight:700;cursor:pointer;}" +
    "#cms-login .err{color:#c0392b;font-size:13px;margin-top:8px;min-height:16px;}" +
    "#cms-device{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.7);display:flex;flex-direction:column;}" +
    "#cms-device .dv-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;color:#fff;font:600 14px -apple-system,'Apple SD Gothic Neo',sans-serif;}" +
    "#cms-device .dv-bar button{font:inherit;background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:8px;padding:8px 12px;cursor:pointer;margin-left:6px;}" +
    "#cms-device .dv-bar button.on{background:#f4c430;color:#1d1d1f;}" +
    "#cms-device .dv-stage{flex:1;display:flex;align-items:center;justify-content:center;overflow:auto;padding:12px;}" +
    "#cms-device iframe{height:100%;max-height:calc(100vh - 80px);width:393px;background:#fff;border:0;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.5);}" +
    "#cms-leave{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;}" +
    "#cms-leave .box{background:#fff;border-radius:18px;padding:26px 24px;width:min(380px,90vw);text-align:center;font:14px/1.6 -apple-system,'Apple SD Gothic Neo',sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.3);}" +
    "#cms-leave .ic{width:48px;height:48px;border-radius:50%;background:#e8f5e9;color:#2e7d32;font-size:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;}" +
    "#cms-leave h3{font-size:18px;font-weight:800;margin:0 0 8px;}" +
    "#cms-leave p{color:#6e6e73;margin:0 0 18px;}" +
    "#cms-leave .acts{display:flex;gap:10px;}" +
    "#cms-leave .acts button{flex:1;padding:12px;border:0;border-radius:12px;font:inherit;font-weight:700;cursor:pointer;background:#f0f0f3;color:#1d1d1f;}" +
    "#cms-leave .acts button.primary{background:#428cb9;color:#fff;}" +
    // --- v7: 섹션 순서/숨김 툴바 ---
    ".cms-edit-mode [data-section]{position:relative;}" +
    ".cms-sec-dim{opacity:.35;}" +
    ".cms-sec-bar{position:absolute;top:10px;right:10px;z-index:8990;display:flex;gap:5px;align-items:center;background:#1d1d1f;color:#fff;border-radius:10px;padding:6px 9px;font:600 12px/1 -apple-system,'Apple SD Gothic Neo',sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);opacity:.93;}" +
    ".cms-sec-bar .nm{opacity:.65;margin-right:3px;}" +
    ".cms-sec-bar button{font:inherit;background:rgba(255,255,255,.16);color:#fff;border:0;border-radius:7px;padding:5px 8px;cursor:pointer;}" +
    ".cms-sec-bar button:hover{background:rgba(255,255,255,.3);}" +
    // --- v7: 반복 항목(리스트) 복제/삭제 ---
    ".cms-edit-mode [data-cms-list]>*{position:relative;}" +
    ".cms-item-ctl{position:absolute;top:6px;right:6px;z-index:8980;display:flex;gap:4px;opacity:0;transition:opacity .15s;}" +
    ".cms-edit-mode [data-cms-list]>*:hover>.cms-item-ctl{opacity:1;}" +
    ".cms-item-ctl button{font:600 11px/1 -apple-system,'Apple SD Gothic Neo',sans-serif;background:#428cb9;color:#fff;border:0;border-radius:6px;padding:5px 8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);}" +
    ".cms-item-ctl button.del{background:#c0392b;}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var s = document.createElement("script");
  s.src = "js/vendor/supabase.js";
  s.onload = init;
  s.onerror = function () { if (EDIT) alert("편집 도구를 불러오지 못했습니다. 네트워크를 확인해 주세요."); };
  document.head.appendChild(s);

  function init() {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    sb.auth.getSession().then(function (r) {
      var session = r.data && r.data.session;
      if (PREVIEW) {                       // 미리보기: 초안만 적용, 편집 UI 없음
        document.documentElement.classList.add("cms-preview");
        if (session) applyDrafts();
        return;
      }
      if (session) enable();               // 편집 모드
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
      '<span class="t"><span class="dot">✎</span> 편집 모드 <span id="cms-hint">— 바꿀 부분을 클릭</span></span>' +
      '<span class="acts"><button class="ghost" id="cms-dash">📊 대시보드</button><button class="ghost" id="cms-preview-btn">📱 미리보기</button><button id="cms-exit">나가기</button></span>';
    document.body.appendChild(bar);
    document.getElementById("cms-dash").addEventListener("click", function () { leaveConfirm("admin.html", "대시보드로 이동"); });
    document.getElementById("cms-exit").addEventListener("click", function () { leaveConfirm(location.pathname + location.hash, "사이트 나가기"); });
    document.getElementById("cms-preview-btn").addEventListener("click", openDeviceFrame);

    document.addEventListener("click", onClick, true);
    applyDrafts().then(function () {
      setupSections();
      setupLists();
    });
  }

  // 초안 값을 페이지에 적용
  function applyDrafts() {
    return sb.from("site_settings").select("key,draft_value,group_name").then(function (r) {
      if (!r.data) return;
      var layout = null;
      r.data.forEach(function (row) {
        if (row.key === "layout_" + PAGE) { layout = row.draft_value; return; }
        if (row.draft_value == null) return;
        applyList(row.key, row.draft_value);
      });
      r.data.forEach(function (row) {
        if (row.key === "layout_" + PAGE || row.draft_value == null) return;
        applyOne(row.key, row.group_name === "theme" ? "theme" : null, row.draft_value, row.group_name);
      });
      if (layout) applyDraftLayout(layout);
    });
  }

  // innerHTML 교체 뒤의 .reveal 은 다시 관찰되지 않으므로 바로 표시
  function showReveals(el) {
    if (el.classList.contains("reveal")) el.classList.add("visible");
    el.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("visible"); });
  }

  function applyList(key, val) {
    document.querySelectorAll('[data-cms-list="' + key + '"]').forEach(function (el) {
      el.innerHTML = val;
      showReveals(el);
    });
  }

  // 초안 레이아웃: 순서 재배치 + 숨김(편집 모드에선 흐리게, 미리보기에선 실제 숨김)
  function applyDraftLayout(json) {
    var list;
    try { list = JSON.parse(json); } catch (e) { return; }
    if (!Array.isArray(list)) return;
    document.querySelectorAll("[data-section]").forEach(function (el) {
      el.classList.remove("cms-sec-hidden", "cms-sec-dim"); // 공개값(cms.js) 초기화
    });
    var byParent = new Map();
    list.forEach(function (it) {
      var el = it && it.id && document.querySelector('[data-section="' + it.id + '"]');
      if (!el) return;
      if (it.hidden) el.classList.add(EDIT ? "cms-sec-dim" : "cms-sec-hidden");
      if (!byParent.has(el.parentNode)) byParent.set(el.parentNode, []);
      byParent.get(el.parentNode).push(el);
    });
    byParent.forEach(function (els, parent) {
      var first = els.slice().sort(function (a, b) {
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      })[0];
      var marker = document.createComment("cms-layout");
      parent.insertBefore(marker, first);
      els.forEach(function (el) { parent.insertBefore(el, marker); });
      parent.removeChild(marker);
    });
  }

  function applySrc(el, val) {
    el.setAttribute("src", val);
    if (el.tagName === "VIDEO") { try { el.load(); el.play().catch(function () {}); } catch (e) {} }
  }

  // key 를 쓰는 모든 요소에 값 적용 (content/href/src 자동 판별)
  function applyOne(key, forceType, val, group) {
    if (group === "theme") {
      document.documentElement.style.setProperty("--" + key.replace(/^color-/, ""), val);
      return;
    }
    document.querySelectorAll('[data-cms="' + key + '"]').forEach(function (el) { el.innerHTML = val; });
    document.querySelectorAll('[data-cms-href="' + key + '"]').forEach(function (el) { el.setAttribute("href", val); });
    document.querySelectorAll('[data-cms-src="' + key + '"]').forEach(function (el) { applySrc(el, val); });
  }

  // draft_value 저장: 기존 행이면 update, 새 키(복제 항목 등)면 insert
  function saveDraft(key, val, groupName, label) {
    var now = new Date().toISOString();
    return sb.from("site_settings")
      .update({ draft_value: val, updated_at: now })
      .eq("key", key)
      .select("key")
      .then(function (r) {
        if (r.error) throw r.error;
        if (r.data && r.data.length) return r;
        return sb.from("site_settings").insert({
          key: key, draft_value: val, published_value: null,
          label: label || key, group_name: groupName || PAGE, sort: 900, updated_at: now,
        }).then(function (r2) { if (r2.error) throw r2.error; return r2; });
      });
  }

  function onClick(e) {
    if (e.target.closest("#cms-bar,#cms-pop,#cms-login,#cms-device,#cms-leave,.cms-sec-bar,.cms-item-ctl")) return;
    var el = e.target.closest("[data-cms],[data-cms-href],[data-cms-src]");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    openEditor(el);
  }

  function fieldOf(el) {
    if (el.hasAttribute("data-cms")) return { key: el.getAttribute("data-cms"), type: "content", cur: el.innerHTML.trim() };
    if (el.hasAttribute("data-cms-href")) return { key: el.getAttribute("data-cms-href"), type: "href", cur: el.getAttribute("href") || "" };
    return { key: el.getAttribute("data-cms-src"), type: "src", cur: el.getAttribute("src") || "" };
  }

  function uploadFile(file) {
    var name = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    var path = "uploads/" + Date.now() + "_" + name;
    return sb.storage.from("media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type })
      .then(function (r) {
        if (r.error) throw r.error;
        return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
      });
  }

  var pop = null;
  function openEditor(el) {
    if (pop) pop.remove();
    var f = fieldOf(el);
    pop = document.createElement("div");
    pop.id = "cms-pop";
    var typeLabel = f.type === "content" ? "내용" : f.type === "href" ? "링크 주소" : "이미지 · 영상";
    var fieldHTML =
      f.type === "content"
        ? '<textarea id="cms-val"></textarea>'
        : '<input id="cms-val" type="text" placeholder="https://…">';
    var uploadHTML =
      f.type === "src"
        ? '<div class="upl"><b>파일 업로드</b> (이미지/영상): <input type="file" id="cms-file" accept="image/*,video/*"> <span id="cms-uplmsg"></span></div>'
        : "";
    pop.innerHTML =
      "<h4>" + typeLabel + " 편집</h4><p class=\"k\">" + f.key + "</p>" +
      uploadHTML + fieldHTML +
      '<div class="foot"><span class="msg" id="cms-msg"></span>' +
      '<button class="btn-ghost" id="cms-cancel">취소</button>' +
      '<button class="btn-primary" id="cms-save">저장</button></div>';
    document.body.appendChild(pop);
    var input = document.getElementById("cms-val");
    input.value = f.cur;
    if (f.type !== "src") input.focus();

    if (f.type === "src") {
      document.getElementById("cms-file").addEventListener("change", function (ev) {
        var file = ev.target.files && ev.target.files[0];
        if (!file) return;
        var um = document.getElementById("cms-uplmsg");
        um.textContent = "업로드 중…";
        uploadFile(file).then(function (url) {
          input.value = url;
          um.textContent = "업로드 완료 — [저장]을 누르면 반영";
        }).catch(function (err) { um.textContent = "업로드 오류: " + (err.message || err); });
      });
    }

    document.getElementById("cms-cancel").addEventListener("click", function () { pop.remove(); pop = null; });
    document.getElementById("cms-save").addEventListener("click", function () {
      var val = input.value;
      var msg = document.getElementById("cms-msg");
      msg.textContent = "저장 중…";
      saveDraft(f.key, val)
        .then(function () {
          applyOne(f.key, f.type, val, null);
          // 항목이 리스트(data-cms-list) 안에 있으면 리스트 초안도 함께 갱신
          var box = el.closest("[data-cms-list]");
          if (box) saveList(box);
          msg.textContent = "저장됨(초안) ✓";
          setTimeout(function () { if (pop) { pop.remove(); pop = null; } }, 700);
        })
        .catch(function (err) { msg.textContent = "오류: " + (err.message || err); });
    });
  }

  // ---- v7: 섹션 순서/숨김 툴바 ----
  var SEC_NAMES = {
    creed: "종의정신", "intro-video": "소개 영상", live: "예배 라이브", news: "교회 소식", guide: "교회 안내",
    identity: "종의교회", people: "섬기는 사람들", organization: "교회 조직",
    meetings: "모임 안내", order: "주일예배 순서", friday: "금요기도회", seasons: "절기 안내",
    daily: "성도 생활", membership: "교인 등록", offering: "헌금 안내", policy: "목회방침",
    bulletin: "주보 아카이브", finance: "재정 보고", channels: "소식 채널",
  };

  function setupSections() {
    document.querySelectorAll("[data-section]").forEach(function (sec) {
      var id = sec.getAttribute("data-section");
      var hidden = sec.classList.contains("cms-sec-dim");
      var bar = document.createElement("div");
      bar.className = "cms-sec-bar";
      bar.innerHTML =
        '<span class="nm">' + (SEC_NAMES[id] || id) + "</span>" +
        '<button data-act="up" title="위로">▲</button>' +
        '<button data-act="down" title="아래로">▼</button>' +
        '<button data-act="hide">' + (hidden ? "보이기" : "숨기기") + "</button>";
      sec.appendChild(bar);
      bar.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        if (b.dataset.act === "hide") {
          var h = sec.classList.toggle("cms-sec-dim");
          b.textContent = h ? "보이기" : "숨기기";
        } else {
          var sibs = Array.prototype.filter.call(sec.parentNode.children, function (c) {
            return c.hasAttribute("data-section");
          });
          var i = sibs.indexOf(sec);
          if (b.dataset.act === "up" && i > 0) sec.parentNode.insertBefore(sec, sibs[i - 1]);
          else if (b.dataset.act === "down" && i < sibs.length - 1) sec.parentNode.insertBefore(sibs[i + 1], sec);
          else return;
          sec.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        saveLayout();
      });
    });
  }

  function saveLayout() {
    var list = Array.prototype.map.call(document.querySelectorAll("[data-section]"), function (el) {
      return { id: el.getAttribute("data-section"), hidden: el.classList.contains("cms-sec-dim") };
    });
    saveDraft("layout_" + PAGE, JSON.stringify(list), "layout", "섹션 순서/숨김 (" + PAGE + ")")
      .catch(function (err) { alert("레이아웃 저장 오류: " + (err.message || err)); });
  }

  // ---- v7: 반복 항목(리스트) 복제/삭제 ----
  function setupLists() {
    document.querySelectorAll("[data-cms-list]").forEach(function (box) {
      Array.prototype.slice.call(box.children).forEach(function (item) { addItemCtl(box, item); });
    });
  }

  function addItemCtl(box, item) {
    var ctl = document.createElement("div");
    ctl.className = "cms-item-ctl";
    ctl.innerHTML = '<button data-act="dup">＋ 복제</button><button data-act="del" class="del">✕ 삭제</button>';
    item.appendChild(ctl);
    ctl.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      if (b.dataset.act === "dup") {
        var clone = item.cloneNode(true);
        clone.querySelectorAll(".cms-item-ctl").forEach(function (n) { n.remove(); });
        // 복제본의 개별 키는 고유하게 바꿔서(중복 바인딩 방지) 따로 편집 가능하게 함
        var suffix = "_" + Date.now().toString(36);
        var bound = clone.querySelectorAll("[data-cms],[data-cms-href],[data-cms-src]");
        Array.prototype.forEach.call(bound, function (n) { renameKeys(n, suffix); });
        renameKeys(clone, suffix);
        showReveals(clone);
        if (clone.classList.contains("reveal")) clone.classList.add("visible");
        item.parentNode.insertBefore(clone, item.nextSibling);
        addItemCtl(box, clone);
        saveList(box);
      } else {
        var itemCount = Array.prototype.filter.call(box.children, function (c) { return c !== ctl; }).length;
        if (itemCount <= 1) { alert("마지막 항목은 삭제할 수 없습니다."); return; }
        if (!confirm("이 항목을 삭제할까요?")) return;
        item.remove();
        saveList(box);
      }
    });
  }

  function renameKeys(n, suffix) {
    ["data-cms", "data-cms-href", "data-cms-src"].forEach(function (attr) {
      if (n.hasAttribute && n.hasAttribute(attr)) n.setAttribute(attr, n.getAttribute(attr) + suffix);
    });
  }

  function saveList(box) {
    var key = box.getAttribute("data-cms-list");
    var clone = box.cloneNode(true);
    clone.querySelectorAll(".cms-item-ctl").forEach(function (n) { n.remove(); });
    saveDraft(key, clone.innerHTML, PAGE, "반복 항목 (" + key + ")")
      .catch(function (err) { alert("항목 저장 오류: " + (err.message || err)); });
  }

  // ---- 기기 미리보기 (PC/모바일) ----
  function openDeviceFrame() {
    var o = document.createElement("div");
    o.id = "cms-device";
    o.innerHTML =
      '<div class="dv-bar"><span>📱 미리보기 (초안)</span>' +
      '<span><button data-w="393" class="on">📱 아이폰 16</button><button data-w="820">태블릿(에어 11")</button><button data-w="1280">🖥 PC</button>' +
      '<button id="dv-close" style="margin-left:14px">닫기 ✕</button></span></div>' +
      '<div class="dv-stage"><iframe id="dv-frame"></iframe></div>';
    document.body.appendChild(o);
    var frame = o.querySelector("#dv-frame");
    frame.src = location.pathname + "?preview=1";
    var btns = o.querySelectorAll(".dv-bar button[data-w]");
    function setW(w, btn) {
      frame.style.width = w + "px";
      btns.forEach(function (b) { b.classList.toggle("on", b === btn); });
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { setW(b.dataset.w, b); }); });
    o.querySelector("#dv-close").addEventListener("click", function () { o.remove(); });
  }

  // ---- 편집 종료/이동 시 초안 저장 안내 팝업 ----
  function leaveConfirm(url, label) {
    var o = document.createElement("div");
    o.id = "cms-leave";
    o.innerHTML =
      '<div class="box"><div class="ic">✓</div>' +
      "<h3>초안이 저장되어 있습니다</h3>" +
      "<p>지금까지의 편집은 <b>초안</b>으로 저장돼 있습니다.<br>방문자에게 공개하려면 <b>대시보드 → 게시하기</b>를 눌러주세요.</p>" +
      '<div class="acts"><button id="lv-cancel">계속 편집</button><button id="lv-go" class="primary">' + label + "</button></div></div>";
    document.body.appendChild(o);
    o.querySelector("#lv-cancel").addEventListener("click", function () { o.remove(); });
    o.querySelector("#lv-go").addEventListener("click", function () { location.href = url; });
  }
})();
