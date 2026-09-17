/**
 * Slice 13.42 / 14.45 — CI fails if package.json gains a stripe dependency.
 * Scans dependency / devDependency / optionalDependency / peerDependency keys.
 * Prose mentions of Stripe in docs are out of scope; this gate is package.json only.
 * Package script: `npm run grep:stripe` → scripts/grep-stripe-package.mjs.
 * Does not set CLOSE_AT. Does not wire Stripe.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type PackageJsonDeps = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

/** True when a dependency name contains "stripe" (any casing). */
export function packageNameLooksLikeStripe(name: string): boolean {
  return name.toLowerCase().includes("stripe");
}

/** Dependency names from the four npm dependency maps. */
export function listPackageDependencyNames(
  pkg: PackageJsonDeps,
): string[] {
  const names: string[] = [];
  for (const field of DEP_FIELDS) {
    const block = pkg[field];
    if (!block) continue;
    names.push(...Object.keys(block));
  }
  return names;
}

/** Stripe-like dependency names present in the package maps. */
export function findStripePackageNames(pkg: PackageJsonDeps): string[] {
  return listPackageDependencyNames(pkg).filter(packageNameLooksLikeStripe);
}

export function readRootPackageJson(
  root: string = process.cwd(),
): PackageJsonDeps {
  const raw = readFileSync(join(root, "package.json"), "utf8");
  return JSON.parse(raw) as PackageJsonDeps;
}

/** Empty array = gate passes. Non-empty = CI must fail. */
export function findStripePackagesInRootPackageJson(
  root: string = process.cwd(),
): string[] {
  return findStripePackageNames(readRootPackageJson(root));
}
