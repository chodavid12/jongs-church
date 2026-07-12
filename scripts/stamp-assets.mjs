#!/usr/bin/env node
// 캐시버스팅 자동화 — css/js 파일 내용 해시로 HTML의 ?v= 를 자동 갱신.
// 사용법: node scripts/stamp-assets.mjs   (배포 전 실행 권장)
// 대상 자산: css/style.css, js/*.js  (파일이 바뀐 것만 새 해시로 교체됨)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const ROOT = process.cwd();
const HTML_FILES = ["index.html", "about.html", "worship.html", "life.html", "news.html", "admin.html"];

// 자산 목록: css/style.css + js 폴더의 최상위 .js (vendor 제외 — 라이브러리는 자체 버전)
const assets = ["css/style.css"];
for (const f of readdirSync(join(ROOT, "js"))) {
  if (f.endsWith(".js")) assets.push("js/" + f);
}

// 각 자산의 8자리 내용 해시
const hash = {};
for (const a of assets) {
  try {
    hash[a] = createHash("sha256").update(readFileSync(join(ROOT, a))).digest("hex").slice(0, 8);
  } catch (e) { /* 없는 파일 건너뜀 */ }
}

let changed = 0;
for (const html of HTML_FILES) {
  let s;
  try { s = readFileSync(join(ROOT, html), "utf8"); } catch (e) { continue; }
  const before = s;
  // "path?v=..." 형태를 새 해시로 (경로 뒤 ?v= 만 대상, 쿼리 경계까지)
  for (const a of assets) {
    if (!hash[a]) continue;
    const re = new RegExp(a.replace(/[.]/g, "\\.") + "\\?v=[A-Za-z0-9]+", "g");
    s = s.replace(re, a + "?v=" + hash[a]);
  }
  if (s !== before) { writeFileSync(join(ROOT, html), s); changed++; console.log("스탬프:", html); }
}
console.log(`\n자산 해시:`);
for (const a of assets) if (hash[a]) console.log(`  ${a} → ?v=${hash[a]}`);
console.log(`\n✓ ${changed}개 HTML 갱신`);
