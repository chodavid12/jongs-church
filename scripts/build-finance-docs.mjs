#!/usr/bin/env node
// 재정 자료(반기 보고서·공과금) 목록 자동 생성기
// finance-docs/ 아래 파일(PDF·이미지)을 훑어 finance-docs.json 으로 저장한다.
// 최상위 하위폴더 이름으로 분류한다:
//   finance-docs/반기/…   → category:'half'    (반기 재정보고서)
//   finance-docs/공과금/… → category:'utility' (공과금·전기세)
// 파일명 규칙(권장, 없어도 파일명 그대로 제목이 됨):
//   반기:   2026-상반기.pdf, 2026-하반기.pdf      → 연도·기간 자동 인식
//   공과금: 2026-07-전기세.pdf, 2026-07.pdf       → 연·월 자동 인식
// PDF·JPG·JPEG·PNG·WEBP 를 지원한다.

import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'finance-docs');
const ALLOWED = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

// 하위폴더 이름 → 분류
const CAT_MAP = {
  '반기': 'half', 'half': 'half', 'reports': 'half',
  '공과금': 'utility', '전기세': 'utility', 'utility': 'utility'
};

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (ALLOWED.has(extname(name).toLowerCase())) out.push(p);
  }
  return out;
}

if (!existsSync(DIR)) {
  writeFileSync(join(ROOT, 'finance-docs.json'),
    JSON.stringify({ updated: new Date().toISOString().slice(0, 10), count: 0, docs: [] }, null, 2) + '\n');
  console.log('✓ finance-docs.json 생성 — 자료 0개 (finance-docs/ 폴더 없음)');
  process.exit(0);
}

const files = walk(DIR);
const docs = [];

for (const abs of files) {
  const rel = relative(ROOT, abs).split('\\').join('/');
  const parts = rel.split('/');               // ['finance-docs', '<분류폴더>', ...]
  const folder = parts[1] || '';
  const category = CAT_MAP[folder];
  if (!category) { console.warn('⚠ 분류를 못 정해 건너뜀(반기/공과금 폴더 아래에 두세요):', rel); continue; }

  const ext = extname(rel).toLowerCase();
  const type = ext === '.pdf' ? 'PDF' : '이미지';
  const stem = basename(rel, ext);
  const ym = stem.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])/);   // 연-월
  const yOnly = stem.match(/(20\d{2})/);                     // 연도만
  const year = (ym && ym[1]) || (yOnly && yOnly[1]) || '';

  let period = '', title = '';
  if (category === 'half') {
    const half = /상반기/.test(stem) ? '상반기' : (/하반기/.test(stem) ? '하반기' : '');
    period = half || (ym ? `${ym[1]}. ${ym[2]}` : '');
    title = half ? `${year} ${half} 결산 보고서` : stem.replace(/[-_]+/g, ' ').trim();
  } else { // utility
    period = ym ? `${ym[1]}. ${ym[2]}` : (year || '');
    const label = stem.replace(/(20\d{2})[-_.]?(0[1-9]|1[0-2])?[-_.]?/, '').replace(/[-_]+/g, ' ').trim();
    title = label || (ym ? `${ym[1]}년 ${parseInt(ym[2], 10)}월 공과금` : '공과금');
  }

  // 정렬 키: 연-월(있으면) 아니면 파일명
  const sort = ym ? `${ym[1]}-${ym[2]}` : (year || stem);
  docs.push({ category, year, period, title, path: rel, type, sort });
}

// 분류 → 연도 내림차순 → sort 내림차순
docs.sort((a, b) => {
  if (a.category !== b.category) return a.category < b.category ? -1 : 1;
  if ((b.year || '') !== (a.year || '')) return (b.year || '') < (a.year || '') ? -1 : 1;
  return a.sort < b.sort ? 1 : -1;
});

writeFileSync(
  join(ROOT, 'finance-docs.json'),
  JSON.stringify({ updated: new Date().toISOString().slice(0, 10), count: docs.length, docs }, null, 2) + '\n'
);

const nHalf = docs.filter(d => d.category === 'half').length;
const nUtil = docs.filter(d => d.category === 'utility').length;
console.log(`✓ finance-docs.json 생성 — 반기 보고서 ${nHalf}개 · 공과금 ${nUtil}개`);
