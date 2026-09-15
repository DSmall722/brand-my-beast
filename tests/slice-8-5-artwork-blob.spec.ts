import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  ARTWORK_BLOB_PATH_PREFIX,
  assertLedgerArtworkUrl,
  artworkBlobUsesMemory,
  getArtworkBlob,
  isArtworkBlobPath,
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
import { parseIntentArtwork } from "../src/lib/intent-artwork";
import {
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

async function resetServerIntents(request: APIRequestContext) {
  const res = await request.post("/api/test/reset-intents");
  expect(res.ok()).toBeTruthy();
}

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * Slice 8.5 — artwork in blob storage (or equivalent), not a data-URL column.
 */
test.describe("slice 8.5: artwork blob storage", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
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

  test("Production never uses artwork blob memory", () => {
    expect(artworkBlobUsesMemory({ VERCEL_ENV: "production" })).toBe(false);
    expect(
      artworkBlobUsesMemory({
        VERCEL_ENV: "production",
        INTENT_MODE: "memory",
      }),
    ).toBe(false);
    expect(artworkBlobUsesMemory({ INTENT_MODE: "memory" })).toBe(true);
  });

  test("assertLedgerArtworkUrl rejects data: URLs", () => {
    expect(() => assertLedgerArtworkUrl(TINY_PNG)).toThrow(/data:/);
    expect(() =>
      assertLedgerArtworkUrl("https://cdn.example.com/mark.png"),
    ).not.toThrow();
    expect(() =>
      assertLedgerArtworkUrl(`${ARTWORK_BLOB_PATH_PREFIX}abc123`),
    ).not.toThrow();
  });

  test("putArtworkBlob stores bytes; ledger path is not a data URL", async () => {
    resetArtworkBlobStoreForTests();
    const put = await putArtworkBlob(TINY_PNG);
    expect(put.ok).toBe(true);
    if (!put.ok) return;
    expect(isArtworkBlobPath(put.url)).toBe(true);
    expect(put.url.startsWith("data:")).toBe(false);
    const record = await getArtworkBlob(put.id);
    expect(record?.contentType).toBe("image/png");
    expect(record?.bodyBase64.length).toBeGreaterThan(0);
  });

  test("placeIntentBid converts data: upload to blob path", async () => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    const parsed = parseIntentArtwork({ artworkUpload: TINY_PNG });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await placeIntentBid({
      panelId: "hood",
      userId: "test:blob85@example.com",
      brandLabel: "Blob85",
      tradeLabel: "blob marks",
      standingUsd: 2_500,
      artworkUrl: parsed.artworkUrl,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bid.artworkUrl).not.toBeNull();
    expect(result.bid.artworkUrl!.startsWith("data:")).toBe(false);
    expect(isArtworkBlobPath(result.bid.artworkUrl!)).toBe(true);

    const migration = readFileSync(
      join(process.cwd(), "drizzle/0006_artwork_blobs.sql"),
      "utf8",
    );
    expect(migration).toContain("artwork_blobs");
    expect(migration.toLowerCase()).not.toContain("stripe");
  });

  test("UI upload lands as blob path and serves bytes", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);
    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");

    await page.getByTestId("intent-brand").fill("BlobUiCo");
    await page.getByTestId("intent-trade").fill("blob ui");
    await page.getByTestId("intent-standing").fill("2500");

    mkdirSync(join(process.cwd(), "tmp"), { recursive: true });
    const outPath = join(process.cwd(), "tmp/slice-8-5-tiny.png");
    writeFileSync(
      outPath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    );
    await page.getByTestId("intent-artwork-file").setInputFiles(outPath);
    await expect(page.getByTestId("intent-artwork-filename")).toBeVisible({
      timeout: 5_000,
    });

    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/panels/hood");
    const thumb = page.getByTestId(/^intent-artwork-thumb-/).first();
    await expect(thumb).toBeVisible();
    const src = await thumb.getAttribute("src");
    expect(src).toBeTruthy();
    expect(src!.startsWith("data:")).toBe(false);
    expect(src!.startsWith(ARTWORK_BLOB_PATH_PREFIX)).toBe(true);

    const imgRes = await request.get(src!);
    expect(imgRes.status()).toBe(200);
    expect(imgRes.headers()["content-type"]).toMatch(/image\/png/);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
  });
});
