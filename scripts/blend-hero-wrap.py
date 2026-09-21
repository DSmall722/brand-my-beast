#!/usr/bin/env python3
"""Composite the locked house-wrap C hero onto the night studio plate.

The wrap source is a product plate: dark cove up top, a lighter gray floor
that reads as a hard matte once it sits in `.hero` (`#07090c → #10151c`,
well `#0a0d12`). This extends that studio floor/backdrop behind the truck
and keeps a soft contact shadow — same plate the stainless compositor uses.

Rerun from repo root:
  python3 scripts/blend-hero-wrap.py

Does not call rembg (black wrap would get eaten). Does not paint seat
numbers. Branding stays: BrandMyBeast on the door, BMB on the rear.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
# Locked wrap lives next to the campaign checkout, not in this worktree.
WRAP_CANDIDATES = (
    Path("/workspace/brandmybeast-wrap-mockups/HERO_LOCKED_full-wrap-c.png"),
    ROOT.parent / "brandmybeast-wrap-mockups" / "HERO_LOCKED_full-wrap-c.png",
    Path("/workspace/HERO_LOCKED_full-wrap-c.png"),
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
        "HERO_LOCKED_full-wrap-c.png not found. Expected under "
        "/workspace/brandmybeast-wrap-mockups/"
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


def luma_sat(arr: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / (mx + 1.0)
    return luma, sat


def is_lime(arr: np.ndarray, sat: np.ndarray) -> np.ndarray:
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    return (g > r + 12) & (g > b + 18) & (sat > 0.22)


def flood_floor(arr: np.ndarray) -> np.ndarray:
    """Replace the gray product floor, stop on wrap / lime / steel."""
    h, w = arr.shape[:2]
    luma, sat = luma_sat(arr)
    lime = is_lime(arr, sat)
    walkable = (
        (~lime)
        & (sat < 0.18)
        & (luma >= 26)
        & (luma <= 170)
    )
    mask = np.zeros((h, w), dtype=np.uint8)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in range(h - 4, h):
            if walkable[y, x]:
                mask[y, x] = 1
                q.append((x, y))
    # Side skirts of the plate, lower 45%.
    y0 = int(h * 0.55)
    for y in range(y0, h):
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


def border_and_cove(arr: np.ndarray) -> np.ndarray:
    """Crush the already-dark cove / frame toward the studio plate."""
    h, w = arr.shape[:2]
    luma, sat = luma_sat(arr)
    lime = is_lime(arr, sat)
    yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    xx = np.linspace(0.0, 1.0, w, dtype=np.float32)[None, :]
    edge = np.minimum(np.minimum(xx, 1.0 - xx), np.minimum(yy, 1.0 - yy))
    # Outer frame + upper cove (no truck there). Tight luma so wrap stays.
    cove = (
        (~lime)
        & (sat < 0.28)
        & (luma < 58)
        & ((edge < 0.045) | (yy < 0.16) | ((yy < 0.28) & (edge < 0.12)))
    )
    return cove.astype(np.uint8)


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
    floor = flood_floor(arr)
    cove = border_and_cove(arr)
    replace = np.clip(floor.astype(np.float32) + cove.astype(np.float32), 0, 1)

    alpha = Image.fromarray((replace * 255).astype(np.uint8), mode="L")
    alpha = alpha.filter(ImageFilter.GaussianBlur(10))
    # Keep a little of the original contact dirt so the truck is not a sticker.
    alpha_arr = np.asarray(alpha).astype(np.float32) / 255.0
    alpha_arr = np.clip(alpha_arr * 0.96, 0, 1)

    plate = studio_plate(rgb.size)
    truck_rgba = rgb.convert("RGBA")
    out = Image.composite(plate, truck_rgba, Image.fromarray((alpha_arr * 255).astype(np.uint8)))
    fitted = crop_16x9(out).resize(WIDE_SIZE, Image.Resampling.LANCZOS)
    save_jpeg(fitted, WIDE)
    save_jpeg(fitted.resize(NARROW_SIZE, Image.Resampling.LANCZOS), NARROW)
    print(f"wrote {WIDE} ({WIDE.stat().st_size} bytes) from {src}")
    print(f"wrote {NARROW} ({NARROW.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
