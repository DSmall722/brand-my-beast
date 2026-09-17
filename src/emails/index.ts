/**
 * Slice 12.11 — email templates live under src/emails/.
 * Slice 12.13 — CAN-SPAM stub footer on every template.
 * Slice 14.19 — seats-open template (do not send from the agent).
 */

export {
  intentStatusEmailTemplate,
  type EmailTemplate,
  type IntentStatusKind,
} from "./intent-status";
export { waitlistOperatorEmailTemplate } from "./waitlist-operator";
export { waitlistConfirmEmailTemplate } from "./waitlist-confirm";
export { operatorDigestEmailTemplate } from "./operator-digest";
export { seatsOpenEmailTemplate } from "./seats-open";
export {
  CAN_SPAM_PHYSICAL_ADDRESS,
  CAN_SPAM_UNSUBSCRIBE_PATH,
  CAN_SPAM_UNSUBSCRIBE_URL,
  waitlistListUnsubscribeHeaders,
  withCanSpamFooter,
} from "./can-spam";
