import { expect, test } from "@playwright/test";
import { FLOOR_USD, OPEN_AT, formatUsd } from "../src/lib/campaign";
import { WINNER_PAY_MS } from "../src/lib/campaign-window";
import { PUBLIC_COPY, leaderboardEmptyCopy } from "../src/lib/public-copy";

const OPEN_EMPTY = "No bids yet. Be the first to put your brand on the Beast.";
const BIDS_TEXT =
  "When you bid, we collect your email, brand name, trade (your type of business), website if you add one, the logo you upload, and your bid amounts. Stripe collects your payment details.";
const REFUND_TEXT = `If you are outbid, your deposit is refunded after bidding closes. If total standing bids are below ${formatUsd(FLOOR_USD)} when bidding closes, every deposit is refunded and no seats are sold. A new bid on the same seat counts deposits you already paid.`;
const HOLD_TEXT = `If you are the next-highest bidder on a seat, your deposit is held until the winner pays or the ${WINNER_PAY_MS / (24 * 60 * 60 * 1000)}-day payment window ends. If the winner does not pay, the seat passes to you; otherwise your deposit is refunded.`;
const BANNED = [/waitlist/i, /sign in/i, /sign-in/i, /account/i];

test.describe("BMB-QA-2-FIX3 legal copy, leaderboard button, contact error, FAQ dashes", () => {
  test("open leaderboard empty state is the exact line plus a signal button", async ({
    page,
    request,
  }) => {
    const openAt = Date.parse(OPEN_AT);
    expect(leaderboardEmptyCopy(openAt)).toBe(OPEN_EMPTY);
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    await page.goto("/leaderboard");
    const empty = page.getByTestId("leaderboard-empty");
    await expect(empty).toHaveText(leaderboardEmptyCopy());
    if (Date.now() >= openAt) {
      await expect(empty).toHaveText(OPEN_EMPTY);
    }
    await expect(empty.locator("a, button")).toHaveCount(0);
    const link = page.getByTestId("leaderboard-panels-link");
    await expect(link).toHaveText("See the panels");
    await expect(link).toHaveAttribute("href", "/#panels");
    await expect(link).toHaveClass(/\bbtn\b/);
    await expect(link).toHaveClass(/\bbtn-signal\b/);
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("privacy Bids text is exact and legal pages drop waitlist and account wording", async ({
    page,
  }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-bids")).toHaveText(BIDS_TEXT);
    await expect(page.getByTestId("privacy-payments")).toContainText(
      "full card numbers",
    );
    await expect(
      page.getByRole("link", { name: "Stripe's privacy policy" }),
    ).toHaveAttribute("href", "https://stripe.com/privacy");

    for (const path of ["/privacy", "/terms"]) {
      await page.goto(path);
      const text = await page.locator("main").innerText();
      for (const pattern of BANNED) {
        expect(text, `${path} ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  test("terms state the refund, the hold, and a linked privacy line", async ({
    page,
  }) => {
    expect(HOLD_TEXT).toContain("7-day");
    await page.goto("/terms");
    const bids = page.getByTestId("terms-bids");
    await expect(bids).toContainText(REFUND_TEXT);
    await expect(bids).toContainText(HOLD_TEXT);
    await expect(page.getByTestId("terms-eligibility")).toContainText(
      "bids placed with your email address",
    );
    const privacy = page.getByTestId("terms-privacy");
    await expect(privacy).toHaveText("Read our Privacy policy.");
    await expect(privacy.getByRole("link", { name: "Privacy policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  test("legal body links use the lime token and an underline", async ({
    page,
  }) => {
    for (const path of ["/privacy", "/terms"]) {
      await page.goto(path);
      const signal = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "var(--signal)";
        document.body.appendChild(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      const links = page.locator(".legal-stub-body a");
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i += 1) {
        const style = await links.nth(i).evaluate((el) => {
          const computed = getComputedStyle(el);
          return {
            color: computed.color,
            decoration: computed.textDecorationLine,
          };
        });
        expect(style.color, path).toBe(signal);
        expect(style.decoration, path).toContain("underline");
      }
    }
  });

  test("contact field error clears as soon as the email changes", async ({
    page,
  }) => {
    await page.route("**/api/waitlist", (route) => route.abort());
    await page.goto("/#contactus");
    const email = page.getByTestId("waitlist-email");
    await email.fill("qa-fix3@example.com");
    await page.getByTestId("waitlist-submit").click();
    const error = page.getByTestId("waitlist-email-error");
    await expect(error).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await email.fill("qa-fix3-edited@example.com");
    await expect(page.getByTestId("waitlist-email-error")).toHaveCount(0);
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
  });

  test("FAQ answers have no em dash or en dash", () => {
    for (const item of PUBLIC_COPY.questions.items) {
      expect(item.a, item.q).not.toMatch(/[—–]/);
    }
  });
});
