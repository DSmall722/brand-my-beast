#!/usr/bin/env python3
"""Bake readable 1–12 marks onto the stainless Side / Front / Rear stills.

Homepage board views are static JPEGs. Cards stay the clickable inventory.
Only numbers that read on that angle are painted.

  Side  (driver ¾-rear): 1 2 3 5 7 9 10 11 12
  Front (passenger-front): 1 2 4 11
  Rear  (passenger-rear): 6 8 9 10 11 12

Percents match BOARD_LAYOUT in src/lib/panel-board.ts (contain, 16:9 still).
Lime plate #d6ff3f / ink #07090c — same contrast pair as the live callouts.

Rerun from repo root after unmarked stills exist:
  python3 scripts/paint-board-marks.py

Unmarked sources are snapshotted once to scripts/.board-stills-unmarked/.
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
MARKS: dict[str, list[tuple[int, float, float]]] = {
    "side": [
        (1, 16, 33),
        (2, 9, 58),
        (3, 32, 48),
        (5, 47, 44),
        (7, 74, 46),
        (9, 86, 44),
        (10, 58, 22),
        (11, 40, 17),
        (12, 90, 64),
    ],
    "front": [
        (1, 40, 38),
        (2, 36, 76),
        (4, 76, 46),
        (11, 48, 12),
    ],
    "rear": [
        (6, 50, 40),
        (8, 40, 40),
        (9, 22, 42),
        (10, 24, 27),
        (11, 52, 22),
        (12, 22, 70),
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
    # Soft drop so the plate sits on steel, not a sticker.
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
