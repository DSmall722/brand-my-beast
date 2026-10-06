import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { BRAND, CLOSE_AT, OPEN_AT, PANELS } from "../src/lib/campaign";
import { formatCampaignInstantEt } from "../src/lib/seat-log";
import { buildHomeJsonLd } from "../src/lib/home-json-ld";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * BMB-QA-PRENOON — pre-noon copy and metadata.
 * No new money, clock, or payment behavior.
 */

const META_DESCRIPTION = `${PANELS.length} ad panels on one Cybertruck, wrapped for a year and driven across the Southeast. Bidding is open through Nov 2 at noon ET.`;

const CLOSED_NOTE = `Bidding opens ${formatCampaignInstantEt(OPEN_AT)}. No deposit is taken on this form. Questions? Use the Contact us form or email ${BRAND.email}.`;

const PAGES = ["/", "/404-probe", "/signin", "/privacy", "/terms", "/panels/hood"] as const;

function pathOf(href: string): string | null {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return null;
  }
  if (/^https?:\/\//i.test(href)) return null;
  const path = href.split("#")[0]?.split("?")[0] ?? "";
  if (!path) return null;
  return path.startsWith("/") ? path : `/${path}`;
}

async function internalPaths(page: Page): Promise<string[]> {
  const hrefs = await page.locator("a[href]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("href") ?? ""),
  );
  return [...new Set(hrefs.map(pathOf).filter((path): path is string => Boolean(path)))];
}

test.describe("BMB-QA-PRENOON copy and metadata", () => {
  test("closed bid modal names the open time and drops Join the list", async ({
    page,
  }) => {
    expect(CLOSE_AT).toBe("2026-11-02T17:00:00.000Z");
    expect(PUBLIC_COPY.bidDesk.closedLead).toBe(CLOSED_NOTE);
    expect(PUBLIC_COPY.bidDesk.closedLead).toContain("12:00 PM ET");
    expect(PUBLIC_COPY.bidDesk.closedLead).not.toContain("Join the list");
    expect(PUBLIC_COPY.bidDesk.closedResult).toContain("12:00 PM ET");
    expect(PUBLIC_COPY.bidDesk.closedResult).not.toContain("Join the list");
    expect(PUBLIC_COPY.bidDesk.closedResult).toContain(BRAND.email);
    expect(PUBLIC_COPY.bidDesk.joinList).toBe("Contact us");
    expect(PUBLIC_COPY.bidDesk.closedLead).not.toMatch(/[—–]/);
    expect(PUBLIC_COPY.bidDesk.closedResult).not.toMatch(/[—–]/);

    await page.goto("/");
    await page.getByTestId("panel-link-hood").click();
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toContainText("12:00 PM ET");
    await expect(modal).not.toContainText("Join the list");
    await expect(page.getByTestId("bid-modal-join")).toHaveText("Contact us");
    await expect(page.getByTestId("bid-modal-join")).toHaveAttribute(
      "href",
      "/#contactus",
    );
  });

  test("list CTAs are Contact us and those pages do not say Join the list", async ({
    page,
  }) => {
    expect(PUBLIC_COPY.hero.primaryCta).toBe("Contact us");
    expect(PUBLIC_COPY.signIn.notOpenYet).toBe(
      "Sign-in is not open yet. Contact us. Nothing is charged.",
    );
    expect(PUBLIC_COPY.signIn.notOpenYet).not.toContain("Join the list");

    for (const path of ["/", "/signin", "/404-probe"] as const) {
      await page.goto(path);
      const html = await page.content();
      expect(html, path).not.toContain("Get on the list");
      expect(html, path).not.toContain("Join the list");
    }

    await page.goto("/404-probe");
    await expect(page.getByTestId("not-found-waitlist")).toHaveText("Contact us");
    await expect(page.getByTestId("not-found-waitlist")).toHaveAttribute(
      "href",
      "/#contactus",
    );
  });

  test("internal hrefs on public pages are not 404", async ({ page, request }) => {
    const paths = new Set<string>();
    for (const path of PAGES) {
      await page.goto(path);
      for (const href of await internalPaths(page)) paths.add(href);
    }
    expect(paths.size).toBeGreaterThan(0);
    const missed: string[] = [];
    for (const path of paths) {
      const res = await request.get(path);
      if (res.status() === 404) missed.push(`${path} -> 404`);
    }
    expect(missed).toEqual([]);
  });

  test("JSON-LD eligibleQuantity is the panel count", () => {
    const offer = buildHomeJsonLd()["@graph"][1];
    expect(PANELS).toHaveLength(11);
    expect(offer.eligibleQuantity.value).toBe(PANELS.length);
    expect(offer.eligibleQuantity.value).toBe(11);
  });

  test("robots.txt has no stale hold comment and keeps crawl rules", async ({
    request,
  }) => {
    const src = readFileSync(join(process.cwd(), "src/app/robots.ts"), "utf8");
    expect(src).not.toContain("stale");
    expect(src).not.toContain("ROBOTS_HOLD_COMMENT");
    const body = await (await request.get("/robots.txt")).text();
    expect(body.toLowerCase()).not.toContain("stale");
    expect(body).not.toContain("Vercel hold");
    expect(body).toMatch(/Allow:\s*\/\b/);
    expect(body).toMatch(/Allow:\s*\/panels\//);
    expect(body).toMatch(/Disallow:\s*\/account/);
    expect(body).toMatch(/Disallow:\s*\/signin/);
    expect(body).toMatch(/Disallow:\s*\/operator/);
    expect(body).toContain("https://www.brandmybeast.com/sitemap.xml");
  });

  test("meta and og descriptions match the new copy with no em dash", async ({
    page,
  }) => {
    expect(PUBLIC_COPY.meta.description).toBe(META_DESCRIPTION);
    expect(PUBLIC_COPY.meta.description).not.toMatch(/[—–]/);
    expect(PUBLIC_COPY.meta.description).not.toContain("opens Oct");
    expect(PUBLIC_COPY.meta.description).not.toContain("Join the list");
    expect(PUBLIC_COPY.meta.title).toBe(
      "BrandMyBeast — Advertise your brand on the truck that people already photograph",
    );
    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(META_DESCRIPTION);

    await page.goto("/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      META_DESCRIPTION,
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      META_DESCRIPTION,
    );
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
      "content",
      META_DESCRIPTION,
    );
    const html = await page.content();
    expect(html).not.toContain("opens Oct");
    const windowText = await page.getByTestId("campaign-window").innerText();
    if (!windowText.startsWith("Bidding opens")) {
      expect(html).not.toContain("Bidding opens");
    }
  });

  test("404, privacy, and terms have their own titles; 404 body is plain", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(PUBLIC_COPY.meta.title);

    await page.goto("/404-probe");
    await expect(page).toHaveTitle(`Page not found | ${BRAND.name}`);
    await expect(page.getByTestId("not-found-title")).toHaveText(
      "This page doesn't exist.",
    );

    await page.goto("/privacy");
    await expect(page).toHaveTitle(`Privacy | ${BRAND.name}`);

    await page.goto("/terms");
    await expect(page).toHaveTitle(`Terms | ${BRAND.name}`);
  });

  test("empty homepage shows todayEmpty once", async ({ page, request }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    await page.goto("/");
    await expect(
      page.getByText(PUBLIC_COPY.bidDesk.todayEmpty, { exact: true }),
    ).toHaveCount(1);
  });
});
