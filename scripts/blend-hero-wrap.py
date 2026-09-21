#!/usr/bin/env python3
"""Composite the locked hero-master still onto the night studio plate.

Source is an all-caps R1 cutout on a black field. Flood only that field
from the edges so the JPEG matches `.hero` (`#07090c → #10151c`, well
`#0a0d12`). Do not call rembg. Do not paint seat numbers.

Rerun from repo root:
  python3 scripts/blend-hero-wrap.py
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
WRAP_CANDIDATES = (
    Path("/cursor/stores/bc-a458469d-d38b-45a7-8036-6cb15dc5431e/media/hero-master.png"),
    ROOT.parent / "brandmybeast-hero-concepts" / "hero-set" / "hero-master.png",
    Path("/workspace/brandmybeast-hero-concepts/hero-set/hero-master.png"),
)
PUBLIC = ROOT / "public"
WIDE = PUBLIC / "hero-truck-preview.jpg"
NARROW = PUBLIC / "hero-truck-preview-640.jpg"
WIDE_SIZE = (1280, 720)
NARROW_SIZE = (640, 360)
STUDIO = (10, 13, 18)


def find_wrap() -> Path:
    for path in WRAP_CANDIDATES:
        if path.is_file():
            return path
    raise FileNotFoundError(
        "hero-master.png not found. Expected under the campaign media store "
        "or brandmybeast-hero-concepts/hero-set/"
    )


def studio_plate(size: tuple[int, int]) -> Image.Image:
    """Night cove + soft floor pool — matches scripts/build-truck-stills.py."""
    plate = Image.new("RGBA", size, (*STUDIO, 255))
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = size[0] / 2, size[1] * 0.62
    for i in range(22, 0, -1):
        rx = size[0] * 0.34 * (i / 7)
        ry = size[1] * 0.10 * (i / 7)
        shade = int(14 + i * 2)
        draw.ellipse(
            (cx - rx, cy - ry, cx + rx, cy + ry),
            fill=(shade, shade + 2, shade + 6, 32),
        )
    return Image.alpha_composite(plate, overlay.filter(ImageFilter.GaussianBlur(36)))


def flood_black_field(arr: np.ndarray) -> np.ndarray:
    """Replace the black studio field. Stop on the truck."""
    h, w = arr.shape[:2]
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    walkable = luma < 8.0
    mask = np.zeros((h, w), dtype=np.uint8)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, 1, 2, h - 3, h - 2, h - 1):
            if walkable[y, x]:
                mask[y, x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, 1, 2, w - 3, w - 2, w - 1):
            if walkable[y, x] and mask[y, x] == 0:
                mask[y, x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            if mask[ny, nx] or not walkable[ny, nx]:
                continue
            mask[ny, nx] = 1
            q.append((nx, ny))
    return mask


def crop_16x9(im: Image.Image) -> Image.Image:
    w, h = im.size
    target = 16 / 9
    ratio = w / h
    if abs(ratio - target) < 0.002:
        return im
    if ratio > target:
        new_w = int(round(h * target))
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))
    new_h = int(round(w / target))
    top = (h - new_h) // 2
    return im.crop((0, top, w, top + new_h))


def save_jpeg(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGB").save(dest, "JPEG", quality=88, optimize=True, progressive=True)


def main() -> None:
    src = find_wrap()
    with Image.open(src) as raw:
        rgb = raw.convert("RGB")
    arr = np.asarray(rgb)
    replace = flood_black_field(arr)

    alpha = Image.fromarray((replace * 255).astype(np.uint8), mode="L")
    alpha = alpha.filter(ImageFilter.GaussianBlur(8))
    alpha_arr = np.clip(np.asarray(alpha).astype(np.float32) / 255.0 * 0.98, 0, 1)

    plate = studio_plate(rgb.size)
    truck_rgba = rgb.convert("RGBA")
    out = Image.composite(
        plate,
        truck_rgba,
        Image.fromarray((alpha_arr * 255).astype(np.uint8)),
    )
    fitted = crop_16x9(out).resize(WIDE_SIZE, Image.Resampling.LANCZOS)
    save_jpeg(fitted, WIDE)
    save_jpeg(fitted.resize(NARROW_SIZE, Image.Resampling.LANCZOS), NARROW)
    print(f"wrote {WIDE} ({WIDE.stat().st_size} bytes) from {src}")
    print(f"wrote {NARROW} ({NARROW.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
