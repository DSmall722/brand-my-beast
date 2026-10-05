#!/usr/bin/env node
/**
 * CI grep: CLOSE_AT must be the locked Nov 2 2026 12:00 PM ET instant.
 * Run via `npm run grep:close-at`.
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
const expected = '"2026-11-02T17:00:00.000Z"';
if (rhs !== expected) {
  console.error(`grep:close-at failed. CLOSE_AT is ${rhs}, expected ${expected}.`);
  process.exit(1);
}

console.log("grep:close-at ok — CLOSE_AT is the locked window.");
process.exit(0);
