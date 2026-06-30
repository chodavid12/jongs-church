#!/usr/bin/env node
// 재정(헌금 수입) 한 주 입력/수정기
// 사용법:
//   node scripts/set-finance.mjs <YYYY-MM-DD> <일반> <목적> <구제> [메모]
// 예:
//   node scripts/set-finance.mjs 2025-06-08 460042 100000 0 "목적: 태국 지원"
//   node scripts/set-finance.mjs 2025-06-01 610,000 0 0
//
// 해당 날짜가 finance.json 에 있으면 금액을 갱신하고, 없으면 새로 추가한다.
// 금액의 콤마(,)와 '원' 은 자동으로 제거한다. 항상 최신순 정렬 유지.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join(process.cwd(), 'finance.json');
const [date, gRaw, pRaw, rRaw, ...memoParts] = process.argv.slice(2);

if (!date || gRaw === undefined || pRaw === undefined || rRaw === undefined) {
  console.error('사용법: node scripts/set-finance.mjs <YYYY-MM-DD> <일반> <목적> <구제> [메모]');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('❌ 날짜 형식이 잘못됨 (YYYY-MM-DD):', date);
  process.exit(1);
}
const num = (s) => {
  const n = parseInt(String(s).replace(/[,원\s]/g, ''), 10);
  if (Number.isNaN(n)) { console.error('❌ 숫자가 아님:', s); process.exit(1); }
  return n;
};

const general = num(gRaw), purpose = num(pRaw), relief = num(rRaw);
const memo = memoParts.join(' ').trim();

const data = JSON.parse(readFileSync(FILE, 'utf8'));
data.weeks = data.weeks || [];

let row = data.weeks.find((w) => w.date === date);
const action = row ? '수정' : '추가';
if (!row) { row = { date }; data.weeks.push(row); }
row.general = general;
row.purpose = purpose;
row.relief = relief;
if (memo) row.memo = memo; else delete row.memo;

data.weeks.sort((a, b) => (a.date < b.date ? 1 : -1));
data.updated = new Date().toISOString().slice(0, 10);

writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`✓ ${date} ${action} — 일반 ${general.toLocaleString('ko-KR')} · 목적 ${purpose.toLocaleString('ko-KR')} · 구제 ${relief.toLocaleString('ko-KR')}${memo ? ' (' + memo + ')' : ''}`);
