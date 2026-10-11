---
name: cms-edit
description: 종의교회 홈페이지의 문구·링크·이미지·색상·섹션 순서를 바꾸는 방법(Supabase CMS). 사이트의 글자/예배시간/주소/계좌/버튼 링크를 수정하거나, "HTML을 고쳤는데 반영이 안 된다"는 문제를 해결하거나, 새 편집 가능 항목(data-cms)을 추가할 때 사용.
---

# CMS로 사이트 내용 바꾸기

## 핵심: 화면 값은 DB에서 온다
`js/cms.js`가 로드 때마다 Supabase 공개 뷰 `public_site_settings`(key, value=게시값, group_name)를 읽어, 아래 속성이 붙은 요소를 **런타임에 덮어쓴다**. HTML의 글자는 DB 연결 실패 시에만 보이는 **폴백**이다.

| 속성 | 덮어쓰는 것 |
|---|---|
| `data-cms="key"` | 내용(innerHTML, `<em>`/`<br>` 허용) |
| `data-cms-href="key"` | 링크 |
| `data-cms-src="key"` | 이미지·영상 src |
| `data-cms-list="key"` | 반복 항목 컨테이너 전체 innerHTML |
| `group_name='theme'` | CSS 변수 `--key`(color- 접두어 제거) |
| `layout_<page>` 키 | `data-section` 섹션 순서·숨김 (JSON `[{"id","hidden"}]`) |

→ 텍스트를 바꾸기 전에 `grep -n '바꿀문구' *.html`로 `data-cms*`가 붙었는지 먼저 본다. 붙어 있으면 **DB를 고쳐야** 반영된다(배포 불필요, 새로고침 즉시).

## DB 구조 (Supabase ref `jqxhdajpehnwaewrfjld`)
- 테이블 `site_settings(key, draft_value, published_value, label, group_name, sort, updated_at)` — RLS로 관리자만 쓰기.
- 공개 사이트는 `published_value`만 본다(뷰 `public_site_settings.value`). 편집기는 `draft_value`에 저장하고 관리자가 "게시하기"(RPC `publish_settings()`)로 공개한다.
- group_name은 주로 페이지명(home/about/worship/life/news) + 공통(content, hero, theme, layout).

## 바꾸는 방법
1. **사용자 본인**: `admin.html` 로그인 → "사이트에서 직접 편집"(`?edit=1`)에서 클릭 수정 → 게시하기. `?preview=1`은 초안 미리보기.
2. **Claude가 직접**(Supabase MCP `execute_sql`): 초안과 게시값을 함께 바꾼다.
   ```sql
   update site_settings
      set draft_value = '오전 10:00', published_value = '오전 10:00', updated_at = now()
    where key = 'service_time_short';
   ```
   - 바꾸기 전 `select key, draft_value, published_value from site_settings where key = ...`로 현재값 확인.
   - **draft에 사용자가 작업 중인 미게시 수정이 있으면 덮어쓰지 말고 먼저 물어본다** (draft ≠ published인 행).
3. 같은 값을 HTML 폴백에도 반영해 둔다(DB 장애 시 대비) → 이건 배포 필요.

## 새 편집 항목 추가
1. 요소에 `data-cms`/`-href`/`-src` 부여(정적 값은 폴백으로 유지). 링크 패턴: `<a data-cms-href="k_link"><span data-cms="k_label">문구</span></a>`
2. 행 시드(멱등): `insert into site_settings (key, draft_value, published_value, label, group_name, sort) values ('k', '현재값', '현재값', '한글라벨', 'home', 10) on conflict (key) do nothing;`
3. HTML을 바꿨으면 `node scripts/stamp-assets.mjs`는 css/js 변경 시에만 필요. 배포 후 success 확인.

## 주의
- 이 샌드박스는 Supabase·라이브 사이트 직접 접속이 막힐 수 있다. MCP가 안 되면 사용자에게 admin 편집 방법을 안내한다.
- 자동 생성되는 값(주보 목록·재정·"이번 주 주보" 링크)은 CMS 대상이 아니다 — JSON과 스크립트로 관리.
