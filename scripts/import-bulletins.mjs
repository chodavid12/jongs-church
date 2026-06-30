#!/usr/bin/env node
// 주보 일괄 임포트기
// 사용법:  node scripts/import-bulletins.mjs "<원본폴더경로>"
//
// 원본 폴더(하위 폴더 포함)의 모든 주보 파일(PDF·JPG·JPEG·PNG·WEBP)을 훑어
//   - 파일명에서 날짜(YYYYMMDD 또는 YYYY-MM-DD)를 뽑아
//   - bulletins/<연도>/<YYYY-MM-DD>.<확장자> 로 복사하고
//   - 같은 날짜가 여러 장이면 -2, -3 … 을 붙이며
//   - 마지막에 bulletins.json 을 다시 생성한다.
// 날짜를 못 읽은 파일은 건너뛰고 끝에 목록으로 보고한다. (덮어쓰기 안 함)

import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const ALLOWED = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

const SRC = process.argv[2];
if (!SRC) {
  console.error('❌ 원본 폴더 경로를 넣어주세요.  예) node scripts/import-bulletins.mjs "~/Desktop/주보모음"');
  process.exit(1);
}
if (!existsSync(SRC) || !statSync(SRC).isDirectory()) {
  console.error('❌ 폴더를 찾을 수 없습니다:', SRC);
  process.exit(1);
}

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (ALLOWED.has(extname(name).toLowerCase())) out.push(p);
  }
  return out;
}

function parseDate(filename) {
  const m = filename.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function sameContent(a, b) {
  try { return readFileSync(a).equals(readFileSync(b)); } catch { return false; }
}

const files = walk(SRC).sort();
let imported = 0, skippedDup = 0;
const noDate = [];
const perYear = {};

for (const src of files) {
  const name = basename(src);
  const date = parseDate(name);
  if (!date) { noDate.push(name); continue; }

  const year = date.slice(0, 4);
  const ext = extname(name).toLowerCase();
  const dir = join(ROOT, 'bulletins', year);
  mkdirSync(dir, { recursive: true });

  // 같은 날짜 다중 처리: 2023-02-05.pdf → -2 → -3 …
  let dest = join(dir, `${date}${ext}`);
  let n = 1, already = false;
  while (existsSync(dest)) {
    if (sameContent(src, dest)) { already = true; break; } // 이미 같은 파일 → 건너뜀
    n += 1;
    dest = join(dir, `${date}-${n}${ext}`);
  }
  if (already) { skippedDup += 1; continue; }

  copyFileSync(src, dest);
  imported += 1;
  perYear[year] = (perYear[year] || 0) + 1;
  console.log('→', relative(ROOT, dest));
}

// 목록 재생성
execFileSync('node', [join(ROOT, 'scripts', 'build-bulletins.mjs')], { stdio: 'inherit' });

console.log('\n────────── 요약 ──────────');
console.log(`복사한 주보: ${imported}개`);
if (skippedDup) console.log(`이미 있어 건너뜀: ${skippedDup}개`);
Object.keys(perYear).sort().forEach((y) => console.log(`  - ${y}년: ${perYear[y]}개`));
if (noDate.length) {
  console.log(`\n⚠ 날짜를 못 읽어 건너뛴 파일 ${noDate.length}개 (수동 확인 필요):`);
  noDate.forEach((f) => console.log('   ·', f));
}
console.log('\n다음 단계:  git add -A && git commit && git push origin main');
