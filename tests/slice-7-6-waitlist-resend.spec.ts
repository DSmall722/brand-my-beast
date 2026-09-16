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
  joinWaitlist,
  resetWaitlistStoreForTests,
  setWaitlistMailerForTests,
  type WaitlistNotifyPayload,
} from "../src/lib/waitlist";

/**
 * Slice 7.6 — waitlist Resend path notifies hello@ on insert.
 * Tests mock Resend. Do not send live mail. Write failure never claims join.
 */
test.describe("slice 7.6: waitlist Resend notifies hello@", () => {
  test.beforeEach(() => {
    resetWaitlistStoreForTests();
  });

  test.afterEach(() => {
    resetWaitlistStoreForTests();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    delete process.env.WAITLIST_NOTIFY_TO;
  });

  test("campaign money fences stay locked", () => {
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

  test("created signup sends confirm mail to the subscriber", async () => {
    const sent: WaitlistNotifyPayload[] = [];
    setWaitlistMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice76";

    const email = `slice76-notify-${Date.now()}@example.com`;
    const result = await joinWaitlist(email);
    expect(result).toEqual({ ok: true, status: "created" });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe(email);
    expect(sent[0]!.from).toContain(BRAND.email);
    expect(sent[0]!.subject.toLowerCase()).toMatch(/confirm/);
    expect(sent[0]!.text).toContain("/waitlist/confirm?token=");
    expect(sent[0]!.text).toContain(email);
  });

  test("exists path does not re-notify", async () => {
    const sent: WaitlistNotifyPayload[] = [];
    setWaitlistMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice76";

    const email = `slice76-exists-${Date.now()}@example.com`;
    expect(await joinWaitlist(email)).toEqual({
      ok: true,
      status: "created",
    });
    expect(sent).toHaveLength(1);

    expect(await joinWaitlist(email)).toEqual({
      ok: true,
      status: "exists",
    });
    expect(sent).toHaveLength(1);
  });

  test("notify failure still returns ok created", async () => {
    setWaitlistMailerForTests({
      send: async () => {
        throw new Error("resend down");
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice76";

    const email = `slice76-mail-fail-${Date.now()}@example.com`;
    const result = await joinWaitlist(email);
    expect(result).toEqual({ ok: true, status: "created" });
  });

  test("write failure never claims the visitor joined", async () => {
    const prevMode = process.env.WAITLIST_MODE;
    const prevDb = process.env.DATABASE_URL;
    const sent: WaitlistNotifyPayload[] = [];
    setWaitlistMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice76";
    process.env.WAITLIST_MODE = "postgres";
    delete process.env.DATABASE_URL;

    try {
      const result = await joinWaitlist("slice76-write-fail@example.com");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("unavailable");
      expect(result.error.toLowerCase()).toContain("not on the list");
      expect(result.error.toLowerCase()).not.toMatch(/\bjoined\b/);
      expect(sent).toHaveLength(0);
    } finally {
      if (prevMode === undefined) delete process.env.WAITLIST_MODE;
      else process.env.WAITLIST_MODE = prevMode;
      if (prevDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDb;
    }
  });

  test("source uses top-level Resend and defaults notify to hello@", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/waitlist.ts"),
      "utf8",
    );
    expect(src).toMatch(/import\s+\{\s*Resend\s*\}\s+from\s+["']resend["']/);
    expect(src).not.toMatch(/await\s+import\s*\(\s*["']resend["']\s*\)/);
    expect(src).toContain("WAITLIST_NOTIFY_TO ?? BRAND.email");
    expect(src).toContain("setWaitlistMailerForTests");
  });

  test("homepage has no lease and no personal handle", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
  });
});
