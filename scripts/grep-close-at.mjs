#!/usr/bin/env node
/**
 * Slice 16.46 — CI grep: fail if CLOSE_AT in campaign.ts is non-null.
 * Run via `npm run grep:close-at`. Exit 1 on any hit.
 * Does not set CLOSE_AT. Does not start the 30-day clock.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "src/lib/campaign.ts"),
  "utf8",
);
const match = source.match(
  /export\s+const\s+CLOSE_AT\s*:\s*[^=]+=\s*([^;]+);/,
);

if (!match?.[1]) {
  console.error("grep:close-at failed — CLOSE_AT assignment missing.");
  process.exit(1);
}

const rhs = match[1].trim();
if (rhs !== "null") {
  console.error(`grep:close-at failed — CLOSE_AT is ${rhs}, expected null.`);
  process.exit(1);
}

console.log("grep:close-at ok — CLOSE_AT is null.");
process.exit(0);
