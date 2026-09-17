import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { seatsOpenEmailTemplate } from "../src/emails";
import { CAN_SPAM_UNSUBSCRIBE_URL } from "../src/emails/can-spam";

/**
 * Slice 14.19 — “Seats open” email template exists. Do not send it from the
 * agent. CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const ROOT = process.cwd();
const EMAILS = join(ROOT, "src/emails");
const TOGGLE_ACTION = join(ROOT, "src/app/actions/seats-open.ts");
const TOGGLE_UI = join(ROOT, "src/components/OperatorSeatsOpenToggle.tsx");

test.describe("slice 14.19: seats-open email template (no agent send)", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(ROOT, "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("seats-open template file exists and is exported", () => {
    const files = readdirSync(EMAILS);
    expect(files).toContain("seats-open.ts");
    const index = readFileSync(join(EMAILS, "index.ts"), "utf8");
    expect(index).toContain("seatsOpenEmailTemplate");
    expect(index).toContain('from "./seats-open"');
  });

  test("seatsOpenEmailTemplate copy is seats-open, not a close date", () => {
    const mail = seatsOpenEmailTemplate();
    expect(mail.subject.toLowerCase()).toContain("seats are open");
    expect(mail.subject).toContain(BRAND.name);
    expect(mail.text).toContain("Seats are open");
    expect(mail.text).toContain(formatUsd(FLOOR_USD));
    expect(mail.text).toContain(formatUsd(GOAL_USD));
    expect(mail.text).toContain("No close date");
    expect(mail.text).toContain(CAN_SPAM_UNSUBSCRIBE_URL);
    expect(mail.text.toLowerCase()).not.toMatch(/\blease\b/);
    expect(mail.text).not.toMatch(/@gmail\.com/);
    expect(mail.text).not.toMatch(/CLOSE_AT\s*=/);
  });

  test("operator seats toggle and action do not send the seats-open mail", () => {
    const action = readFileSync(TOGGLE_ACTION, "utf8");
    const ui = readFileSync(TOGGLE_UI, "utf8");
    expect(action).not.toContain("seatsOpenEmailTemplate");
    expect(action).not.toContain("Resend");
    expect(action).not.toMatch(/\.emails\.send/);
    expect(ui).not.toContain("seatsOpenEmailTemplate");
    expect(ui).not.toContain("Resend");
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
