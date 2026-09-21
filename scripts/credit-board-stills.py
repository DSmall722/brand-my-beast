#!/usr/bin/env python3
"""Stamp photographer + Pexels URL onto the public board JPEGs.

Must run after paint-board-marks.py so EXIF/IPTC/XMP survive the bake.
Uses the Image-ExifTool binary (PATH or /tmp/Image-ExifTool/exiftool).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

CREDITS = {
    "driver": {
        "artist": "Joe L",
        "url": "https://www.pexels.com/photo/a-car-is-parked-in-a-garage-with-a-large-concrete-floor-27908531/",
    },
    "passenger": {
        "artist": "Mylo Kaye",
        "url": "https://www.pexels.com/photo/silver-tesla-cybertruck-24734498/",
    },
    "front": {
        "artist": "Mylo Kaye",
        "url": "https://www.pexels.com/photo/tesla-cyber-truck-24734499/",
    },
    "rear": {
        "artist": "James Collington",
        "url": "https://www.pexels.com/photo/futuristic-vehicle-parked-on-california-boardwalk-30073773/",
    },
}


def find_exiftool() -> str:
    found = shutil.which("exiftool")
    if found:
        return found
    local = Path("/tmp/Image-ExifTool/exiftool")
    if local.is_file():
        return str(local)
    raise FileNotFoundError("exiftool not on PATH or /tmp/Image-ExifTool/exiftool")


def notice(artist: str, url: str) -> str:
    return f"Photo by {artist} on Pexels — {url}"


def stamp(exiftool: str, dest: Path, artist: str, url: str) -> None:
    text = notice(artist, url)
    cmd = [
        exiftool,
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
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)
    print(f"credited {dest.name} → {artist}")


def main() -> None:
    tool = find_exiftool()
    for view, meta in CREDITS.items():
        dest = PUBLIC / f"truck-view-{view}.jpg"
        if not dest.is_file():
            raise FileNotFoundError(dest)
        stamp(tool, dest, meta["artist"], meta["url"])


if __name__ == "__main__":
    main()
