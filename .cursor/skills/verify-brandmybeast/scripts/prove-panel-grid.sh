#!/usr/bin/env bash
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

# Keep in lockstep with PANELS / PANEL_BOARD_MARKS (1 hood … 12 rear fascia).
node --input-type=module <<'NODE'
import { chromium } from "@playwright/test";
import fs from "node:fs";

const ETCHABLE = [
  "hood",
  "driver-door",
  "passenger-door",
  "driver-bed",
  "passenger-bed",
  "driver-rear-quarter",
  "passenger-rear-quarter",
  "tailgate",
];
const WRAP_ONLY = ["front-fascia", "tonneau", "roof", "rear-fascia"];
/** Same order as PANELS / hero callouts (slice 16.1). */
const INDEXED = [
  "hood",
  "front-fascia",
  "driver-door",
  "passenger-door",
  "driver-bed",
  "passenger-bed",
  "driver-rear-quarter",
  "passenger-rear-quarter",
  "tailgate",
  "tonneau",
  "roof",
  "rear-fascia",
];
const ALL = [...ETCHABLE, ...WRAP_ONLY];

const url = process.env.BMB_VERIFY_URL;
const out = process.env.BMB_VERIFY_OUT;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${url}/#panels`, { waitUntil: "networkidle" });
await page.getByTestId("panel-grid").waitFor();

const articles = page.getByTestId("panel-grid").locator("article");
const count = await articles.count();
const lines = [`panel_count=${count}`];
if (count !== 12) throw new Error(`expected 12 panels, got ${count}`);
if (ALL.length !== 12) throw new Error("script panel inventory drifted");
if (INDEXED.length !== 12) throw new Error("script index inventory drifted");

for (let i = 0; i < INDEXED.length; i += 1) {
  const id = INDEXED[i];
  const n = String(i + 1);
  const card = page.getByTestId(`panel-${id}`);
  await card.waitFor();
  if ((await card.getAttribute("data-panel-n")) !== n) {
    throw new Error(`panel ${id} data-panel-n should be ${n}`);
  }
  const indexText = await page
    .getByTestId(`panel-index-${id}`)
    .evaluate((el) => el.textContent?.trim() ?? "");
  if (indexText !== n) {
    throw new Error(`panel ${id} index text should be ${n}, got ${indexText}`);
  }
  const callout = page.getByTestId(`hero-panel-board-${n}`);
  if ((await callout.getAttribute("data-panel-id")) !== id) {
    throw new Error(`hero callout ${n} should map to ${id}`);
  }
  if ((await callout.getAttribute("data-panel-n")) !== n) {
    throw new Error(`hero callout ${n} data-panel-n mismatch`);
  }
  lines.push(`${id}=index_${n}`);
}

for (const id of ETCHABLE) {
  const card = page.getByTestId(`panel-${id}`);
  await card.waitFor();
  if ((await card.getAttribute("data-etchable")) !== "true") {
    throw new Error(`panel ${id} should be etchable`);
  }
  if ((await card.getAttribute("data-etch-unlocked")) !== "false") {
    throw new Error(`panel ${id} should keep etch locked under buyout`);
  }
  const lockText = await page.getByTestId(`etch-lock-${id}`).innerText();
  // CSS may uppercase glyphs; textContent keeps source casing.
  const lockSource = await page
    .getByTestId(`etch-lock-${id}`)
    .evaluate((el) => el.textContent?.trim() ?? "");
  if (lockSource !== "Etch at $120k") {
    throw new Error(`panel ${id} bad etch lock copy: ${lockText} / ${lockSource}`);
  }
  lines.push(`${id}=etchable_locked`);
}

for (const id of WRAP_ONLY) {
  const card = page.getByTestId(`panel-${id}`);
  await card.waitFor();
  if ((await card.getAttribute("data-etchable")) !== "false") {
    throw new Error(`panel ${id} should be wrap-only`);
  }
  const text = await card.innerText();
  if (!/\bwrap\b/i.test(text) || /etch at/i.test(text)) {
    throw new Error(`panel ${id} missing wrap-only badge`);
  }
  lines.push(`${id}=wrap_only`);
}

await page.getByTestId("panel-grid").screenshot({ path: `${out}/panel-grid.png` });
fs.writeFileSync(`${out}/panel-grid-assert.txt`, lines.join("\n") + "\n");
await browser.close();
console.log(`evidence written under ${out}`);
NODE

echo "PROVE_OK feature=panel-grid run=$RUN_ID out=$OUT"
