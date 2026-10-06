import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { FLOOR_USD, formatUsd } from "@/lib/campaign";
import { HERO_STILL_WIDE } from "@/lib/hero-still";
import { PUBLIC_COPY } from "@/lib/public-copy";

export const alt = `${PUBLIC_COPY.header.wordmark}. ${PUBLIC_COPY.hero.imageAlt} Floor ${formatUsd(FLOOR_USD)}.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

/** BMB-OG-PHOTO-1 — `/` link preview is the hero still, photo only. */
export default async function OpenGraphImage() {
  const still = await readFile(
    join(process.cwd(), "public", HERO_STILL_WIDE.src.slice(1)),
    "base64",
  );
  const stillSrc = `data:image/jpeg;base64,${still}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
        }}
      >
        <img
          src={stillSrc}
          width={size.width}
          height={size.height}
          alt=""
          style={{
            width: size.width,
            height: size.height,
            objectFit: "cover",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
