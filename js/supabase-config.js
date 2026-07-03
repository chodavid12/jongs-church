// Supabase 접속 설정 — 공개(anon) 키이므로 클라이언트 노출 정상.
// 모든 페이지에서 cms.js / edit.js 보다 먼저 로드하고, admin.html 에서도 사용.
// 값을 바꿀 일이 생기면 이 파일 한 곳만 고치면 됩니다.
window.SUPA = {
  URL: "https://jqxhdajpehnwaewrfjld.supabase.co",
  ANON_KEY: "sb_publishable_aD4lD4JuNZWJrjFUVUpOLQ_0rc9r8dx",
};
