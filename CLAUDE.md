# 종의교회 홈페이지 — 작업 가이드 (필독)

정적 HTML/CSS/JS 사이트. GitHub Pages가 `main` 브랜치에서 배포. 라이브: https://www.jongschurch.com

이 파일은 **과거에 실제로 발생한 사고를 다시 겪지 않기 위한 운영 규칙**입니다. 작업 전에 반드시 읽으세요.

---

## ⚠️ 사고 #1 — "HTML을 고쳤는데 사이트에 반영이 안 된다" (CMS 덮어쓰기)

**증상:** 텍스트를 HTML에서 바꾸고 커밋·배포까지 성공했는데도, 브라우저 화면엔 옛 값이 계속 보인다. `view-source`엔 새 값이 보이는데 렌더된 화면은 옛 값이다.

**원인:** 이 사이트는 **Supabase 기반 CMS**를 씁니다. `js/cms.js`가 페이지 로드 때마다 Supabase에서 값을 불러와, `data-cms="KEY"` 속성이 붙은 요소의 내용을 **런타임에 덮어씁니다.** 즉 **HTML의 그 텍스트는 "대체값(fallback)"일 뿐**이고, 실제 화면 값은 DB에서 옵니다.

### 규칙
1. **사용자용 텍스트를 바꾸기 전에 먼저 확인:** 그 요소에 `data-cms`가 붙어 있나?
   ```bash
   grep -n 'data-cms' *.html   # 또는 해당 문구를 grep
   ```
2. `data-cms`가 있으면 → **Supabase DB를 고쳐야 실제로 반영된다.** HTML만 고치면 소용없다.
3. HTML의 대체값도 **DB와 똑같이** 맞춰 둔다 (Supabase 연결 실패 시에만 보이는 값).
4. 이 항목들은 **배포가 필요 없다.** DB만 바꾸면 다음 새로고침에 즉시 반영된다 (실시간 fetch).

### CMS가 관리하는 값 (Supabase `site_settings` 테이블)
- Supabase 프로젝트 ref: **`jqxhdajpehnwaewrfjld`**
- 테이블: `site_settings` (컬럼: `key`, `value`, `group_name`)
- 편집 방법: (a) 사이트의 `admin.html` 관리자 페이지, 또는 (b) Supabase MCP `execute_sql`

**group_name = `content` (텍스트, `data-cms="key"`로 매칭):**
| key | 내용 |
|---|---|
| `pastor_name` | 담임목사 이름 |
| `church_address` | 교회 주소 |
| `worship_times_line` | 하단/안내의 "주일예배 … · 금요… 저녁 8:30" 한 줄 |
| `service_time_short` | 예배 시간 짧은 표기 (예: 오전 10:00) |
| `account_bank` / `account_holder` / `account_number` | 헌금 계좌 |
| `hero_sub` / `creed_statement` | 메인 히어로 문구 |
| `offering_principle_desc` / `membership_note` | 생활 페이지 설명 |

**group_name = `hero` (첫 화면):** `hero_title_1`, `hero_title_2`(강조는 `<em>`), `hero_sub`, `hero_cta_primary_label`/`_link`, `hero_cta_secondary_label`/`_link`.

**group_name = `theme` (색상, `--변수`로 적용):** `color-accent`, `color-ink`, `color-paper` 등.

### CMS 바인딩 방식 (js/cms.js)
- `data-cms="key"` → 요소의 **내용(innerHTML)** 을 DB 값으로 교체 (HTML 허용, 예: `<em>`, `<br>`).
- `data-cms-href="key"` → 요소의 **링크(href)** 를 DB 값으로 교체.
- `data-cms-src="key"` → 요소의 **이미지(src)** 를 DB 값으로 교체.
- `group_name='theme'` → `--key`(color- 접두어 제거) CSS 변수로 적용.

### 새 편집 항목을 추가하려면 (예: 다른 섹션도 강화)
1. HTML 요소에 `data-cms` / `data-cms-href` / `data-cms-src` 부여 (정적 값은 폴백으로 남겨둠).
2. `site_settings`에 행 추가: `(key, value, label, group_name, sort)`. `admin.html`이 자동으로 폼을 그린다.
   - `admin.html`은 `group_name`별 섹션(순서: hero→content→link→theme, `GROUP_META`에 한글 제목)으로 렌더링하고, 같은 그룹은 `sort` 숫자 오름차순으로 표시.
   - 키가 `_link`로 끝나거나 `group_name='link'`면 **URL 입력칸**, `theme`이면 색상칸, 그 외엔 여러 줄 텍스트칸으로 렌더링.
3. `js/cms.js` 캐시 버전(`?v=N`)을 올린다.

예) 예배 시간 변경:
```sql
update site_settings set value = '오전 10:00' where key = 'service_time_short';
update site_settings set value = replace(value,'오전 11:00','오전 10:00') where key = 'worship_times_line';
```

> **표기 통일 완료(2026-07):** 금요 모임 명칭은 **"금요기도회"** 로 통일. DB·전체 HTML 일치.

---

## ⚠️ 사고 #2 — GitHub Pages 배포가 조용히 실패

**증상:** `main`에 push는 됐는데 라이브가 안 바뀐다.

**원인:** GitHub Pages "pages build and deployment"가 일시적 인프라 오류(`Deployment failed, try again later`)로 **실패**하는 경우가 있다. push 성공 ≠ 배포 성공.

### 규칙
1. `main`에 push한 뒤 **배포 성공 여부를 반드시 확인**한다 (GitHub MCP `actions_list` → 최신 "pages build and deployment"의 conclusion).
2. 실패면 **재실행**한다: `actions_run_trigger` `rerun_workflow_run`. 보통 재실행하면 성공한다.
3. 이 샌드박스는 프록시 정책상 **라이브 사이트(jongschurch.com)에 직접 접속 불가**(curl/WebFetch 403). 라이브 확인은 사용자에게 `view-source:` + 화면 새로고침을 요청해 판단한다.

---

## 배포 워크플로
- 개발 브랜치: `claude/increase-font-size-0h6rpk`
- 반영 순서: `main`에 커밋·push → `pages build and deployment` 성공 확인 → 필요시 재실행 → 작업 브랜치도 `git merge main --ff-only` 후 push.
- CSS/JS 캐시 버스팅: `css/style.css?v=N` 숫자를 올린다 (현재 v=13).

## 데이터 자동화 스크립트
- `scripts/set-finance.mjs` — 재정 입력 (finance.json)
- `scripts/build-bulletins.mjs` — 주보 목록 생성 (bulletins.json)
- 주보 PDF: `bulletins/YYYY/YYYY-MM-DD.pdf`

## 체크리스트 (텍스트/콘텐츠 수정 시)
- [ ] 이 문구에 `data-cms`가 있나? → 있으면 Supabase DB부터 수정
- [ ] HTML 대체값도 DB와 일치시켰나?
- [ ] `main` push 후 pages 배포 conclusion = success 확인했나? (실패 시 재실행)
- [ ] 사용자에게 새로고침(강력)으로 확인 요청
