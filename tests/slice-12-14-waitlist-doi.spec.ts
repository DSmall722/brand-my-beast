import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  confirmWaitlistByToken,
  getWaitlistByEmail,
  joinWaitlist,
  resetWaitlistStoreForTests,
  setWaitlistMailerForTests,
  waitlistConfirmUrl,
  type WaitlistNotifyPayload,
} from "../src/lib/waitlist";

/**
 * Slice 12.14 — waitlist double-opt-in token.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.14: waitlist double-opt-in token", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    process.env.WAITLIST_MODE = "memory";
    resetWaitlistStoreForTests();
  });

  test.afterEach(() => {
    resetWaitlistStoreForTests();
    delete process.env.RESEND_API_KEY;
    delete process.env.WAITLIST_CONFIRM_BASE_URL;
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
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

  test("migration adds confirm_token and confirmed_at", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0018_waitlist_confirm_token.sql"),
      "utf8",
    );
    expect(sql).toMatch(/confirm_token/);
    expect(sql).toMatch(/confirmed_at/);
    expect(sql).toMatch(/UNIQUE INDEX/i);
    expect(sql.toLowerCase()).not.toMatch(/payment_method/);
    expect(sql).not.toMatch(/\bCLOSE_AT\b/);
  });

  test("join stores token; confirm clears it and notifies hello@", async () => {
    const sent: WaitlistNotifyPayload[] = [];
    setWaitlistMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_12_14";
    process.env.WAITLIST_CONFIRM_BASE_URL = "https://brandmybeast.com";

    const email = "doi-12-14@example.com";
    const joined = await joinWaitlist(email);
    expect(joined).toEqual({ ok: true, status: "created" });

    const pending = await getWaitlistByEmail(email);
    expect(pending?.confirmToken).toBeTruthy();
    expect(pending?.confirmedAt).toBeNull();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(email);
    expect(sent[0]?.text).toContain(waitlistConfirmUrl(pending!.confirmToken!));

    const confirmed = await confirmWaitlistByToken(pending!.confirmToken!);
    expect(confirmed).toEqual({
      ok: true,
      email,
      status: "confirmed",
    });

    const after = await getWaitlistByEmail(email);
    expect(after?.confirmToken).toBeNull();
    expect(after?.confirmedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(sent).toHaveLength(2);
    expect(sent[1]?.to).toBe(BRAND.email);
    expect(sent[1]?.subject).toContain(email);
  });

  test("confirm page handles missing and valid in-process token path", async ({
    page,
  }) => {
    await page.goto("/waitlist/confirm");
    await expect(page.getByTestId("waitlist-confirm-page")).toBeVisible();
    await expect(page.getByTestId("waitlist-confirm-error")).toBeVisible();

    await page.goto("/waitlist/confirm?token=not-a-real-token-value");
    await expect(page.getByTestId("waitlist-confirm-error")).toContainText(
      /expired|unknown|invalid/i,
    );
  });
});
