#!/usr/bin/env node

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
const expected = '"2026-12-31T17:00:00.000Z"';
if (rhs !== expected) {
  console.error(`grep:close-at failed. CLOSE_AT is ${rhs}, expected ${expected}.`);
  process.exit(1);
}

console.log("grep:close-at ok — CLOSE_AT is the locked window.");
process.exit(0);
