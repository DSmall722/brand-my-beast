import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { saveApprovalNote } from "../src/lib/approval-note-store";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  appendOperatorAuditLog,
  listOperatorAuditLog,
  operatorAuditLogUsesMemory,
  resetOperatorAuditLogForTests,
} from "../src/lib/operator-audit-log";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

async function resetServer(request: APIRequestContext) {
  const res = await request.post("/api/test/reset-intents");
  expect(res.ok()).toBeTruthy();
}

/**
 * Slice 8.9 — audit log rows on approve / reject (who, when, note id).
 */
test.describe("slice 8.9: operator audit log", () => {
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

  test("Production never uses audit log memory", () => {
    expect(operatorAuditLogUsesMemory({ VERCEL_ENV: "production" })).toBe(
      false,
    );
    expect(
      operatorAuditLogUsesMemory({
        VERCEL_ENV: "production",
        INTENT_MODE: "memory",
      }),
    ).toBe(false);
    expect(operatorAuditLogUsesMemory({ INTENT_MODE: "memory" })).toBe(true);
  });

  test("appendOperatorAuditLog stores who when note id", async () => {
    process.env.INTENT_MODE = "memory";
    resetOperatorAuditLogForTests();
    const note = await saveApprovalNote({
      bidId: "bid-audit-1",
      decision: "rejected",
      note: "Needs thicker strokes.",
    });
    const row = await appendOperatorAuditLog({
      bidId: "bid-audit-1",
      decision: "rejected",
      actorEmail: "ops@brandmybeast.com",
      actorUserId: "user-ops",
      noteId: note.id,
    });
    expect(row.actorEmail).toBe("ops@brandmybeast.com");
    expect(row.noteId).toBe(note.id);
    expect(row.decision).toBe("rejected");
    const listed = await listOperatorAuditLog();
    expect(listed[0]?.id).toBe(row.id);

    const migration = readFileSync(
      join(process.cwd(), "drizzle/0008_operator_audit_log.sql"),
      "utf8",
    );
    expect(migration).toContain("operator_audit_log");
    expect(migration.toLowerCase()).not.toContain("stripe");
  });

  test("approve writes audit row visible on /operator/audit", async ({
    page,
    request,
  }) => {
    await resetServer(request);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("AuditCo");
    await page.getByTestId("intent-trade").fill("audit tools");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("operator-audit-link")).toBeVisible();
    await expect(page.getByTestId("approvals-list")).toContainText("AuditCo");
    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("operator-audit-link").click();
    await expect(page.getByTestId("operator-audit")).toBeVisible();
    await expect(page.getByTestId("operator-audit-list")).toContainText(
      "approved",
    );
    await expect(page.getByTestId("operator-audit-list")).toContainText(
      "operator@example.com",
    );
    await expect(page.getByTestId("operator-audit-who").first()).toContainText(
      "operator@example.com",
    );
    await expect(page.getByTestId("operator-audit-when").first()).toBeVisible();

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
  });
});
