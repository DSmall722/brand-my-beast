/**
 * Slice 12.13 — CAN-SPAM stub footer for every outbound mail.
 * Unsubscribe link + physical address line. No personal home address.
 * Slice 14.40 — List-Unsubscribe / List-Unsubscribe-Post header helpers.
 */

import { BRAND } from "@/lib/campaign";

/** Public unsubscribe path. Stub until a real preference center ships. */
export const CAN_SPAM_UNSUBSCRIBE_PATH = "/unsubscribe";

export const CAN_SPAM_UNSUBSCRIBE_URL = `https://${BRAND.domain}${CAN_SPAM_UNSUBSCRIBE_PATH}`;

/**
 * Placeholder physical mailing line. Not a home address.
 * Replace after LLC paperwork — never invent a residential street.
 */
export const CAN_SPAM_PHYSICAL_ADDRESS =
  `${BRAND.name}, Attn: ${BRAND.operator} — mailing address stub (set after LLC), ${BRAND.domain}`;

/** Append unsubscribe + physical address to every mail body. */
export function withCanSpamFooter(text: string): string {
  return [
    text.trimEnd(),
    "",
    "—",
    `Unsubscribe: ${CAN_SPAM_UNSUBSCRIBE_URL}`,
    CAN_SPAM_PHYSICAL_ADDRESS,
  ].join("\n");
}

/**
 * Slice 14.40 — RFC 2369 / 8058 headers for waitlist mail.
 * One-click POST target is the public unsubscribe stub URL.
 */
export function waitlistListUnsubscribeHeaders(): Record<string, string> {
  const mailto = `mailto:${BRAND.email}?subject=unsubscribe`;
  return {
    "List-Unsubscribe": `<${CAN_SPAM_UNSUBSCRIBE_URL}>, <${mailto}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
