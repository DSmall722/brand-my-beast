#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

PORT="${BMB_VERIFY_PORT:-3010}"
URL="${BMB_VERIFY_URL:-http://127.0.0.1:${PORT}}"
RUN_ID="${BMB_VERIFY_RUN_ID:-$(date +%Y%m%dT%H%M%S)}"
OUT="$ROOT/.cursor/skills/verify-brandmybeast/artifacts/$RUN_ID"
mkdir -p "$OUT"

.cursor/skills/verify-brandmybeast/scripts/launch.sh >/dev/null
.cursor/skills/verify-brandmybeast/scripts/doctor.sh

export BMB_VERIFY_URL="$URL"
export BMB_VERIFY_OUT="$OUT"
export BMB_VERIFY_EMAIL="prove-${RUN_ID}@example.com"

node --input-type=module <<'NODE'
import { chromium } from "@playwright/test";
import fs from "node:fs";

const url = process.env.BMB_VERIFY_URL;
const out = process.env.BMB_VERIFY_OUT;
const email = process.env.BMB_VERIFY_EMAIL;

async function postWaitlist(bodyEmail) {
  const res = await fetch(`${url}/api/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: bodyEmail }),
  });
  const json = await res.json();
  return { status: res.status, json };
}

const created = await postWaitlist(email);
if (created.status !== 201 || created.json?.status !== "created") {
  throw new Error(`create failed: ${JSON.stringify(created)}`);
}
const exists = await postWaitlist(email);
if (exists.status !== 200 || exists.json?.status !== "exists") {
  throw new Error(`exists failed: ${JSON.stringify(exists)}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${url}/#waitlist`, { waitUntil: "networkidle" });
await page.getByTestId("waitlist-email").fill(email);
const [response] = await Promise.all([
  page.waitForResponse(
    (res) =>
      res.url().includes("/api/waitlist") && res.request().method() === "POST",
  ),
  page.getByTestId("waitlist-submit").click(),
]);
if (response.status() !== 200) {
  throw new Error(`UI waitlist POST status ${response.status()}`);
}
await page.getByTestId("waitlist-status").waitFor();
const statusText = await page.getByTestId("waitlist-status").innerText();
if (!/already on the list/i.test(statusText)) {
  throw new Error(`bad waitlist status: ${statusText}`);
}
await page.getByTestId("waitlist-next").waitFor();
const browseHref = await page
  .getByTestId("waitlist-browse-panels")
  .getAttribute("href");
const signinHref = await page
  .getByTestId("waitlist-signin-intent")
  .getAttribute("href");
if (browseHref !== "/#panels") {
  throw new Error(`bad browse href: ${browseHref}`);
}
if (signinHref !== "/signin?callbackUrl=/panels/hood") {
  throw new Error(`bad signin href: ${signinHref}`);
}
const nextText = await page.getByTestId("waitlist-next").innerText();
if (!/no Stripe capture/i.test(nextText)) {
  throw new Error(`waitlist-next missing capture disclaimer: ${nextText}`);
}
await page.screenshot({ path: `${out}/waitlist.png`, fullPage: false });
fs.writeFileSync(
  `${out}/waitlist.json`,
  JSON.stringify(
    { email, created, exists, statusText, browseHref, signinHref, nextText },
    null,
    2,
  ) + "\n",
);
await browser.close();
console.log(`evidence written under ${out}`);
NODE

echo "PROVE_OK feature=waitlist-signup run=$RUN_ID out=$OUT"
