# pstack upstream pin

Vendored so cloud agents can see `/poteto-mode` without account-level plugins.

| Field | Value |
|---|---|
| Source | https://github.com/cursor/plugins |
| Path | `pstack/skills/` |
| SHA | `5bf2b1544db739998121a306340631963c2ff3de` |
| Date | 2026-09-12T20:38:59-07:00 |
| Commit | feat(pstack): setup-pstack budget ask (max/xhigh/high/medium) (#366) |
| License | `.cursor/PSTACK_LICENSE` (upstream `pstack/LICENSE`) |

## How this was vendored

Contents of `pstack/skills/` at the SHA above were copied into `.cursor/skills/`.

Do not edit vendored skill files in place to "fix BrandMyBeast." Product locks stay in `CAMPAIGN.md` / `AGENTS.md`. Bump by re-copying from a newer upstream SHA and updating this file in the same PR.

## Refresh

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/cursor/plugins.git /tmp/cursor-plugins
cd /tmp/cursor-plugins && git sparse-checkout set pstack
rm -rf .cursor/skills
mkdir -p .cursor/skills
cp -a /tmp/cursor-plugins/pstack/skills/. .cursor/skills/
# then update SHA/date/subject in this file
```
