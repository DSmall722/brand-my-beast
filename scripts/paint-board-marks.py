#!/usr/bin/env python3
"""Board plates are locked TRACE AID lime flats. Do not overwrite them.

Production `public/truck-view-*.jpg` are Dennard's approved 2048×1360
TRACE AID teaching plates (lime outlines + on-panel labels baked in).
Do not copy unmarked 1280×720 Pexels stills over them.

This script is a guard. It refuses to replace TRACE AID flats.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
VIEWS = ("driver", "passenger", "front", "rear")
TRACE_AID_SIZE = (2048, 1360)


def jpeg_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:2] != b"\xff\xd8":
        raise ValueError(f"{path.name} is not a JPEG")
    i = 2
    while i + 8 < len(data):
        if data[i] != 0xFF:
            raise ValueError(f"{path.name}: JPEG marker missing")
        marker = data[i + 1]
        if marker in (0xD8, 0xD9) or marker == 0x01 or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        length = int.from_bytes(data[i + 2 : i + 4], "big")
        if marker in (0xC0, 0xC1, 0xC2):
            height = int.from_bytes(data[i + 5 : i + 7], "big")
            width = int.from_bytes(data[i + 7 : i + 9], "big")
            return width, height
        i += 2 + length
    raise ValueError(f"{path.name}: no SOF")


def main() -> None:
    for view in VIEWS:
        dest = PUBLIC / f"truck-view-{view}.jpg"
        if not dest.is_file():
            raise FileNotFoundError(dest)
        size = jpeg_size(dest)
        if size != TRACE_AID_SIZE:
            raise SystemExit(
                f"{dest.name} is {size[0]}×{size[1]}, expected TRACE AID "
                f"{TRACE_AID_SIZE[0]}×{TRACE_AID_SIZE[1]}. Do not overwrite "
                "with unmarked Pexels stills."
            )
        print(f"kept TRACE AID {dest.name} {size[0]}×{size[1]} (no unmarked copy)")


if __name__ == "__main__":
    main()
