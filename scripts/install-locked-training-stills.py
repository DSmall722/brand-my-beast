#!/usr/bin/env python3
"""Fit Dennard's four locked Pexels ORIGINALS onto 1280×720 public plates.

Only these files. No prior site stills, no stripped derivatives, no Mylo-as-driver.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
MEDIA = Path("/cursor/stores/bc-a458469d-d38b-45a7-8036-6cb15dc5431e/media")
WIDE = (1280, 720)

# Source pixels (left, top, right, bottom) on the locked originals.
SOURCES = {
    "driver": {
        "file": MEDIA / "truck-base-driver-joe-27908531.jpg",
        # Tight on the garage truck. Nose left.
        "crop": (980, 1180, 4220, 3005),
        "artist": "Joe L",
        "url": "https://www.pexels.com/photo/a-car-is-parked-in-a-garage-with-a-large-concrete-floor-27908531/",
    },
    "passenger": {
        "file": MEDIA / "truck-base-passenger-mylo-24734498.jpg",
        "crop": (0, 267, 5120, 3147),
        "artist": "Mylo Kaye",
        "url": "https://www.pexels.com/photo/silver-tesla-cybertruck-24734498/",
    },
    "front": {
        "file": MEDIA / "truck-base-front-mylo-24734499.jpg",
        "crop": (0, 267, 5120, 3147),
        "artist": "Mylo Kaye",
        "url": "https://www.pexels.com/photo/tesla-cyber-truck-24734499/",
    },
    "rear": {
        "file": MEDIA / "truck-base-rear-leonardi-29278630.jpg",
        "crop": (0, 400, 5120, 3280),
        "artist": "Stephen Leonardi",
        "url": "https://www.pexels.com/photo/futuristic-truck-on-a-forest-road-in-autumn-29278630/",
    },
}


def fit_16x9(im: Image.Image) -> Image.Image:
    rgb = im.convert("RGB")
    w, h = rgb.size
    target = 16 / 9
    ratio = w / h
    if abs(ratio - target) < 0.02:
        cropped = rgb
    elif ratio > target:
        new_w = int(h * target)
        left = (w - new_w) // 2
        cropped = rgb.crop((left, 0, left + new_w, h))
    else:
        new_h = int(w / target)
        top = max(0, (h - new_h) // 4)
        if top + new_h > h:
            top = h - new_h
        cropped = rgb.crop((0, top, w, top + new_h))
    return cropped.resize(WIDE, Image.Resampling.LANCZOS)


def find_exiftool() -> str | None:
    found = shutil.which("exiftool")
    if found:
        return found
    local = Path("/tmp/Image-ExifTool/exiftool")
    return str(local) if local.is_file() else None


def stamp(dest: Path, artist: str, url: str) -> None:
    tool = find_exiftool()
    text = f"Photo by {artist} on Pexels — {url}"
    if not tool:
        print(f"skip credit stamp for {dest.name} (no exiftool)")
        return
    subprocess.run(
        [
            tool,
            "-overwrite_original",
            f"-Artist={artist}",
            f"-IPTC:By-line={artist}",
            f"-XMP-dc:Creator={artist}",
            f"-Copyright={text}",
            f"-XMP-dc:Rights={text}",
            f"-ImageDescription={text}",
            f"-IPTC:CopyrightNotice={text}",
            f"-XMP-dc:Description={text}",
            f"-IPTC:Source={url}",
            f"-XMP-xmpRights:WebStatement={url}",
            str(dest),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    print(f"credited {dest.name} → {artist}")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for key, spec in SOURCES.items():
        src = spec["file"]
        if not src.is_file():
            raise FileNotFoundError(src)
        with Image.open(src) as raw:
            left, top, right, bottom = spec["crop"]
            cut = raw.convert("RGB").crop((left, top, right, bottom))
        fitted = fit_16x9(cut)
        dest = PUBLIC / f"truck-view-{key}.jpg"
        fitted.save(dest, "JPEG", quality=90, optimize=True, progressive=True)
        stamp(dest, spec["artist"], spec["url"])
        print(f"wrote {dest} ({dest.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
