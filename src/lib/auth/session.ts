export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const SESSION_MAX_AGE_DAYS = 7;

export const ACCOUNT_SESSION_IDLE_COPY =
  `Signed-in sessions last up to ${SESSION_MAX_AGE_DAYS} days. After that idle window, sign in again. Intent marks stay on the board — still no card charge.`;
