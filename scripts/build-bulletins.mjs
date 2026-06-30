#!/usr/bin/env node
// 주보 목록 자동 생성기
// bulletins/ 폴더의 모든 주보 파일(PDF·이미지)을 훑어 파일명에서 날짜를 뽑아
// bulletins.json 으로 저장한다. 파일명에 YYYY-MM-DD 또는 YYYYMMDD 가 들어 있기만 하면 인식한다.
//   예) 2023-01-01.pdf, 20230101_신년주일_01.jpg  →  2023-01-01
// PDF·JPG·JPEG·PNG·WEBP 를 지원하며, 같은 날짜에 파일이 여러 장이면 모두 표시한다.

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'bulletins');
const ALLOWED = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

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
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

const files = walk(DIR);
const seen = new Set();
const items = [];

for (const abs of files) {
  const rel = relative(ROOT, abs).split('\\').join('/');
  if (seen.has(rel)) continue;
  seen.add(rel);
  const date = parseDate(rel.split('/').pop());
  if (!date) {
    console.warn('⚠ 날짜를 못 읽어 건너뜀:', rel);
    continue;
  }
  const ext = extname(rel).toLowerCase();
  const type = ext === '.pdf' ? 'PDF' : '이미지';
  items.push({ date, year: date.slice(0, 4), path: rel, type, title: '주일 주보' });
}

// 최신순 정렬 (같은 날짜는 파일명 순)
items.sort((a, b) => (a.date === b.date ? (a.path < b.path ? -1 : 1) : (a.date < b.date ? 1 : -1)));

writeFileSync(
  join(ROOT, 'bulletins.json'),
  JSON.stringify({ updated: new Date().toISOString().slice(0, 10), count: items.length, items }, null, 2) + '\n'
);

console.log(`✓ bulletins.json 생성 — 주보 ${items.length}개`);
