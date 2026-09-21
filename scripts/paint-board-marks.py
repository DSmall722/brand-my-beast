#!/usr/bin/env python3
"""Hybrid training uses SVG overlays. Do not bake number dots.

Copies unmarked stills to public/. Lime plates stay off the JPEG.

Rerun from repo root after unmarked stills exist:

  python3 scripts/build-pexels-board-stills.py
  python3 scripts/paint-board-marks.py
  python3 scripts/credit-board-stills.py
"""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BASE = ROOT / "scripts" / ".board-stills-unmarked"
VIEWS = ("driver", "passenger", "front", "rear")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for view in VIEWS:
        src = BASE / f"truck-view-{view}.jpg"
        dest = PUBLIC / f"truck-view-{view}.jpg"
        if not src.is_file():
            raise FileNotFoundError(src)
        shutil.copy2(src, dest)
        print(f"copied unmarked {dest.name} (no baked dots)")


if __name__ == "__main__":
    main()
