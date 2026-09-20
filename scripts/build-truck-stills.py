#!/usr/bin/env python3
"""Cut Wikimedia Cybertruck photos onto the night studio ground.

Rerun from repo root: python3 scripts/build-truck-stills.py
Sources are CC-BY-SA stills listed in press-kit/STILLS.md. Output JPEGs are
1280×720 (hero also 640×360). EXIF is stripped. No wrap art is painted on.
"""

from __future__ import annotations

import io
import json
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from rembg import remove

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CACHE = Path("/tmp/ct-wiki-cache")
UA = "BrandMyBeastStillBuilder/1.0 (local preview; https://brandmybeast.com)"

# Commons FilePath titles. Crop boxes are source pixels (left, top, right, bottom).
SOURCES = {
    "hero": {
        "title": "2024 Tesla Cybertruck Foundation Series, front left (Greenwich).jpg",
        "file": "front-left.jpg",
        "crop": (200, 360, 4700, 2780),
        "mode": "cutout-restore",
    },
    "side": {
        "title": "2024 Tesla Cybertruck Foundation Series, rear left (Greenwich).jpg",
        "file": "rear-left.jpg",
        "crop": (180, 520, 4720, 2780),
        "mode": "cutout",
        "blur": [(0.86, 0.62, 0.94, 0.72)],
    },
    "front": {
        "title": "2024 Tesla Cybertruck Foundation Series IMG 0642.jpg",
        "file": "front-642.jpg",
        "crop": (180, 120, 4680, 2780),
        "mode": "cutout",
    },
    "rear": {
        "title": "2024 Tesla Cybertruck, rear 9.7.24.jpg",
        "file": "rear-97.jpg",
        "crop": (120, 40, 2440, 1240),
        "mode": "cutout",
        "blur": [(0.20, 0.68, 0.28, 0.78)],
    },
}

OUTPUTS = {
    "hero": PUBLIC / "hero-truck-preview.jpg",
    "side": PUBLIC / "truck-view-side.jpg",
    "front": PUBLIC / "truck-view-front.jpg",
    "rear": PUBLIC / "truck-view-rear.jpg",
}

HERO_NARROW = PUBLIC / "hero-truck-preview-640.jpg"
WIDE = (1280, 720)
NARROW = (640, 360)
STUDIO = (10, 13, 18, 255)


def fetch(spec: dict) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / spec["file"]
    if dest.exists() and dest.stat().st_size > 10_000:
        return dest
    title = spec["title"].replace(" ", "_")
    url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{title}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())
    return dest


def cutout(rgb: Image.Image) -> Image.Image:
    work = rgb.copy()
    work.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
    raw = remove(work)
    if isinstance(raw, bytes):
        cut = Image.open(io.BytesIO(raw)).convert("RGBA")
    else:
        cut = raw.convert("RGBA")
    if cut.size != rgb.size:
        cut = cut.resize(rgb.size, Image.Resampling.LANCZOS)
    return cut


def restore_stainless_bed(cut: Image.Image, rgb: Image.Image) -> Image.Image:
    """Rembg drops the bright bed against water; put desaturated steel back."""
    orig = rgb.convert("RGBA")
    out = cut.copy()
    cw, ch = out.size
    px_c = out.load()
    px_o = orig.load()
    for y in range(int(ch * 0.18), int(ch * 0.82)):
        for x in range(int(cw * 0.62), int(cw * 0.98)):
            r, g, b, a = px_c[x, y]
            or_, og, ob, _ = px_o[x, y]
            mx, mn = max(or_, og, ob), min(or_, og, ob)
            sat = (mx - mn) / (mx + 1)
            mean = (or_ + og + ob) / 3
            if a < 50 and sat < 0.22 and 50 < mean < 210:
                px_c[x, y] = (or_, og, ob, 255)
    return out


def bbox_alpha(im: Image.Image, threshold: int = 12) -> tuple[int, int, int, int]:
    alpha = im.split()[-1]
    box = alpha.point(lambda p: 255 if p > threshold else 0).getbbox()
    if not box:
        return (0, 0, im.width, im.height)
    return box


