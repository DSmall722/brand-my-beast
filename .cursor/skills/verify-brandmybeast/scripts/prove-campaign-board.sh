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

node --input-type=module <<'NODE'
import { chromium } from "@playwright/test";
import fs from "node:fs";

const url = process.env.BMB_VERIFY_URL;
const out = process.env.BMB_VERIFY_OUT;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.getByTestId("brand-wordmark").waitFor();
// textContent ignores CSS text-transform; innerText can show BRANDMYBEAST.
const brand = await page.getByTestId("brand-wordmark").evaluate((el) => el.textContent?.trim() ?? "");
const floor = await page.getByTestId("floor-amount").innerText();
const goal = await page.getByTestId("goal-amount").innerText();
const raised = await page.getByTestId("raised-amount").innerText();
const close = await page.getByTestId("close-copy").innerText();
await page.screenshot({ path: `${out}/campaign-board.png`, fullPage: false });
const lines = [
  `brand=${brand}`,
  `floor=${floor}`,
  `goal=${goal}`,
  `raised=${raised}`,
  `close=${close}`,
];
fs.writeFileSync(`${out}/campaign-board-assert.txt`, lines.join("\n") + "\n");
if (brand !== "BrandMyBeast") throw new Error(`bad brand: ${brand}`);
if (floor !== "$58,000") throw new Error(`bad floor: ${floor}`);
if (goal !== "$120,000") throw new Error(`bad goal: ${goal}`);
if (raised !== "$0") throw new Error(`bad raised: ${raised}`);
if (!close.toLowerCase().includes("close date unset")) {
  throw new Error(`bad close: ${close}`);
}
await browser.close();
console.log(`evidence written under ${out}`);
NODE

echo "PROVE_OK run=$RUN_ID out=$OUT"
