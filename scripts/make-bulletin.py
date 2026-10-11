#!/usr/bin/env python3
"""주보 이미지 → PDF 생성기 (페이지 순서대로 합치고, 크면 압축, 유효성 검사).

사용법:
  python3 scripts/make-bulletin.py <YYYY-MM-DD> <1쪽> [<2쪽> ...] [--youth] [--left-half]

  1쪽 = 겉장(표지, "종의교회 SINCE 2023"), 2쪽 = 속장(예배순서·재정보고)
  --youth      학생부 주보 → bulletins/youth/YYYY/
  --left-half  각 이미지의 왼쪽 절반만 사용 (2-up 인쇄본에서 해당 호만 추출할 때)

예:
  python3 scripts/make-bulletin.py 2026-10-11 cover.jpg inner.jpg
  python3 scripts/make-bulletin.py 2026-07-19 youth-spread.png --youth   # 좌우 펼침 1장 → 2쪽으로 분할

이미지가 1장이고 가로로 긴 펼침(가로 > 세로×1.2)이면 좌/우 2쪽으로 자동 분할한다.
필요: Pillow (pip install Pillow), ghostscript (압축·검증, 없으면 건너뜀).
"""
import os
import re
import shutil
import subprocess
import sys

from PIL import Image

LIMIT = 500_000  # 이보다 크면 ghostscript /ebook 압축


def main(argv):
    flags = {a for a in argv if a.startswith("--")}
    args = [a for a in argv if not a.startswith("--")]
    if len(args) < 2 or not re.fullmatch(r"20\d{2}-\d{2}-\d{2}", args[0]):
        sys.exit(__doc__)
    date, sources = args[0], args[1:]

    pages = []
    for src in sources:
        im = Image.open(src).convert("RGB")
        w, h = im.size
        if "--left-half" in flags:
            im = im.crop((0, 0, w // 2, h))
        pages.append(im)
    # 펼침 1장 → 좌/우 2쪽
    if len(pages) == 1 and "--left-half" not in flags and pages[0].width > pages[0].height * 1.2:
        im = pages[0]
        half = im.width // 2
        pages = [im.crop((0, 0, half, im.height)), im.crop((half, 0, im.width, im.height))]

    sub = os.path.join("bulletins", "youth") if "--youth" in flags else "bulletins"
    out_dir = os.path.join(sub, date[:4])
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, date + ".pdf")
    pages[0].save(out, save_all=True, append_images=pages[1:], resolution=150.0)

    gs = shutil.which("gs")
    if gs and os.path.getsize(out) > LIMIT:
        tmp = out + ".tmp.pdf"
        subprocess.run([gs, "-sDEVICE=pdfwrite", "-dPDFSETTINGS=/ebook",
                        "-dColorImageResolution=150", "-dGrayImageResolution=150",
                        "-dNOPAUSE", "-dQUIET", "-dBATCH", "-sOutputFile=" + tmp, out], check=False)
        if os.path.exists(tmp) and 0 < os.path.getsize(tmp) < os.path.getsize(out):
            os.replace(tmp, out)
        elif os.path.exists(tmp):
            os.remove(tmp)

    valid = "검증 생략(gs 없음)"
    if gs:
        ok = subprocess.run([gs, "-sDEVICE=nullpage", "-dNOPAUSE", "-dBATCH", "-dQUIET", out]).returncode == 0
        valid = "유효" if ok else "손상!"
    print(f"✓ {out} — {len(pages)}쪽, {os.path.getsize(out):,} bytes, {valid}")


if __name__ == "__main__":
    main(sys.argv[1:])