def studio_plate(size: tuple[int, int]) -> Image.Image:
    plate = Image.new("RGBA", size, STUDIO)
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = size[0] / 2, size[1] * 0.58
    for i in range(18, 0, -1):
        rx = size[0] * 0.22 * (i / 6)
        ry = size[1] * 0.08 * (i / 6)
        shade = int(18 + i * 2)
        draw.ellipse(
            (cx - rx, cy - ry, cx + rx, cy + ry),
            fill=(shade, shade + 2, shade + 6, 28),
        )
    return Image.alpha_composite(plate, overlay.filter(ImageFilter.GaussianBlur(28)))


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
    target_ratio = 16 / 9
    ratio = tw / th
    if ratio > target_ratio:
        new_h = int(tw / target_ratio)
        canvas = Image.new("RGBA", (tw, new_h), (0, 0, 0, 0))
        canvas.paste(truck, (0, new_h - th), truck)
        truck = canvas
    elif ratio < target_ratio:
        new_w = int(th * target_ratio)
        canvas = Image.new("RGBA", (new_w, th), (0, 0, 0, 0))
        canvas.paste(truck, ((new_w - tw) // 2, 0), truck)
        truck = canvas
    return truck


def compose(cut: Image.Image, size: tuple[int, int]) -> Image.Image:
    fitted = fit_16x9(cut).resize(size, Image.Resampling.LANCZOS)
    plate = studio_plate(size)
    return Image.alpha_composite(plate, fitted).convert("RGB")


def grade_lawn(rgb: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Keep the full truck; crush grass/sky toward the night studio plate."""
    fitted = rgb.copy()
    tw, th = fitted.size
    target_ratio = 16 / 9
    ratio = tw / th
    if ratio > target_ratio:
        new_w = int(th * target_ratio)
        left = (tw - new_w) // 2
        fitted = fitted.crop((left, 0, left + new_w, th))
    elif ratio < target_ratio:
        new_h = int(tw / target_ratio)
        top = (th - new_h) // 2
        fitted = fitted.crop((0, top, tw, top + new_h))
    fitted = fitted.resize(size, Image.Resampling.LANCZOS).convert("RGB")
    pixels = fitted.load()
    for y in range(size[1]):
        vignette = 1.0 - ((y / size[1] - 0.45) ** 2) * 0.55
        edge_x = 1.0
        for x in range(size[0]):
            nx = abs(x / size[0] - 0.5) * 2
            edge_x = 1.0 - nx * 0.18
            r, g, b = pixels[x, y]
            # Grass / trees / water go dark; stainless stays.
            greenish = g > r + 12 and g > b - 8
            sky = b > 90 and b > r + 8 and g > r
            if greenish or sky:
                r = int(r * 0.12)
                g = int(g * 0.14)
                b = int(b * 0.16)
            else:
                r = int(r * 0.92 * vignette * edge_x)
                g = int(g * 0.90 * vignette * edge_x)
                b = int(b * 0.88 * vignette * edge_x)
            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
    return fitted


def blur_plates(im: Image.Image, boxes: list[tuple[float, float, float, float]]) -> Image.Image:
    out = im.copy()
    for left, top, right, bottom in boxes:
        box = (
            int(left * im.width),
            int(top * im.height),
            int(right * im.width),
            int(bottom * im.height),
        )
        region = out.crop(box).filter(ImageFilter.GaussianBlur(8))
        out.paste(region, box)
    return out


def save_jpeg(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=86, optimize=True, progressive=True)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for key, spec in SOURCES.items():
        src = fetch(spec)
        with Image.open(src) as raw:
            rgb = raw.convert("RGB")
        crop = spec["crop"]
        rgb = rgb.crop(crop)
        mode = spec.get("mode")
        if mode == "grade":
            still = grade_lawn(rgb, WIDE)
        elif mode == "cutout-restore":
            still = compose(restore_stainless_bed(cutout(rgb), rgb), WIDE)
        else:
            still = compose(cutout(rgb), WIDE)
        if spec.get("blur"):
            still = blur_plates(still, spec["blur"])
        dest = OUTPUTS[key]
        save_jpeg(still, dest)
        if key == "hero":
            save_jpeg(still.resize(NARROW, Image.Resampling.LANCZOS), HERO_NARROW)
        manifest[key] = {
            "src": dest.name,
            "bytes": dest.stat().st_size,
            "size": list(still.size),
        }
        print(f"wrote {dest} ({dest.stat().st_size} bytes)")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
