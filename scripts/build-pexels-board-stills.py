#!/usr/bin/env python3
"""Cut Dennard's locked Pexels Cybertruck stills onto the night studio plate.

Sources live next to the campaign checkout (not committed). Rebuild:

  python3 scripts/build-pexels-board-stills.py
  python3 scripts/paint-board-marks.py
  python3 scripts/credit-board-stills.py

Do not call rembg. GrabCut + studio plate. Credits are applied after paint.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
UNMARKED = ROOT / "scripts" / ".board-stills-unmarked"
PEXELS = Path("/workspace/brandmybeast-pexels")
WIDE = (1280, 720)
STUDIO = (10, 13, 18, 255)

# Tight truck boxes. No GrabCut — these plates already sit on clean ground.
# crop is source pixels (left, top, right, bottom).
SOURCES = {
    "driver": {
        "file": PEXELS / "27908531.jpg",
        "crop": (1320, 1420, 4080, 2920),
    },
    "passenger": {
        "file": PEXELS / "24734498.jpg",
        "crop": (80, 1080, 5480, 3680),
    },
    "front": {
        "file": PEXELS / "24734499.jpg",
        "crop": (780, 80, 5120, 3880),
    },
    "rear": {
        # Locked 2026-09-21: Stephen Leonardi 29278630. Do not rebuild
        # from James Collington 30073773.
        "file": PEXELS / "29278630.jpg",
        "crop": (0, 91, 1600, 991),
    },
}


def studio_plate(size: tuple[int, int]) -> Image.Image:
    plate = Image.new("RGBA", size, STUDIO)
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = size[0] / 2, size[1] * 0.62
    for i in range(18, 0, -1):
        rx = size[0] * 0.28 * (i / 6)
        ry = size[1] * 0.09 * (i / 6)
        shade = int(18 + i * 2)
        draw.ellipse(
            (cx - rx, cy - ry, cx + rx, cy + ry),
            fill=(shade, shade + 2, shade + 6, 28),
        )
    return Image.alpha_composite(plate, overlay.filter(ImageFilter.GaussianBlur(28)))


def grabcut_rgba(rgb: Image.Image) -> Image.Image:
    """Foreground mask via GrabCut. Border is sure background."""
    arr = np.asarray(rgb.convert("RGB"))
    bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    h, w = bgr.shape[:2]
    inset = max(8, min(w, h) // 40)
    rect = (inset, inset, max(1, w - 2 * inset), max(1, h - 2 * inset))
    mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, rect, bgd, fgd, 3, cv2.GC_INIT_WITH_RECT)
    keep = np.where(
        (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0
    ).astype(np.uint8)
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    keep = cv2.GaussianBlur(keep, (11, 11), 0)
    rgba = np.dstack([arr, keep])
    return Image.fromarray(rgba, "RGBA")


def bbox_alpha(im: Image.Image, threshold: int = 18) -> tuple[int, int, int, int]:
    alpha = im.split()[-1]
    box = alpha.point(lambda p: 255 if p > threshold else 0).getbbox()
    if not box:
        return (0, 0, im.width, im.height)
    return box


def fit_16x9(cut: Image.Image) -> Image.Image:
    left, top, right, bottom = bbox_alpha(cut)
    pad_x = int((right - left) * 0.10)
    pad_y = int((bottom - top) * 0.12)
    left = max(0, left - pad_x)
    top = max(0, top - pad_y)
    right = min(cut.width, right + pad_x)
    bottom = min(cut.height, bottom + int(pad_y * 0.55))
    truck = cut.crop((left, top, right, bottom))
    tw, th = truck.size
    target = 16 / 9
    ratio = tw / th
    if ratio > target:
        new_h = int(tw / target)
        canvas = Image.new("RGBA", (tw, new_h), (0, 0, 0, 0))
        canvas.paste(truck, (0, new_h - th), truck)
        truck = canvas
    elif ratio < target:
        new_w = int(th * target)
        canvas = Image.new("RGBA", (new_w, th), (0, 0, 0, 0))
        canvas.paste(truck, ((new_w - tw) // 2, 0), truck)
        truck = canvas
    return truck


def compose(cut: Image.Image) -> Image.Image:
    fitted = fit_16x9(cut).resize(WIDE, Image.Resampling.LANCZOS)
    return Image.alpha_composite(studio_plate(WIDE), fitted).convert("RGB")


def save_jpeg(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=88, optimize=True, progressive=True)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    UNMARKED.mkdir(parents=True, exist_ok=True)
    for key, spec in SOURCES.items():
        src = spec["file"]
        if not src.is_file():
            raise FileNotFoundError(
                f"{src} missing. Put the locked Pexels stills in {PEXELS}"
            )
        unmarked = UNMARKED / f"truck-view-{key}.jpg"
        public = PUBLIC / f"truck-view-{key}.jpg"
        with Image.open(src) as raw:
            rgb = raw.convert("RGB").crop(spec["crop"])
        if key == "rear":
            # Locked forest-road still. Keep the autumn trees; do not GrabCut.
            still = rgb.resize(WIDE, Image.Resampling.LANCZOS)
        else:
            rgb.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            still = compose(rgb.convert("RGBA"))
        save_jpeg(still, unmarked)
        save_jpeg(still, public)
        print(f"wrote {unmarked} and {public} ({public.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
