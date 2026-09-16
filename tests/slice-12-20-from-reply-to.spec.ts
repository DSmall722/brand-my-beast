import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { MAGIC_LINK_FROM } from "../src/lib/auth/mode";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  MAIL_FROM,
  MAIL_REPLY_TO,
  addressIsHelloAt,
  assertOutboundMailEnvelope,
  outboundMailEnvelope,
} from "../src/lib/mail-envelope";

/**
 * Slice 12.20 — From + Reply-To both hello@brandmybeast.com.
 * Unit assert. CLOSE_AT null. No Stripe. No personal inbox.
 */
test.describe("slice 12.20: from/reply-to both hello@", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
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

  test("unit: outbound envelope From and Reply-To are hello@", () => {
    expect(MAIL_FROM).toBe("BrandMyBeast <hello@brandmybeast.com>");
    expect(MAIL_REPLY_TO).toBe("hello@brandmybeast.com");
    expect(MAGIC_LINK_FROM).toBe(MAIL_FROM);

    const envelope = outboundMailEnvelope({});
    expect(envelope.from).toBe(MAIL_FROM);
    expect(envelope.replyTo).toBe(MAIL_REPLY_TO);
    assertOutboundMailEnvelope(envelope);

    const withOverride = outboundMailEnvelope({
      RESEND_FROM: "BrandMyBeast <hello@brandmybeast.com>",
    });
    assertOutboundMailEnvelope(withOverride);

    expect(addressIsHelloAt("hello@brandmybeast.com")).toBe(true);
    expect(addressIsHelloAt("BrandMyBeast <hello@brandmybeast.com>")).toBe(
      true,
    );
    expect(addressIsHelloAt("someone@example.com")).toBe(false);

    expect(() =>
      assertOutboundMailEnvelope({
        from: "personal@example.com",
        replyTo: MAIL_REPLY_TO,
      }),
    ).toThrow(/From must be hello@brandmybeast.com/);
    expect(() =>
      assertOutboundMailEnvelope({
        from: MAIL_FROM,
        replyTo: "personal@example.com",
      }),
    ).toThrow(/Reply-To must be hello@brandmybeast.com/);
  });

  test("mailers pass replyTo through to Resend payloads", () => {
    const waitlistSrc = readFileSync(
      join(process.cwd(), "src/lib/waitlist.ts"),
      "utf8",
    );
    expect(waitlistSrc).toContain("outboundMailEnvelope");
    expect(waitlistSrc).toMatch(/replyTo/);

    const intentSrc = readFileSync(
      join(process.cwd(), "src/lib/intent-status-mail.ts"),
      "utf8",
    );
    expect(intentSrc).toContain("outboundMailEnvelope");
    expect(intentSrc).toMatch(/replyTo/);

    const digestSrc = readFileSync(
      join(process.cwd(), "src/lib/operator-digest.ts"),
      "utf8",
    );
    expect(digestSrc).toContain("outboundMailEnvelope");
    expect(digestSrc).toMatch(/replyTo/);

    const deadSrc = readFileSync(
      join(process.cwd(), "src/lib/mail-dead-letter.ts"),
      "utf8",
    );
    expect(deadSrc).toContain("MAIL_REPLY_TO");
    expect(deadSrc).toMatch(/replyTo:\s*MAIL_REPLY_TO/);
  });
});
