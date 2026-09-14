#!/usr/bin/env bash
# Wave 0 slices 0.1–0.4: truck-gated empty boards, public copy, waitlist contract.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

PORT="${BMB_VERIFY_PORT:-3010}"
URL="http://127.0.0.1:${PORT}"
export BMB_VERIFY_URL="$URL"
RUN_ID="${BMB_VERIFY_RUN_ID:-$(date +%Y%m%dT%H%M%S)}"
OUT="$ROOT/.cursor/skills/verify-brandmybeast/artifacts/$RUN_ID"
mkdir -p "$OUT"

.cursor/skills/verify-brandmybeast/scripts/launch.sh >/dev/null
.cursor/skills/verify-brandmybeast/scripts/doctor.sh

export BMB_VERIFY_URL="$URL"
export BMB_VERIFY_OUT="$OUT"
export BMB_VERIFY_EMAIL="wave0-${RUN_ID}@example.com"

node --input-type=module <<'NODE'
import { chromium } from "@playwright/test";
import fs from "node:fs";

const url = process.env.BMB_VERIFY_URL;
const out = process.env.BMB_VERIFY_OUT;
const email = process.env.BMB_VERIFY_EMAIL;
const lines = [];

const HIDDEN_HOME_BOARDS = [
  "vault-certificate",
  "retired-vinyl",
  "season-two",
  "rain-night-lighting",
  "truck-order-tracker",
  "weekly-mileage-ledger",
  "landmark-proof-log",
  "city-time-heatmap",
  "qr-nfc-scan-counter",
  "city-ping-winner",
  "charge-stop-slots",
  "route-detour-buyout",
  "clemson-saturday-lock",
  "sighting-bounty-cards",
  "circuit-story",
  "sightings",
  "event-calendar",
];

const HIDDEN_WINNER_FACTS = [
  "vault-certificate",
  "retired-vinyl",
  "season-two",
  "rain-night-lighting",
  "truck-order-tracker",
  "weekly-mileage-ledger",
  "landmark-proof-log",
  "city-time-heatmap",
  "qr-nfc-scan-counter",
  "city-ping-winner",
  "charge-stop-slots",
  "route-detour-buyout",
  "clemson-saturday-lock",
  "sighting-bounty-cards",
];

const PROCESS_MEMO_BANS = [
  "Close date unset",
  "30-day clock",
  "FEATURES.md",
  "Auction clock",
  "Rules draft",
  "No close clock on P2",
  "Stripe capture",
  "No invented miles",
  "No invented scan counts",
  "No invented city hours",
];

