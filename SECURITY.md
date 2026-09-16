# Security Policy — BrandMyBeast

Slice **12.49**. Report security issues to the public operator inbox only.

## Reporting

Email **hello@brandmybeast.com**.

Do **not** use a personal Gmail, personal X DM, or any inbox that is not the
public BrandMyBeast address. Do not open an issue with exploit details until
the operator acknowledges the report.

## Scope

- The Next.js app and API routes in this repository
- Waitlist / intent ledger data at rest (Neon) and in transit
- Auth magic-link / session handling

Out of scope for this file (human-only elsewhere): Stripe keys, setting
`CLOSE_AT`, LLC paperwork, Vercel nameserver moves.

## Money fences (unchanged)

- Floor **$58,000** — order + wrap reserve. Miss = refund.
- Buyout **$120,000** — etch unlock.
- `CLOSE_AT` stays null until a human starts P3.
- No Stripe capture in this repo until a separate human message opens Wave 15.
- No lease product. No cheaper trim.

## Preferred report contents

1. Summary and impact
2. Steps to reproduce (local / memory mode preferred)
3. Affected routes or files if known
4. Whether waitlist emails or approved standing could leak

Thank you for helping keep BrandMyBeast safe.
