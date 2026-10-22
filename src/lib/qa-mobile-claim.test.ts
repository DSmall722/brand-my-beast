import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLAIM_COPY } from "./panel-claim";
import { PUBLIC_COPY } from "./public-copy";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

function fontPx(block: string): number {
  const match = block.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
  if (!match) throw new Error(`no px font-size in ${block}`);
  return Number(match[1]);
}

describe("bmb-qa-mobile-claim-fixes", () => {
  const css = read("src/app/styles/board.css");
  const claim = read("src/components/PanelClaimBlock.tsx");

  it("claim inputs are at least 16px", () => {
    const block = css.match(
      /\.seat-claim \.auth-input,\s*\.claim-input\s*\{([^}]+)\}/,
    );
    expect(block).toBeTruthy();
    expect(fontPx(block![1])).toBeGreaterThanOrEqual(16);
    for (const id of ["claim-brand", "claim-trade", "claim-email"]) {
      expect(claim).toContain(`id="${id}"`);
      expect(claim).toContain("claim-input");
    }
  });

  it("panel stat labels are at least 13px and the wrap line is not indented", () => {
    const dt = css.match(/\.panel-stats dt\s*\{([^}]+)\}/);
    expect(dt).toBeTruthy();
    expect(fontPx(dt![1])).toBeGreaterThanOrEqual(13);
    expect(css).toMatch(/\.public-seat \.seat-finish\s*\{[^}]*margin-left:\s*0;/);
  });

  it("keeps the short hotspot, footer, legal, and checkbox targets at 44px", () => {
    expect(css).toMatch(/\.site-footer a\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.legal-stub-body a\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(
      /\.waitlist-whole-truck input\s*\{[^}]*width:\s*44px;\s*height:\s*44px/,
    );
    const hotspots = read("src/components/TruckViewHotspots.tsx");
    for (const id of ["front-fascia", "tailgate", "rear-bumper"]) {
      const row = hotspots.match(new RegExp(`"${id}": \\{[^}]*h: ([\\d.]+)`));
      expect(row, id).toBeTruthy();
      expect((Number(row![1]) / 100) * 226).toBeGreaterThanOrEqual(44);
    }
  });

  it("resolves /board and every /board link to a real route", () => {
    expect(read("src/app/board/page.tsx")).toContain('redirect("/#money")');
    expect(read("src/app/not-found.tsx")).toContain('href="/"');
    const hrefs = walk("src")
      .flatMap((file) => [...read(file).matchAll(/href=(?:\{[`'"]|["'])(\/board[^"'`]*)/g)])
      .map((match) => match[1]);
    for (const href of hrefs) {
      const path = href.split("#")[0];
      expect(path === "/board" || path.startsWith("/board/")).toBe(true);
      expect(read("src/app/board/page.tsx").length).toBeGreaterThan(0);
    }
  });

  it("states the claim lock and the $120,000 buyout rule without the old contradiction", () => {
    expect(CLAIM_COPY.availableLock).toBe(
      "The claim price locks your panel at a guaranteed price, so you can't be outbid.",
    );
    expect(CLAIM_COPY.tradeHint).toBe("Your business type (e.g. plumbing)");
    expect(CLAIM_COPY.availableFoot.startsWith(
      "We review every brand before the wrap is printed.",
    )).toBe(true);
    expect(CLAIM_COPY.faqOutbid.a).toContain(
      "A whole-truck buyout before the $120,000 mark releases your claim",
    );
    expect(CLAIM_COPY.faqTrigger.a).toContain(
      "the purchase goes ahead and panels stay theirs",
    );
    expect(CLAIM_COPY.faqTrigger.a).not.toContain("the same as a whole-truck buyout");
    const copy = JSON.stringify(CLAIM_COPY);
    expect(copy).not.toMatch(/\u2014|\u2013/);
    expect(copy.toLowerCase()).not.toMatch(/\blease\b/);
    expect(copy.toLowerCase()).not.toMatch(/\bfinancing\b/);
  });

  it("says the operator does not own the truck in one FAQ entry", () => {
    const line = "The operator does not own the truck yet. This auction buys it.";
    const blob = JSON.stringify(PUBLIC_COPY);
    expect(blob.split(line).length - 1).toBe(1);
    expect(PUBLIC_COPY.howItWorks.lead).toBe("");
    const owned = PUBLIC_COPY.questions.items.find(
      (item) => "id" in item && item.id === "truck-ownership",
    );
    expect(owned?.a).toBe(line);
  });

  it("uses Opening price, claim prices, Send, and plain FAQ wording", () => {
    expect(PUBLIC_COPY.bidDesk.openingPrice).toBe("Opening price");
    expect(PUBLIC_COPY.bidDesk.openingFloor).toBe("Opening price");
    expect(PUBLIC_COPY.waitlist.button).toBe("Send");
    const cards = read("src/components/home/HomePanelsSection.tsx");
    expect(cards).toContain("Claim price");
    expect(cards).toContain("panel.claimPriceUsd");
    const answers = PUBLIC_COPY.questions.items.map((item) => item.a).join("\n");
    expect(answers).toContain("A name and logo are enough to bid.");
    expect(answers).toContain(
      "Check the box on the contact form and we'll reach out about the whole truck.",
    );
    expect(answers).toContain("you can only bid on that panel.");
    expect(answers).not.toMatch(/twelve months|Twenty percent|a year of miles|enough to stand|the board closes/);
    expect(answers).not.toMatch(/\u2014|\u2013/);
  });
});
