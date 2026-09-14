import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  assertNoteRequiredForReject,
} from "../src/lib/artwork-approval";
import {
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  getApprovalNote,
  resetApprovalNoteStoreForTests,
  saveApprovalNote,
} from "../src/lib/approval-note-store";
import {
  listDecidedBids,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

async function signIn(page: Page, email: string) {
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

/**
 * Slice 6.3 — merge-gate Playwright contract for operator approve /
 * reject-with-note. Broader coverage lives under slice 2.2; this file is the
 * Wave 6 named proof. UI describe uses API reset; store describe uses
 * in-process reset only (CI workers=1 — see playwright.config.ts).
 */
test.describe("slice 6.3 store: operator approve / reject-with-note", () => {
  test.beforeEach(async () => {
    await resetIntentStoreForTests();
    await resetApprovalNoteStoreForTests();
  });

  test("money fences and reject-note gate stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
    expect(
      assertNoteRequiredForReject({ decision: "approved", note: "" }).ok,
    ).toBe(true);
    expect(
      assertNoteRequiredForReject({ decision: "rejected", note: "" }).ok,
    ).toBe(false);
    expect(
      assertNoteRequiredForReject({ decision: "rejected", note: "no" }).ok,
    ).toBe(false);
    expect(
      assertNoteRequiredForReject({
        decision: "rejected",
        note: "Cannot pass a grocery lot",
      }).ok,
    ).toBe(true);
  });

  test("approve lists the intent; reject with note is decided", async () => {
    const approve = await placeIntentBid({
      panelId: "hood",
      userId: "slice63_approve",
      brandLabel: "Slice Sixty Three Approve",
      tradeLabel: "Trail Fasteners",
      standingUsd: 2500,
    });
    expect(approve.ok).toBeTruthy();
    if (!approve.ok) return;
    const approved = await setIntentStatus(approve.bid.id, "approved");
    expect(approved.ok).toBeTruthy();
    if (!approved.ok) return;
    expect(approved.bid.status).toBe("approved");
    expect((await listDecidedBids()).map((b) => b.id)).toContain(
      approve.bid.id,
    );

    const reject = await placeIntentBid({
      panelId: "tonneau",
      userId: "slice63_reject",
      brandLabel: "Slice Sixty Three Reject",
      tradeLabel: "Trail Tools",
      standingUsd: 800,
    });
    expect(reject.ok).toBeTruthy();
    if (!reject.ok) return;
    const noteGate = assertNoteRequiredForReject({
      decision: "rejected",
      note: "Cannot pass a grocery lot",
    });
    expect(noteGate.ok).toBe(true);
    const rejected = await setIntentStatus(reject.bid.id, "rejected");
    expect(rejected.ok).toBeTruthy();
    if (!rejected.ok) return;
    expect(rejected.bid.status).toBe("rejected");
    await saveApprovalNote({
      bidId: reject.bid.id,
      decision: "rejected",
      note: "Cannot pass a grocery lot",
    });
    const note = await getApprovalNote(reject.bid.id);
    expect(note?.decision).toBe("rejected");
    expect(note?.note).toMatch(/grocery/i);
    expect((await listDecidedBids()).map((b) => b.id)).toContain(reject.bid.id);
  });
});

test.describe("slice 6.3 operator UI: approve / reject-with-note", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    await resetServerIntents(request);
  });

  test("operator approve lists the intent; reject without note fails then succeeds with note", async ({
    browser,
    request,
  }) => {
    const approveBidder = await browser.newPage();
    await signIn(approveBidder, "slice63-approve@example.com");
    await approveBidder.goto("/panels/hood");
    await approveBidder
      .getByTestId("intent-brand")
      .fill("Slice Sixty Three Approve Co");
    await approveBidder
      .getByTestId("intent-trade")
      .fill("Circuit Fasteners");
    await approveBidder.getByTestId("intent-submit").click();
    await expect(approveBidder.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await approveBidder.close();

    const operatorApprove = await browser.newPage();
    await signIn(operatorApprove, "operator@example.com");
    await operatorApprove.goto("/operator");
    await expect(operatorApprove.getByTestId("approvals-list")).toContainText(
      "Slice Sixty Three Approve Co",
    );
    const approveHtml = await operatorApprove.content();
    expect(approveHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(approveHtml).not.toContain("CLOSE_AT");
    expect(approveHtml).toContain(formatUsd(FLOOR_USD));
    expect(approveHtml).toContain(formatUsd(GOAL_USD));
    await operatorApprove.locator('[data-testid^="approve-"]').first().click();
    await expect(operatorApprove.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await operatorApprove.close();

    await resetServerIntents(request);

    const rejectBidder = await browser.newPage();
    await signIn(rejectBidder, "slice63-reject@example.com");
    await rejectBidder.goto("/panels/hood");
    await rejectBidder
      .getByTestId("intent-brand")
      .fill("Slice Sixty Three Reject Co");
    await rejectBidder.getByTestId("intent-trade").fill("Circuit Tools");
    await rejectBidder.getByTestId("intent-submit").click();
    await expect(rejectBidder.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await rejectBidder.close();

    const operatorReject = await browser.newPage();
    await signIn(operatorReject, "operator@example.com");
    await operatorReject.goto("/operator");
    await expect(operatorReject.getByTestId("approvals-list")).toContainText(
      "Slice Sixty Three Reject Co",
    );
    await operatorReject.locator('[data-testid^="reject-"]').first().click();
    await expect(
      operatorReject.locator('[data-testid^="approval-error-"]').first(),
    ).toContainText("note");
    await expect(operatorReject.getByTestId("approvals-list")).toContainText(
      "Slice Sixty Three Reject Co",
    );
    await operatorReject
      .locator('[data-testid^="approval-note-"]')
      .first()
      .fill("Cannot pass a grocery lot");
    await operatorReject.locator('[data-testid^="reject-"]').first().click();
    await expect(operatorReject.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await expect(operatorReject.getByTestId("approvals-decided")).toContainText(
      "Slice Sixty Three Reject Co",
    );
    await expect(operatorReject.getByTestId("approvals-decided")).toContainText(
      "Cannot pass a grocery lot",
    );
    const rejectHtml = await operatorReject.content();
    expect(rejectHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(rejectHtml).not.toContain("CLOSE_AT");
    expect(rejectHtml).toContain(formatUsd(FLOOR_USD));
    expect(rejectHtml).toContain("$120,000");
    await operatorReject.close();

    const bidderAgain = await browser.newPage();
    await signIn(bidderAgain, "slice63-reject@example.com");
    await bidderAgain.goto("/account");
    await expect(
      bidderAgain.locator('[data-testid^="account-reject-note-"]').first(),
    ).toContainText("Cannot pass a grocery lot");
    await expect(bidderAgain.getByTestId("intent-only-note")).toContainText(
      "No Stripe capture",
    );
    const accountHtml = await bidderAgain.content();
    expect(accountHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(accountHtml).not.toContain("CLOSE_AT");
    await bidderAgain.close();
  });
});
