#!/usr/bin/env python3
"""Resize the locked Pexels ORIGINAL four bases to the 1280×720 site plate.

No GrabCut. No studio composite. No baked number dots. Credits are stamped
after write by credit-board-stills.py.

Sources (first hit wins):

  scripts/pexels-original/{driver,passenger,front,rear}-*.jpg
  $BMB_PEXELS_ORIGINAL
  /home/ubuntu/.cursor/projects/workspace/uploads/

Locked 2026-09-21:

  driver    Joe L / 27908531
  passenger Mylo Kaye / 24734498
  front     Mylo Kaye / 24734499
  rear      Stephen Leonardi / 29278630
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
UNMARKED = ROOT / "scripts" / ".board-stills-unmarked"
LOCAL = ROOT / "scripts" / "pexels-original"
UPLOADS = Path("/home/ubuntu/.cursor/projects/workspace/uploads")
WIDE = (1280, 720)

# 16:9 crops in source pixels (left, top, right, bottom).
SOURCES = {
    "driver": {
        "names": (
            "driver-joe-27908531.jpg",
            "driver-joe-27908531_33d0.jpg",
            "27908531.jpg",
        ),
        "crop": (980, 1380, 4300, 3248),
    },
    "passenger": {
        "names": (
            "passenger-mylo-24734498.jpg",
            "passenger-mylo-24734498_3d17.jpg",
            "24734498.jpg",
        ),
        "crop": (40, 620, 5080, 3456),
    },
    "front": {
        "names": (
            "front-mylo-24734499.jpg",
            "front-mylo-24734499_d260.jpg",
            "24734499.jpg",
        ),
        "crop": (0, 200, 5120, 3083),
    },
    "rear": {
        "names": (
            "rear-leonardi-29278630.jpg",
            "rear-leonardi-29278630_5c3f.jpg",
            "29278630.jpg",
        ),
        "crop": (560, 480, 4760, 2843),
    },
}


def source_dirs() -> list[Path]:
    dirs = [LOCAL]
    extra = os.environ.get("BMB_PEXELS_ORIGINAL")
    if extra:
        dirs.append(Path(extra))
    dirs.append(UPLOADS)
    return dirs


def find_source(names: tuple[str, ...]) -> Path:
    for folder in source_dirs():
        for name in names:
            path = folder / name
            if path.is_file():
                return path
    raise FileNotFoundError(
        f"missing locked Pexels original {names[0]}. "
        f"Put it in {LOCAL} or set BMB_PEXELS_ORIGINAL"
    )


def save_jpeg(im: Image.Image, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=90, optimize=True, progressive=True)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    UNMARKED.mkdir(parents=True, exist_ok=True)
    for key, spec in SOURCES.items():
        src = find_source(spec["names"])
        with Image.open(src) as raw:
            still = raw.convert("RGB").crop(spec["crop"]).resize(
                WIDE, Image.Resampling.LANCZOS
            )
        unmarked = UNMARKED / f"truck-view-{key}.jpg"
        public = PUBLIC / f"truck-view-{key}.jpg"
        save_jpeg(still, unmarked)
        save_jpeg(still, public)
        print(f"wrote {unmarked.name} and {public.name} from {src.name}")


if __name__ == "__main__":
    main()
