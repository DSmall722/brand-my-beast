#!/usr/bin/env python3
"""Bake readable 1–11 marks onto the four stainless board stills.

Homepage board views are static JPEGs. Cards stay the clickable inventory.
Only numbers that read on that angle are painted.

  Driver    (closed-door profile, nose left): 1 2 3 4 5 6 10 11
  Passenger (¾, nose right):                  1 2 3 7 8 9
  Front     (head-on):                        1 2 3
  Rear      (straight-on forest road):        10 11 only — no tonneau

Lime plate #d6ff3f / ink #07090c.

Rerun from repo root after unmarked stills exist:

  python3 scripts/paint-board-marks.py
  python3 scripts/credit-board-stills.py
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BASE = ROOT / "scripts" / ".board-stills-unmarked"
FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")

LIME = (214, 255, 63, 255)
INK = (7, 9, 12, 255)
RING = (7, 9, 12, 220)

# Percents of the 1280×720 still. Skip marks that do not read.
# Matches src/lib/panel-board.ts BOARD_LAYOUT views.
MARKS: dict[str, list[tuple[int, float, float]]] = {
    "driver": [
        (1, 22, 38),
        (2, 12, 50),
        (3, 10, 58),
        (4, 42, 48),
        (5, 80, 46),
        (6, 68, 46),
        (10, 88, 40),
        (11, 92, 58),
    ],
    "passenger": [
        (1, 68, 36),
        (2, 86, 50),
        (3, 90, 62),
        (7, 50, 48),
        (8, 12, 44),
        (9, 20, 46),
    ],
    "front": [
        (1, 50, 26),
        (2, 50, 48),
        (3, 50, 80),
    ],
    "rear": [
        (10, 59, 50),
        (11, 59, 67),
    ],
}


def snapshot_unmarked() -> None:
    BASE.mkdir(parents=True, exist_ok=True)
    for view in MARKS:
        dest = BASE / f"truck-view-{view}.jpg"
        src = PUBLIC / f"truck-view-{view}.jpg"
        if dest.exists():
            continue
        if not src.exists():
            raise FileNotFoundError(src)
        shutil.copy2(src, dest)


def plate(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int) -> None:
    box = (cx - r, cy - r, cx + r, cy + r)
    draw.ellipse(box, fill=LIME, outline=RING, width=2)


def paint(view: str) -> None:
    src = BASE / f"truck-view-{view}.jpg"
    dest = PUBLIC / f"truck-view-{view}.jpg"
    with Image.open(src) as raw:
        im = raw.convert("RGBA")
    w, h = im.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    radius = 20 if w >= 1000 else 14
    font = ImageFont.truetype(str(FONT), 22 if w >= 1000 else 16)
    for n, xp, yp in MARKS[view]:
        cx = int(w * xp / 100)
        cy = int(h * yp / 100)
        plate(draw, cx, cy, radius)
        label = str(n)
        bbox = draw.textbbox((0, 0), label, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(
            (cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1] - 1),
            label,
            font=font,
            fill=INK,
        )
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    for n, xp, yp in MARKS[view]:
        cx = int(w * xp / 100)
        cy = int(h * yp / 100)
        sd.ellipse(
            (cx - radius + 2, cy - radius + 3, cx + radius + 2, cy + radius + 3),
            fill=(0, 0, 0, 90),
        )
    shadow = shadow.filter(ImageFilter.GaussianBlur(2))
    out = Image.alpha_composite(im, shadow)
    out = Image.alpha_composite(out, layer).convert("RGB")
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"wrote {dest} ({dest.stat().st_size} bytes) marks={[m[0] for m in MARKS[view]]}")


def main() -> None:
    snapshot_unmarked()
    for view in MARKS:
        paint(view)


if __name__ == "__main__":
    main()
