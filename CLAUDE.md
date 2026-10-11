# 종의교회 홈페이지

정적 HTML/CSS/JS + Supabase CMS. GitHub Pages가 `main`에서 배포 → https://www.jongschurch.com
빌드 도구 없음(Node 스크립트로 JSON 생성). 사용자는 한국어로 소통한다.

## 반복 작업은 스킬을 쓴다
- 주보 이미지를 받으면 / "주보 올려줘" → **`bulletin-upload`** (PDF + 재정 + 배포까지 한 세트)
- 헌금·전기요금·반기보고서 입력, 재정 대조 → **`finance-records`**
- 사이트 문구·링크·색상·섹션 수정 → **`cms-edit`**

## 반드시 지킬 규칙 (실제 사고에서 나온 것)
1. **화면 텍스트 대부분은 DB 값이다.** `data-cms`/`data-cms-href`/`data-cms-src`가 붙은 요소는 `js/cms.js`가 Supabase 값으로 덮어쓴다. HTML만 고치면 반영 안 됨 → 수정 전 `grep`으로 확인하고 `cms-edit` 스킬대로 DB를 고친다.
2. **push ≠ 배포.** `main` push 후 GitHub MCP `actions_list`로 최신 "pages build and deployment"가 `success`인지 확인한다. 실패면 `actions_run_trigger`로 재실행.
3. **css/js를 고쳤으면** 커밋 전 `node scripts/stamp-assets.mjs` (내용 해시로 `?v=` 자동 갱신, 수동 `?v=N` 금지).
4. **JSON 데이터는 스크립트로만** 만든다: `bulletins.json`·`finance.json`·`finance-docs.json`·`utilities.json`을 손으로 편집하지 않는다.
5. 이 저장소의 파일은 공개 사이트로 서빙될 수 있다 → **비밀번호·토큰을 절대 커밋하지 않는다.** (내부 문서는 `_config.yml`의 `exclude`에 추가)

## 배포 / 브랜치
- 작업 브랜치 `claude/increase-font-size-0h6rpk`, 배포 브랜치 `main`.
- 순서: 커밋 → `git push origin HEAD:main` → 배포 success 확인 → `git push origin claude/increase-font-size-0h6rpk`.
- 이미 push된 커밋을 rebase/amend/force-push 하지 않는다(서명 경고 훅이 떠도 히스토리 재작성 금지).

## 구조
| 경로 | 내용 |
|---|---|
| `index.html` `about.html` `worship.html` `life.html` | 홈·종의소개·종의예배·종의생활 |
| `news.html` | 종의소식 허브(주보/재정 카드 + 소식 채널) |
| `bulletin.html` | 주보 아카이브 ← `bulletins.json` (주일/학생부 필터) |
| `finance.html` | 재정·살림 ← `finance.json`(주간 헌금), `finance-docs.json`(반기보고서), `utilities.json`(전기요금 표) |
| `admin.html` | 관리자: 대시보드(방문 통계) + "사이트에서 직접 편집"(`?edit=1`) |
| `js/cms.js` | DB 값 적용 (전 방문자 실행 — 신중히) |
| `js/edit.js` | 편집기, `?edit=1`/`?preview=1`일 때만 동적 로드 (일반 `<script>`로 바꾸지 말 것) |
| `js/vendor/`, `assets/fonts/` | supabase-js·Pretendard self-host (외부 CDN 미사용) |
| `bulletins/YYYY/`, `bulletins/youth/YYYY/` | 주보 PDF (500KB 이하로 압축) |
| `scripts/` | `make-bulletin.py`, `build-bulletins.mjs`, `set-finance.mjs`, `set-utility.mjs`, `build-finance-docs.mjs`, `import-bulletins.mjs`, `stamp-assets.mjs` |

## 환경 메모
- 샌드박스에서 라이브 사이트·외부 WHOIS 등은 프록시로 막힌다. 라이브 확인은 사용자에게 강력 새로고침(Ctrl+Shift+R)을 요청.
- 컨테이너 재시작 후 `gs`/`pdftoppm`/Pillow가 사라질 수 있다: `apt-get update && apt-get install -y ghostscript poppler-utils`, `pip install Pillow`.
- 로컬 검증: `python3 -m http.server` + Playwright(`/opt/pw-browsers`) 헤드리스로 콘솔 에러·렌더 확인.
