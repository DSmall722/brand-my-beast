/**
 * Slice 12.11 — email templates live under src/emails/.
 * Slice 12.13 — CAN-SPAM stub footer on every template.
 */

export {
  intentStatusEmailTemplate,
  type EmailTemplate,
  type IntentStatusKind,
} from "./intent-status";
export { waitlistOperatorEmailTemplate } from "./waitlist-operator";
export { operatorDigestEmailTemplate } from "./operator-digest";
export {
  CAN_SPAM_PHYSICAL_ADDRESS,
  CAN_SPAM_UNSUBSCRIBE_PATH,
  CAN_SPAM_UNSUBSCRIBE_URL,
  withCanSpamFooter,
} from "./can-spam";
