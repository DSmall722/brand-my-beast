# BrandMyBeast — harness rules

Any Cursor agent, pstack skill, or Grok session working this repo starts here, then reads `CAMPAIGN.md`.

Updated: 2026-09-22

## Read order

1. `CAMPAIGN.md`
2. `RULES.md`
3. `ARCHITECTURE.md`
4. `FEATURES.md` (backlog only — do not put it on the public site)

If two files conflict, **CAMPAIGN.md wins**. Then stop and flag the conflict. Do not invent a third number.

## Never emit

- The operator’s legal name
- The operator’s personal Gmail
- The operator’s personal X handle
- Employer, job title, home address
- A VIN or reservation that does not exist
- Impression counts or CPMs
- A close date unless `CLOSE_AT` is set in code
- The word **lease** in user-facing copy
- Dual Motor / Premium as a fallback if $58,000 misses

Allowed public strings: BrandMyBeast, @BrandMyBeast, hello@brandmybeast.com, brandmybeast.com, “the operator.”

## Money that must match in every file and UI

- Floor **$58,000** — order the Cyberbeast + wrap reserve. Miss = refund.
- Goal / buyout **$120,000** — whole-truck + Immortal Etch package. Campaign buys the truck. Etch is in the package, not a side effect.
- $58,000–$119,999 — ordered + wrapped. No Immortal Etch.
- Deposit **20%** to list.
- Eleven panels. Nine etchable **only at $120,000**.

## Product that is not up for debate in a drive-by PR

- Cyberbeast or refund. No cheaper trim.
- Wrap = 12 months from install. Etch = until the steel is gone.
- Clock = 30 days after P3. Not October 1.
- One brand per trade.
- Static `index.html` is a prototype. Production is Next.js + Postgres + Stripe SetupIntent.

## What “done” means for a feature

A feature is not done because the page renders. It is done when a Playwright check (or pstack skill) proves the rule above still holds: floor math, etch lock under $120k, increment, no banned identity strings in the HTML.

## UI / marketing anti-patterns (no-gos)

Standing instruction 2026-09-22. Source: @suraj_sharma14, "30 reasons your site looks vibe-coded", https://x.com/suraj_sharma14/status/2102254059151565233.

Apply this list when you add or review public UI and marketing. Do not restyle the live homepage because the list exists.

- Harsh gradients
- Lucide icons as the default icon set
- Pure white background
- Rainbow coloring
- Drop shadows
- Three feature cards in a row
- Emojis
- Liquid glass
- Em dashes in public copy. When you touch public copy, write the new sentences without them. Leave locked strings in `PUBLIC_COPY.md` until a human asks to change them.
- Inter, Geist, or Space Grotesk as the default type stack. Locked type stays Syne for display and IBM Plex Sans for body.
- Colored left stripe
- Fake testimonials
- Bento grids
- Terminal window chrome
- "It's not X, it's Y" copy
- Checkmark bullets
- Three pricing tiers by default
- A marketing surface with no real product demo. Show the real board and panels. Do not invent a truck, VIN, or reservation.
- Soft corner radius everywhere
- Purple and black
- A loading state with no skeleton
- Radial orbs
- Dot grids
- Sparkle icons
- Animated arrows
- Missing terms. Keep `/terms` as the live Terms of Use.
- Missing privacy policy. Keep `/privacy` as a real policy.
- Hover animations for their own sake
- Neon colors used as decoration. The locked site lime stays. That token is `--signal`, the BrandMyBeast lime lockup.
- Basic pastel colors

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
