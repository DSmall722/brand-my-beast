import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { HERO_STILL_WIDE } from "@/lib/hero-still";
import { PUBLIC_COPY } from "@/lib/public-copy";

export const alt = `${PUBLIC_COPY.header.wordmark} — ${PUBLIC_COPY.hero.imageAlt} Floor ${formatUsd(FLOOR_USD)}, buyout ${formatUsd(GOAL_USD)}.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

/**
 * Slice 16.32 — `/` OG image is the wordmark plus the homepage hero still.
 */
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
          flexDirection: "column",
          background: "#0c0e11",
          color: "#f4f7fb",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "32px 40px 36px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
            }}
          >
            {PUBLIC_COPY.header.wordmark}
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              fontSize: 22,
              color: "#d6ff3f",
            }}
          >
            <span>Floor {formatUsd(FLOOR_USD)}</span>
            <span>Buyout {formatUsd(GOAL_USD)}</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 10,
            fontSize: 22,
            color: "#b7c0cc",
          }}
        >
          {PUBLIC_COPY.hero.imageAlt}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            flex: 1,
          }}
        >
          <img
            src={stillSrc}
            width={1120}
            height={420}
            alt=""
            style={{
              width: 1120,
              height: 420,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
