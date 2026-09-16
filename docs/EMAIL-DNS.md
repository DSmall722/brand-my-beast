# Email DNS checklist — BrandMyBeast

Slice **13.9**. Human DNS checklist for outbound mail from
**hello@brandmybeast.com** (Resend). Checkboxes only. Does not send mail.
Does not set `CLOSE_AT`. No Stripe. No lease.

Money fences stay **$58,000** / **$120,000**. Public From stays
`BrandMyBeast <hello@brandmybeast.com>` (see `src/lib/mail-envelope.ts`).

## Before touching DNS (human)

- [ ] Confirm the sending domain is **brandmybeast.com** (not a personal inbox).
- [ ] Confirm Resend project From is **hello@brandmybeast.com** only.
- [ ] Confirm `RESEND_FROM` (if set) still addresses hello@ — never a personal Gmail.
- [ ] Confirm Reply-To is **hello@brandmybeast.com**.

## SPF

- [ ] Publish an SPF TXT on `brandmybeast.com` that authorizes Resend (and only the providers you intend).
- [ ] Keep a single SPF record (no duplicate TXT SPF rows).
- [ ] Do not point SPF at a personal mailbox provider as the campaign From.

## DKIM

- [ ] Add the Resend DKIM CNAME (or TXT) records Resend shows for `brandmybeast.com`.
- [ ] Wait for Resend domain status to show DKIM verified before relying on production sends.
- [ ] Do not paste live API keys into this file or into git.

## DMARC

- [ ] Publish a DMARC TXT at `_dmarc.brandmybeast.com`.
- [ ] Start with a monitoring policy (`p=none`) until SPF + DKIM are clean, then tighten as a human decides.
- [ ] Aggregate reports (if any) go to an operator-controlled address under brandmybeast.com — not a personal Gmail.

## Prove without sending from an agent

- [ ] Human sends one test message From hello@ to a catch mailbox and checks SPF/DKIM/DMARC pass in headers.
- [ ] CI / Playwright still use the Resend mock — agents must not fire live Resend from this checklist.
- [ ] Magic-link, waitlist, and intent-status templates still show BrandMyBeast / hello@ only.

## Stop rules

- Do not set `CLOSE_AT` from this file.
- Do not wire Stripe / SetupIntent from this file.
- Do not move Vercel nameservers from this checklist (human-only; see SLICES Human-only).
- Do not invent a third money number.
- Public mail only: **hello@brandmybeast.com**.
