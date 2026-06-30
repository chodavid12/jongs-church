#!/usr/bin/env node
// 주보 목록 자동 생성기
// bulletins/ 폴더의 모든 PDF를 훑어 파일명에서 날짜를 뽑아 bulletins.json 으로 저장한다.
// 파일명에 YYYY-MM-DD 또는 YYYYMMDD 가 들어 있기만 하면 인식한다.
//   예) 2023-01-01.pdf, 20230101_신년주일_01.pdf  →  2023-01-01

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'bulletins');

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (name.toLowerCase().endsWith('.pdf')) out.push(p);
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
  const date = parseDate(rel.split('/').pop());
  if (!date) {
    console.warn('⚠ 날짜를 못 읽어 건너뜀:', rel);
    continue;
  }
  if (seen.has(date)) {
    console.warn('⚠ 같은 날짜 중복, 건너뜀:', rel);
    continue;
  }
  seen.add(date);
  items.push({ date, year: date.slice(0, 4), path: rel, title: '주일 주보' });
}

// 최신순 정렬
items.sort((a, b) => (a.date < b.date ? 1 : -1));

writeFileSync(
  join(ROOT, 'bulletins.json'),
  JSON.stringify({ updated: new Date().toISOString().slice(0, 10), count: items.length, items }, null, 2) + '\n'
);

console.log(`✓ bulletins.json 생성 — 주보 ${items.length}개`);
