/**
 * Slice 16.37 — visual check cares about missing board numbers, not kerning.
 */

const BOARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export function missingBoardNumbers(present: readonly number[]): number[] {
  const have = new Set(present);
  return BOARD_NUMBERS.filter((n) => !have.has(n));
}
