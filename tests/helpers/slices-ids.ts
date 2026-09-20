import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Locked last-minor (and Wave 16 letter prefixes) for each completed major.
 * Wave 19/20 condensed SLICES to `- [x] 0.1–18.7 Complete.` — parsers expand
 * that cross-major range from this table. Do not remint checkboxes.
 * Wave 15 is Stripe / human-only and is never expanded.
 */
export const WAVE_COMPLETE: Readonly<
  Record<number, { first: number; last: number; letters?: readonly string[] }>
> = {
  0: { first: 1, last: 9 },
  1: { first: 1, last: 8 },
  2: { first: 1, last: 5 },
  3: { first: 1, last: 7 },
  4: { first: 1, last: 6 },
  5: { first: 1, last: 4 },
  6: { first: 1, last: 15 },
  7: { first: 1, last: 10 },
  8: { first: 1, last: 10 },
  9: { first: 1, last: 10 },
  10: { first: 1, last: 10 },
  11: { first: 1, last: 10 },
  12: { first: 1, last: 50 },
  13: { first: 1, last: 50 },
  14: { first: 0, last: 50 },
  16: {
    first: 1,
    last: 50,
    letters: ["16.0a", "16.0b", "16.0c", "16.0d", "16.0e", "16.0f", "16.0g"],
  },
  17: { first: 1, last: 19 },
  18: { first: 1, last: 7 },
};

const WAVE_16_LETTERS = WAVE_COMPLETE[16]!.letters!;

function expandNumericRange(major: number, minorA: number, minorB: number): string[] {
  const ids: string[] = [];
  if (minorB < minorA) return ids;
  for (let m = minorA; m <= minorB; m += 1) {
    ids.push(`${major}.${m}`);
  }
  return ids;
}

function includeWave16Letters(majorA: number, minorA: number): boolean {
  return majorA < 16 || (majorA === 16 && minorA === 0);
}

/** Expand `0.1–18.7` using WAVE_COMPLETE; skip Wave 15. */
function expandCrossMajorRange(
  majorA: number,
  minorA: number,
  majorB: number,
  minorB: number,
): string[] {
  const ids: string[] = [];
  for (let major = majorA; major <= majorB; major += 1) {
    if (major === 15) continue;
    const spec = WAVE_COMPLETE[major];
    if (!spec) continue;
    if (major === 16 && includeWave16Letters(majorA, minorA)) {
      ids.push(...WAVE_16_LETTERS);
    }
    const first = major === majorA ? Math.max(minorA, spec.first) : spec.first;
    const last = major === majorB ? Math.min(minorB, spec.last) : spec.last;
    ids.push(...expandNumericRange(major, first, last));
  }
  return ids;
}

export function readSlicesMarkdown(): string {
  return readFileSync(join(process.cwd(), "SLICES.md"), "utf8");
}

/**
 * Parse SLICES.md checkboxes. Same-major ranges expand numerically.
 * Cross-major ranges (the Wave 19/20 lock line) expand via WAVE_COMPLETE.
 */
export function parseSlicesIds(slicesText?: string): string[] {
  const text = slicesText ?? readSlicesMarkdown();
  const ids: string[] = [];
  for (const line of text.split("\n")) {
    const letters = line.match(/^- \[[ xX]\] 16\.0a[\u2013-]16\.0g\b/);
    if (letters) {
      ids.push(...WAVE_16_LETTERS);
      continue;
    }
    const letter = line.match(/^- \[[ xX]\] (16\.0[a-g])\b/);
    if (letter) {
      ids.push(letter[1]!);
      continue;
    }
    const range = line.match(
      /^- \[[ xX]\] (\d+)\.(\d+)[\u2013-](\d+)\.(\d+)\b/,
    );
    if (range) {
      const majorA = Number(range[1]);
      const minorA = Number(range[2]);
      const majorB = Number(range[3]);
      const minorB = Number(range[4]);
      if (majorA === majorB) {
        ids.push(...expandNumericRange(majorA, minorA, minorB));
      } else {
        ids.push(...expandCrossMajorRange(majorA, minorA, majorB, minorB));
      }
      continue;
    }
    const single = line.match(/^- \[[ xX]\] (\d+\.\d+)\b/);
    if (single) ids.push(single[1]!);
  }
  return [...new Set(ids)];
}

export function slicesIdsForMajors(majors: readonly number[]): string[] {
  const allowed = new Set(majors);
  return parseSlicesIds().filter((id) => allowed.has(Number(id.split(".")[0])));
}

export function slicesCoversId(id: string, slicesText?: string): boolean {
  return parseSlicesIds(slicesText).includes(id);
}

/** Major of the `**Now:**` line. Null if missing. */
export function slicesNowMajor(slicesText?: string): number | null {
  const text = slicesText ?? readSlicesMarkdown();
  const match = text.match(/^\*\*Now:\*\*\s+(\d+)\./m);
  return match ? Number(match[1]) : null;
}
