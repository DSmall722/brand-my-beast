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
const html = await page.content();
const lower = html.toLowerCase();

const checks = {
  hasHandle: html.includes("@BrandMyBeast"),
  hasMail: html.includes("hello@brandmybeast.com"),
  noLease: !/(^|[^a-z])lease([^a-z]|$)/i.test(html),
  noGmail: !lower.includes("gmail.com"),
  noCloseUnset: !html.includes("Close date unset"),
};

const lines = Object.entries(checks).map(([k, v]) => `${k}=${v}`);
fs.writeFileSync(`${out}/identity.txt`, lines.join("\n") + "\n");

if (!checks.hasHandle) throw new Error("missing @BrandMyBeast");
if (!checks.hasMail) throw new Error("missing hello@brandmybeast.com");
if (!checks.noLease) throw new Error("lease language present");
if (!checks.noGmail) throw new Error("gmail.com present");
if (!checks.noCloseUnset) throw new Error("process close note leaked into HTML");

await browser.close();
console.log(`evidence written under ${out}`);
NODE

echo "PROVE_OK feature=identity-locks run=$RUN_ID out=$OUT"
