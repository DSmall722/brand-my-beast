import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  ARTWORK_BLOB_PATH_PREFIX,
  putArtworkBlob,
  resetArtworkBlobStoreForTests,
} from "../src/lib/artwork-blob";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  getShopArtStatus,
  resetShopArtStatusStoreForTests,
  setShopArtStatus,
} from "../src/lib/shop-art-status-store";
import {
  SHOP_READY_ARTWORK_ERROR,
  artworkAllowsShopReady,
  isScreenshotOnlyArtworkUrl,
  isShopReadyArtworkBlobKey,
  isShopReadyVectorUrl,
} from "../src/lib/shop-ready-artwork";

/**
 * Slice 13.22 — shop-ready requires vector URL or Blob key, not screenshot only.
 */
test.describe("slice 13.22: shop-ready vector or blob key", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    await resetShopArtStatusStoreForTests();
    resetArtworkBlobStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("helpers accept vector URL and blob key; reject screenshot raster", () => {
    expect(isShopReadyVectorUrl("https://cdn.example.com/mark.svg")).toBe(true);
    expect(isShopReadyVectorUrl("https://cdn.example.com/mark.AI?v=1")).toBe(
      true,
    );
    expect(isShopReadyVectorUrl("https://cdn.example.com/mark.pdf")).toBe(true);
    expect(isShopReadyVectorUrl("https://cdn.example.com/mark.eps")).toBe(true);
    expect(isShopReadyVectorUrl("https://cdn.example.com/shot.png")).toBe(
      false,
    );

    expect(isScreenshotOnlyArtworkUrl("https://cdn.example.com/shot.png")).toBe(
      true,
    );
    expect(
      isScreenshotOnlyArtworkUrl("https://cdn.example.com/shot.JPEG"),
    ).toBe(true);
    expect(
      isScreenshotOnlyArtworkUrl("https://cdn.example.com/mark.svg"),
    ).toBe(false);

    const blob = `${ARTWORK_BLOB_PATH_PREFIX}abc123`;
    expect(isShopReadyArtworkBlobKey(blob)).toBe(true);
    expect(artworkAllowsShopReady(blob)).toBe(true);
    expect(artworkAllowsShopReady("https://cdn.example.com/mark.svg")).toBe(
      true,
    );
    expect(artworkAllowsShopReady("https://cdn.example.com/shot.png")).toBe(
      false,
    );
    expect(artworkAllowsShopReady(null)).toBe(false);
  });

  test("shop-ready rejects missing art and screenshot-only PNG URL", async () => {
    const bare = await placeIntentBid({
      panelId: "hood",
      userId: "user_1322_bare",
      brandLabel: "BareArt Co",
      tradeLabel: "bare vinyl",
      standingUsd: 2500,
    });
    expect(bare.ok).toBe(true);
    if (!bare.ok) return;
    await setIntentStatus(bare.bid.id, "approved");

    const noArt = await setShopArtStatus({
      bidId: bare.bid.id,
      status: "shop-ready",
      actorEmail: "shop@example.com",
    });
    expect(noArt.ok).toBe(false);
    if (noArt.ok) return;
    expect(noArt.error).toBe(SHOP_READY_ARTWORK_ERROR);
    expect(await getShopArtStatus(bare.bid.id)).toBe("unset");

    // needs-fix still allowed without vector art.
    const fixBare = await setShopArtStatus({
      bidId: bare.bid.id,
      status: "needs-fix",
      actorEmail: "shop@example.com",
    });
    expect(fixBare.ok).toBe(true);

    const png = await placeIntentBid({
      panelId: "tailgate",
      userId: "user_1322_png",
      brandLabel: "PngShot Co",
      tradeLabel: "png shot vinyl",
      standingUsd: 2500,
      artworkUrl: "https://cdn.example.com/screenshot-only.png",
    });
    expect(png.ok).toBe(true);
    if (!png.ok) return;
    await setIntentStatus(png.bid.id, "approved");

    const rejectPng = await setShopArtStatus({
      bidId: png.bid.id,
      status: "shop-ready",
      actorEmail: "shop@example.com",
    });
    expect(rejectPng.ok).toBe(false);
    if (rejectPng.ok) return;
    expect(rejectPng.error).toContain("vector URL");
    expect(rejectPng.error).toContain("blob");
  });

  test("shop-ready accepts vector SVG URL and artwork blob key", async () => {
    const svg = await placeIntentBid({
      panelId: "hood",
      userId: "user_1322_svg",
      brandLabel: "SvgReady Co",
      tradeLabel: "svg ready vinyl",
      standingUsd: 2500,
      artworkUrl: "https://cdn.example.com/shop-ready.svg",
    });
    expect(svg.ok).toBe(true);
    if (!svg.ok) return;
    await setIntentStatus(svg.bid.id, "approved");

    const readySvg = await setShopArtStatus({
      bidId: svg.bid.id,
      status: "shop-ready",
      actorEmail: "shop@example.com",
    });
    expect(readySvg.ok).toBe(true);
    expect(await getShopArtStatus(svg.bid.id)).toBe("shop-ready");

    // Minimal 1x1 PNG as data URL → blob key (slice 8.5 path).
    const tinyPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const blobPut = await putArtworkBlob(tinyPng);
    expect(blobPut.ok).toBe(true);
    if (!blobPut.ok) return;

    const blobBid = await placeIntentBid({
      panelId: "driver-door",
      userId: "user_1322_blob",
      brandLabel: "BlobReady Co",
      tradeLabel: "blob ready vinyl",
      standingUsd: 2500,
      artworkUrl: blobPut.url,
    });
    expect(blobBid.ok).toBe(true);
    if (!blobBid.ok) return;
    await setIntentStatus(blobBid.bid.id, "approved");
    expect(blobBid.bid.artworkUrl?.startsWith(ARTWORK_BLOB_PATH_PREFIX)).toBe(
      true,
    );

    const readyBlob = await setShopArtStatus({
      bidId: blobBid.bid.id,
      status: "shop-ready",
      actorEmail: "shop@example.com",
    });
    expect(readyBlob.ok).toBe(true);
    expect(await getShopArtStatus(blobBid.bid.id)).toBe("shop-ready");
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
