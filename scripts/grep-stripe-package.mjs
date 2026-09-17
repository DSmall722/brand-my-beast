#!/usr/bin/env node
/**
 * Slice 14.45 — CI grep: fail if package.json gains a stripe dependency.
 * Run via `npm run grep:stripe`. Exit 1 on any hit.
 * Prose mentions of Stripe in docs are out of scope; this gate is package.json only.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

function packageNameLooksLikeStripe(name) {
  return name.toLowerCase().includes("stripe");
}

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const hits = [];

for (const field of DEP_FIELDS) {
  const block = pkg[field];
  if (!block || typeof block !== "object") continue;
  for (const name of Object.keys(block)) {
    if (packageNameLooksLikeStripe(name)) {
      hits.push({ field, name });
    }
  }
}

if (hits.length === 0) {
  console.log("grep:stripe ok — 0 stripe dependencies in package.json.");
  process.exit(0);
}

for (const hit of hits) {
  console.error(`stripe-package package.json ${hit.field} ${hit.name}`);
}
console.error(`grep:stripe failed — ${hits.length} stripe dependency hit(s).`);
process.exit(1);
