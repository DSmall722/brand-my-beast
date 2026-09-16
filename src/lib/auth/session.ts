/**
 * Slice 12.18 — Auth.js JWT session max-age (documented).
 * Absolute lifetime from issue. Not a campaign CLOSE_AT. No Stripe.
 */

/** Seven days in seconds — wired into Auth.js `session.maxAge`. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Human-readable days matching SESSION_MAX_AGE_SECONDS. */
export const SESSION_MAX_AGE_DAYS = 7;

/**
 * Idle / expiry copy shown on `/account`.
 * Sessions expire after this window; intent marks stay on the board.
 */
export const ACCOUNT_SESSION_IDLE_COPY =
  `Signed-in sessions last up to ${SESSION_MAX_AGE_DAYS} days. After that idle window, sign in again. Intent marks stay on the board — still no card charge.`;
