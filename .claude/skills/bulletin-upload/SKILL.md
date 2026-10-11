---
name: bulletin-upload
description: 종의교회 주보(주일·학생부)를 홈페이지에 올리는 매주 절차. 사용자가 주보 이미지/PDF를 주며 "주보 올려줘", "올려줘", 또는 주보 사진만 보낼 때 사용. PDF 생성, 아카이브 인덱스 갱신, 재정 새 주차 입력, 배포 확인까지 한 번에 처리한다. 지난 주보 여러 개를 폴더째 일괄 등록할 때도 사용.
---

# 주보 올리기

"주보 올려줘"는 항상 **① 주보 PDF ② 재정 보고 ③ 배포 확인**을 모두 뜻한다. ("이번 주 주보" 링크는 자동이라 손대지 않는다.)

## 1. 입력 파악
- 주일 주보는 보통 이미지 2장: **겉장**("종의교회 SINCE 2023", 셀모임·교회조직 — 1쪽) / **속장**(예배순서·교회소식·[3] 재정보고 — 2쪽).
- 첨부 순서는 매번 다르다. **파일명이 아니라 내용으로** 겉장/속장을 구분한다.
- 날짜·호수는 우측 상단 `제4권 NN호 YYYY.MM.DD`에서 읽는다.
- 학생부 주보(YOUTH WORSHIP)는 표지+예배순서. 좌우 펼침 1장이면 스크립트가 자동 분할하고, 2-up 인쇄본(두 호가 나란히)이면 `--left-half`로 해당 호만 추출한다.
- 첨부 이미지 경로는 시스템 메시지에 나온다(`/root/.claude/uploads/...` 또는 `.../images/N.jpg`). 경로가 없거나 파일이 디스크에 없으면 PDF는 만들 수 없다 → 재정만 처리하고 사용자에게 **이미지 재첨부**를 요청한다.

## 2. PDF 생성
```bash
python3 scripts/make-bulletin.py <YYYY-MM-DD> <겉장> <속장>            # 주일
python3 scripts/make-bulletin.py <YYYY-MM-DD> <이미지> --youth          # 학생부
node scripts/build-bulletins.mjs                                       # 인덱스 갱신
```
- 스크립트가 합치기·압축(>500KB)·유효성 검사를 한다. 출력이 "유효"인지 확인.
- 순서가 의심되면 `pdftoppm -png -r 55 -f 1 -l 1 <pdf> <scratch>/p` 후 1쪽이 겉장인지 눈으로 확인.
- 도구가 없으면(컨테이너 재시작 후 흔함): `apt-get update && apt-get install -y ghostscript poppler-utils`, `pip install Pillow`.

## 3. 재정 보고
속장 [3] 재정보고에서 **아직 finance.json에 없는 완료 주차**를 입력한다 → `finance-records` 스킬의 규칙을 따른다(검산 필수).
```bash
node scripts/set-finance.mjs <주간 시작 일요일> <일반> <목적> <구제>
```

## 4. 커밋·배포
```bash
git add -A && git commit -m "주보 추가: YYYY-MM-DD(제4권 NN호) 주일 주보 + 재정 MM-DD"
git push origin HEAD:main && git push origin claude/increase-font-size-0h6rpk
```
- push 후 GitHub MCP `actions_list`로 최신 "pages build and deployment" conclusion=success 확인(지연되면 잠시 후 재확인, 실패면 재실행).

## 5. 보고 (표 하나로 짧게)
주보 링크 `https://www.jongschurch.com/bulletins/YYYY/YYYY-MM-DD.pdf`, 아카이브 총 개수, 입력한 재정 주차·금액(검산 결과), "이번 주 보기 자동 연결", 배포 success.

## 지난 주보 일괄 등록
원본 폴더가 있으면 `node scripts/import-bulletins.mjs "<폴더>"` (파일명 날짜 인식, 같은 날짜는 -2/-3, 중복 건너뜀, 인덱스 자동 갱신). "날짜를 못 읽어 건너뜀" 목록은 사용자에게 보고. 500KB 넘는 PDF는 압축:
`gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dColorImageResolution=150 -dGrayImageResolution=150 -dNOPAUSE -dQUIET -dBATCH -sOutputFile=out.pdf in.pdf`

## 하지 말 것
- `bulletins.json` 직접 편집 (항상 build-bulletins.mjs로 생성).
- 기존 주보 파일 덮어쓰기·삭제 (의심되면 먼저 확인).
- index.html의 "이번 주 주보" 링크를 CMS 고정값(`home_news_bulletin_link`)으로 되돌리기.
