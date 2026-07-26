#!/usr/bin/env node
// 공과금(전기요금 등) 한 달 입력/수정기
// 사용법:
//   node scripts/set-utility.mjs electric <YYYY> <M> <요금> <전력kWh>
// 예:
//   node scripts/set-utility.mjs electric 2026 1 156300 581
//   node scripts/set-utility.mjs electric 2026 2 164,910 605
//
// 같은 (종류/연/월) 이 있으면 갱신, 없으면 추가한다. 콤마(,)·'원'·'kWh'는 자동 제거.
// 종류(첫 인자)는 utilities.json 안의 배열 키가 된다 (현재 'electric').

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join(process.cwd(), 'utilities.json');
const [type, yRaw, mRaw, costRaw, kwhRaw] = process.argv.slice(2);

if (!type || yRaw === undefined || mRaw === undefined || costRaw === undefined) {
  console.error('사용법: node scripts/set-utility.mjs electric <YYYY> <M> <요금> <전력kWh>');
  process.exit(1);
}
const int = (s) => {
  const n = parseInt(String(s).replace(/[,원\skWh]/gi, ''), 10);
  if (Number.isNaN(n)) { console.error('❌ 숫자가 아님:', s); process.exit(1); }
  return n;
};
const year = int(yRaw), month = int(mRaw), cost = int(costRaw);
const kwh = kwhRaw === undefined || kwhRaw === '' ? null : int(kwhRaw);
if (month < 1 || month > 12) { console.error('❌ 월은 1~12:', month); process.exit(1); }

const data = existsSync(FILE)
  ? JSON.parse(readFileSync(FILE, 'utf8'))
  : { updated: '', };
data[type] = data[type] || [];

let row = data[type].find((r) => r.year === year && r.month === month);
const action = row ? '수정' : '추가';
if (!row) { row = { year, month }; data[type].push(row); }
row.cost = cost;
if (kwh !== null) row.kwh = kwh; else delete row.kwh;

data[type].sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));
data.updated = new Date().toISOString().slice(0, 10);

writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`✓ ${type} ${year}년 ${month}월 ${action} — 요금 ${cost.toLocaleString('ko-KR')}원${kwh !== null ? ' · ' + kwh + 'kWh' : ''}`);
