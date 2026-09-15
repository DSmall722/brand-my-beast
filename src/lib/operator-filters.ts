/**
 * Slice 8.3 — operator `/operator?status=` filters.
 * pending maps to listed intents awaiting approval.
 */

export const OPERATOR_FILTERS = [
  "pending",
  "approved",
  "rejected",
  "outbid",
] as const;

export type OperatorFilter = (typeof OPERATOR_FILTERS)[number];

export function parseOperatorFilter(
  raw: string | string[] | undefined,
): OperatorFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === "approved" ||
    value === "rejected" ||
    value === "outbid" ||
    value === "pending"
  ) {
    return value;
  }
  return "pending";
}

export function operatorFilterLabel(filter: OperatorFilter): string {
  switch (filter) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "outbid":
      return "Outbid";
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

export function operatorFilterToStatus(
  filter: OperatorFilter,
): "listed" | "approved" | "rejected" | "outbid" {
  return filter === "pending" ? "listed" : filter;
}
