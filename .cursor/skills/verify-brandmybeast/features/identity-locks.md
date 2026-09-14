# Identity locks

Public surfaces may only use BrandMyBeast public strings. Lease language and personal identity stay out of rendered HTML.

## Sub-features

- `identity-public` includes BrandMyBeast, `@BrandMyBeast`, and `hello@brandmybeast.com`.
- `identity-no-lease` forbids the word lease as a whole word.
- `identity-no-personal-gmail` forbids `gmail.com` in page HTML.

## How to get to it (user POV)

- Open `/` and inspect the rendered page (header, body, footer).

## Driving it with Playwright

Preconditions:

- App healthy at `$BMB_VERIFY_URL`.

- **Load HTML.** `page.goto("/")` then `page.content()`.
- **Require public strings.** HTML contains `@BrandMyBeast` and `hello@brandmybeast.com`.
- **Forbid lease.** `html.toLowerCase()` does not match `/\blease\b/`.
- **Forbid personal gmail.** HTML does not contain `gmail.com`.
- **Proof.** Write the stripped text checks to `artifacts/<run-id>/identity.txt`.

Or run:

```bash
.cursor/skills/verify-brandmybeast/scripts/prove-identity-locks.sh
```

## Gotchas

- Substring checks for `lease` falsely match words like `releases`. Use a word boundary.
- Repo markdown may discuss banned terms. This feature only judges rendered page HTML.
- “the operator” is allowed. Legal names and personal handles are not.
