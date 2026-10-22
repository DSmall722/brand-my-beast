import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildHomeJsonLd } from "./home-json-ld";
import { buildLlmsTxt } from "./llms-txt";
import { CLAIM_COPY } from "./panel-claim";
import {
  PUBLIC_COPY,
  moneyProgressCopy,
  moneyVaultAria,
} from "./public-copy";
import { truckViewCreditLine } from "./truck-view-credits";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function texts(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) {
    for (const item of value) texts(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      texts(item, out);
    }
  }
  return out;
}

const BANNED = [
  "No standing bids yet",
  "Open seats",
  "OPEN SEATS",
  "3x their final bid",
  "the finish",
  "total bids pass $120,000",
];

describe("bmb-qa-polish-468 public copy", () => {
  const publicText = [
    ...texts(PUBLIC_COPY),
    ...texts(CLAIM_COPY),
    moneyProgressCopy(0),
    moneyVaultAria(true, "$0", "$35,000"),
    moneyVaultAria(false, "$10", "$35,000"),
    buildLlmsTxt(),
    ...texts(buildHomeJsonLd()),
  ].join("\n");

  it("rejects the word floor in public text, not in identifiers", () => {
    expect(publicText).not.toMatch(/\bfloor\b/i);
    expect(moneyProgressCopy(0)).toBe("0% of goal");
    expect(PUBLIC_COPY.board.floorLabel).toBe("Goal");
    expect(PUBLIC_COPY.board.vaultFloorMarkLabel).toBe("Goal");
    expect(PUBLIC_COPY.board.shortfallFloorLabel).toBe("Short of goal");
  });

  it("rejects the old jargon strings", () => {
    const lower = publicText.toLowerCase();
    for (const phrase of BANNED) {
      expect(lower).not.toContain(phrase.toLowerCase());
    }
    expect(PUBLIC_COPY.bidDesk.topEmpty).toBe("No bids yet.");
    expect(PUBLIC_COPY.board.openSeatsLabel).toBe("Open panels");
    const etch = PUBLIC_COPY.questions.items.find(
      (item) => item.q === "Bonus: Immortal Etch",
    );
    expect(etch?.a).toContain("claims plus bids pass $120,000");
    expect(etch?.a).toContain("three times their final bid");
  });

  it("puts one claim-funds line next to claim prices", () => {
    expect(CLAIM_COPY.allClaimFunds).toBe(
      "Claiming all 11 panels funds the full truck purchase.",
    );
    expect(read("src/components/home/HomePanelsSection.tsx")).toContain(
      "CLAIM_COPY.allClaimFunds",
    );
    expect(read("src/components/PanelClaimBlock.tsx")).toContain(
      "CLAIM_COPY.allClaimFunds",
    );
  });

  it("keeps a single truck-ownership FAQ", () => {
    const questions = PUBLIC_COPY.questions.items.map((item) => item.q);
    expect(questions.filter((q) => q === "Does the operator own the truck yet?")).toHaveLength(1);
    expect(questions).not.toContain("Is the truck already bought?");
    expect(texts(CLAIM_COPY).join("\n")).not.toContain("Is the truck already bought?");
    const owned = PUBLIC_COPY.questions.items.find(
      (item) => "id" in item && item.id === "truck-ownership",
    );
    expect(owned?.a).toBe(
      "The operator does not own the truck yet. This auction buys it.",
    );
  });

  it("keeps the photo credit free of an em dash and at least 44px tall", () => {
    const hotspots = read("src/components/TruckViewHotspots.tsx");
    expect(hotspots).not.toMatch(/\u2014|\u2013/);
    const line = truckViewCreditLine({
      artist: "Mylo Kaye",
      url: "https://www.pexels.com/",
    });
    expect(line).toBe("Photo by Mylo Kaye on Pexels");
    expect(`${line}\n${hotspots}`).not.toMatch(/\u2014|\u2013/);
    const css = read("src/app/styles/board.css");
    const block = css.match(/\.truck-view-credit a\s*\{([^}]+)\}/);
    expect(block).toBeTruthy();
    expect(block![1]).toMatch(/min-height:\s*44px/);
    expect(block![1]).toMatch(/inline-flex/);
    expect(block![1]).toMatch(/padding:/);
  });
});