async function postWaitlist(body) {
  const res = await fetch(`${url}/api/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function signIn(page, who) {
  await page.goto(`${url}/signin`, { waitUntil: "networkidle" });
  await page.getByTestId("signin-email").fill(who);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await page.getByTestId("account-page").waitFor();
}

const created = await postWaitlist({ email });
if (created.status !== 201 || created.json?.status !== "created") {
  throw new Error(`0.4 created failed: ${JSON.stringify(created)}`);
}
lines.push("0.4_created_201");

const exists = await postWaitlist({ email });
if (exists.status !== 200 || exists.json?.status !== "exists") {
  throw new Error(`0.4 exists failed: ${JSON.stringify(exists)}`);
}
lines.push("0.4_exists_200");

const invalid = await postWaitlist({ email: "not-an-email" });
if (invalid.status !== 400 || invalid.json?.code !== "invalid") {
  throw new Error(`0.4 invalid failed: ${JSON.stringify(invalid)}`);
}
lines.push("0.4_invalid_400");

const missing = await postWaitlist({});
if (missing.status !== 400 || missing.json?.code !== "invalid") {
  throw new Error(`0.4 missing email failed: ${JSON.stringify(missing)}`);
}
lines.push("0.4_missing_400");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(url, { waitUntil: "networkidle" });
await page.getByTestId("brand-wordmark").waitFor();
const brand = (await page.getByTestId("brand-wordmark").textContent())?.trim();
const floor = await page.getByTestId("floor-amount").innerText();
const goal = await page.getByTestId("goal-amount").innerText();
const close = await page.getByTestId("close-copy").innerText();
if (brand !== "BrandMyBeast") throw new Error(`bad brand: ${brand}`);
if (floor !== "$58,000") throw new Error(`bad floor: ${floor}`);
if (goal !== "$120,000") throw new Error(`bad goal: ${goal}`);
if (close.trim() !== "Bidding is not open yet.") {
  throw new Error(`bad close copy: ${close}`);
}
const truckAttr = await page
  .getByTestId("home-main")
  .getAttribute("data-truck-exists");
if (truckAttr !== "false") {
  throw new Error(`0.1 expected data-truck-exists=false, got ${truckAttr}`);
}
for (const board of HIDDEN_HOME_BOARDS) {
  if ((await page.getByTestId(board).count()) !== 0) {
    throw new Error(`0.1 empty board leaked on /: ${board}`);
  }
}
lines.push("0.1_home_boards_hidden");

const html = await page.content();
const lower = html.toLowerCase();
if (/\blease\b/.test(lower)) throw new Error("0.3 lease on /");
if (lower.includes("gmail.com")) throw new Error("0.3 gmail on /");
if (!html.includes("@BrandMyBeast")) throw new Error("0.3 missing @BrandMyBeast");
if (!html.includes("hello@brandmybeast.com")) {
  throw new Error("0.3 missing hello@brandmybeast.com");
}
for (const ban of PROCESS_MEMO_BANS) {
  if (html.includes(ban)) throw new Error(`0.3 banned copy on /: ${ban}`);
}
if (/\bP2\b/.test(html)) throw new Error("0.3 P2 process label on /");
lines.push("0.3_copy_audit");

await page.screenshot({ path: `${out}/wave0-home.png`, fullPage: false });

const fresh = `fresh-${Date.now()}@example.com`;
await page.getByTestId("waitlist-email").fill(fresh);
const [uiCreated] = await Promise.all([
  page.waitForResponse(
    (res) =>
      res.url().includes("/api/waitlist") && res.request().method() === "POST",
  ),
  page.getByTestId("waitlist-submit").click(),
]);
if (uiCreated.status() !== 201) {
  throw new Error(`0.4 UI create status ${uiCreated.status()}`);
}
await page.getByTestId("waitlist-status").waitFor();
const statusText = await page.getByTestId("waitlist-status").innerText();
if (!/on the list/i.test(statusText)) {
  throw new Error(`0.4 bad UI status: ${statusText}`);
}
const nextText = await page.getByTestId("waitlist-next").innerText();
if (!/cards are not charged yet/i.test(nextText)) {
  throw new Error(`0.4 waitlist-next missing charge disclaimer: ${nextText}`);
}
lines.push("0.4_ui_created_201");

await signIn(page, "wave0-account@example.com");
await page.goto(`${url}/account`, { waitUntil: "networkidle" });
await page.getByTestId("account-page").waitFor();
const accountTruck = await page
  .getByTestId("account-page")
  .getAttribute("data-truck-exists");
if (accountTruck !== "false") {
  throw new Error(`0.2 account truck attr ${accountTruck}`);
}
for (const board of HIDDEN_HOME_BOARDS) {
  if ((await page.getByTestId(board).count()) !== 0) {
    throw new Error(`0.2 empty board on /account: ${board}`);
  }
}
lines.push("0.2_account_hidden");

await page.goto(`${url}/account/wins`, { waitUntil: "networkidle" });
await page.getByTestId("winner-portal").waitFor();
const winsTruck = await page
  .getByTestId("winner-portal")
  .getAttribute("data-truck-exists");
if (winsTruck !== "false") {
  throw new Error(`0.2 wins truck attr ${winsTruck}`);
}
for (const factId of HIDDEN_WINNER_FACTS) {
  if ((await page.getByTestId(`winner-fact-${factId}`).count()) !== 0) {
    throw new Error(`0.2 empty fact on /account/wins: ${factId}`);
  }
}
lines.push("0.2_wins_hidden");

await page.context().clearCookies();
await signIn(page, "shop@example.com");
await page.goto(`${url}/partner/shop`, { waitUntil: "networkidle" });
await page.getByTestId("partner-shop").waitFor();
const shopTruck = await page
  .getByTestId("partner-shop")
  .getAttribute("data-truck-exists");
if (shopTruck !== "false") {
  throw new Error(`0.2 partner truck attr ${shopTruck}`);
}
for (const board of HIDDEN_HOME_BOARDS) {
  if ((await page.getByTestId(board).count()) !== 0) {
    throw new Error(`0.2 empty board on /partner/shop: ${board}`);
  }
}
lines.push("0.2_partner_hidden");

await page.screenshot({ path: `${out}/wave0-partner.png`, fullPage: false });
fs.writeFileSync(`${out}/wave0-assert.txt`, lines.join("\n") + "\n");
await browser.close();
console.log(`wave0 evidence under ${out}`);
NODE

echo "PROVE_OK feature=wave0-slices-0.1-0.4 run=$RUN_ID out=$OUT"
