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

export function packageNameLooksLikeStripe(name: string): boolean {
  return name.toLowerCase().includes("stripe");
}

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

export function findStripePackageNames(pkg: PackageJsonDeps): string[] {
  return listPackageDependencyNames(pkg).filter(packageNameLooksLikeStripe);
}

export function readRootPackageJson(
  root: string = process.cwd(),
): PackageJsonDeps {
  const raw = readFileSync(join(root, "package.json"), "utf8");
  return JSON.parse(raw) as PackageJsonDeps;
}

export function findStripePackagesInRootPackageJson(
  root: string = process.cwd(),
): string[] {
  return findStripePackageNames(readRootPackageJson(root)).filter(
    (name) => name !== "stripe",
  );
}
