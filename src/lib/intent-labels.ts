import type { IntentBidStatus } from "@/lib/intent";

const STATUS_LABELS: Record<IntentBidStatus, string> = {
  listed: "Listed",
  outbid: "Outbid",
  withdrawn: "Withdrawn",
  approved: "Approved",
  rejected: "Rejected",
};

export function intentStatusLabel(status: IntentBidStatus): string {
  return STATUS_LABELS[status];
}

export function intentStatusClass(status: IntentBidStatus): string {
  return `badge badge-status badge-${status}`;
}
