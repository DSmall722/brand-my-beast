import { BRAND } from "@/lib/campaign";

export const CAN_SPAM_UNSUBSCRIBE_PATH = "/unsubscribe";

export const CAN_SPAM_UNSUBSCRIBE_URL = `https://${BRAND.domain}${CAN_SPAM_UNSUBSCRIBE_PATH}`;

export const CAN_SPAM_PHYSICAL_ADDRESS =
  `${BRAND.name}, Attn: ${BRAND.operator}, ${BRAND.domain}`;

export function withCanSpamFooter(text: string): string {
  return [
    text.trimEnd(),
    "",
    "—",
    `Unsubscribe: ${CAN_SPAM_UNSUBSCRIBE_URL}`,
    CAN_SPAM_PHYSICAL_ADDRESS,
  ].join("\n");
}

export function waitlistListUnsubscribeHeaders(): Record<string, string> {
  const mailto = `mailto:${BRAND.email}?subject=unsubscribe`;
  return {
    "List-Unsubscribe": `<${CAN_SPAM_UNSUBSCRIBE_URL}>, <${mailto}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
