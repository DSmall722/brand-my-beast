# BrandMyBeast — hello@ email

Updated: 2026-09-13

## Status (done)

`hello@brandmybeast.com` forwards via ImprovMX. Domain DNS stays on Vercel nameservers.

| Record | Value |
|---|---|
| Nameservers | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| MX 10 | `mx1.improvmx.com` |
| MX 20 | `mx2.improvmx.com` |
| TXT SPF | `v=spf1 include:spf.improvmx.com ~all` |
| Public inbox | hello@brandmybeast.com |
| Destination | personal Gmail (never write the address in this repo) |

`TEST-BMB-1` arrived from a third mailbox. Receive is proven.

## Hard rules

- Do not move nameservers.
- Do not delete Vercel A / CNAME / verification TXT.
- Do not point forwarding at a work inbox.
- Do not write the destination Gmail address in git.
- Do not upgrade ImprovMX unless we need SMTP send-as.
- X account `@BrandMyBeast` already exists on this inbox. Do not create a second one.
