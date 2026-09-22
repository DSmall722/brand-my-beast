#!/usr/bin/env bash
# Prove P2 panel intent + operator approval (memory / test auth).
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

node --input-type=module <<'NODE'
import { chromium } from "@playwright/test";
import fs from "node:fs";

const url = process.env.BMB_VERIFY_URL;
const out = process.env.BMB_VERIFY_OUT;
const lines = [];

async function signIn(page, email) {
  await page.goto(`${url}/signin`, { waitUntil: "networkidle" });
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await page.getByTestId("account-page").waitFor();
}

const reset = await fetch(`${url}/api/test/reset-intents`, { method: "POST" });
if (!reset.ok) throw new Error(`reset-intents failed: ${reset.status}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${url}/panels/hood`, { waitUntil: "networkidle" });
for (const id of [
  "panel-intent-page",
  "panel-mockup",
  "seat-lead",
  "public-seat-waitlist-cta",
]) {
  await page.getByTestId(id).waitFor();
}
const cta = await page.getByTestId("public-seat-waitlist-cta").innerText();
if (!/Get on the list/i.test(cta)) {
  throw new Error(`bad seat CTA: ${cta}`);
}
const html = await page.content();
if (/\blease\b/i.test(html)) throw new Error("lease copy on panel intent page");
if (html.includes("CLOSE_AT")) throw new Error("CLOSE_AT on panel intent page");
await page.screenshot({ path: `${out}/panel-intent-anon.png`, fullPage: false });
lines.push("anon_panel_ok");

await signIn(page, "intent-prove@example.com");
await page.goto(`${url}/panels/hood`, { waitUntil: "networkidle" });
await page.getByTestId("intent-brand").fill("Prove Co");
await page.getByTestId("intent-trade").fill("prove tools");
await page.getByTestId("intent-submit").click();
await page.getByTestId("intent-success").waitFor();
const success = await page.getByTestId("intent-success").innerText();
if (!/not charged/i.test(success)) {
  throw new Error(`bad intent success: ${success}`);
}
const list = await page.getByTestId("intent-list").innerText();
if (!/Prove Co/.test(list)) throw new Error("intent list missing Prove Co");
await page.screenshot({ path: `${out}/panel-intent-listed.png`, fullPage: false });
lines.push("list_intent_ok");

await page.context().clearCookies();
await signIn(page, "operator@example.com");
await page.goto(`${url}/operator/approvals`, { waitUntil: "networkidle" });
await page.getByTestId("operator-approvals").waitFor();
await page.getByTestId("approvals-list").waitFor();
const approvals = await page.getByTestId("approvals-list").innerText();
if (!/Prove Co/.test(approvals)) {
  throw new Error("approvals missing Prove Co");
}
await page.locator('[data-testid^="approve-"]').first().click();
await page.getByTestId("approvals-empty").waitFor({ timeout: 10_000 });
lines.push("approve_ok");

await page.context().clearCookies();
const reset2 = await fetch(`${url}/api/test/reset-intents`, { method: "POST" });
if (!reset2.ok) throw new Error(`reset-intents failed: ${reset2.status}`);

await signIn(page, "outbid-prove-a@example.com");
await page.goto(`${url}/panels/hood`, { waitUntil: "networkidle" });
await page.getByTestId("intent-brand").fill("Outbid Alpha");
await page.getByTestId("intent-trade").fill("alpha tools");
await page.getByTestId("intent-submit").click();
await page.getByTestId("intent-success").waitFor();

await page.context().clearCookies();
await signIn(page, "outbid-prove-b@example.com");
await page.goto(`${url}/panels/hood`, { waitUntil: "networkidle" });
await page.getByTestId("intent-brand").fill("Outbid Beta");
await page.getByTestId("intent-trade").fill("beta tools");
await page.getByTestId("intent-standing").fill("2750");
await page.getByTestId("intent-submit").click();
await page.getByTestId("intent-success").waitFor();

await page.context().clearCookies();
await signIn(page, "outbid-prove-a@example.com");
await page.goto(`${url}/panels/hood`, { waitUntil: "networkidle" });
await page.getByTestId("failed-winner-waitlist").waitFor();
const failed = await page.getByTestId("failed-winner-waitlist").innerText();
if (!/outbid/i.test(failed)) throw new Error(`bad failed-winner copy: ${failed}`);
await page.goto(`${url}/account`, { waitUntil: "networkidle" });
await page.getByTestId("account-intents-list").waitFor();
const acct = await page.getByTestId("account-intents-list").innerText();
if (!/Outbid Alpha/.test(acct)) throw new Error("account missing outbid intent");
await page.locator('[data-testid^="account-outbid-waitlist-"]').first().waitFor();
await page.screenshot({ path: `${out}/panel-intent-outbid.png`, fullPage: false });
lines.push("failed_winner_waitlist_ok");

fs.writeFileSync(`${out}/panel-intent-assert.txt`, lines.join("\n") + "\n");
await browser.close();
console.log(`evidence written under ${out}`);
NODE

echo "PROVE_OK feature=panel-intent run=$RUN_ID out=$OUT"
