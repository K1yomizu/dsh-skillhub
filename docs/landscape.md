# Landscape: DSH skill & plugin marketplaces on GitHub

Surveyed **2026-10-12** with the GitHub search API through 11 repository queries,
merged and de-duplicated. Raw output: [`landscape-survey.json`](./landscape-survey.json).

This exists to answer one question honestly: *how crowded is this space, and where
does `dsh-skillhub` actually sit in it?* The short version is that the space is
extremely crowded and this plugin is not early.

---

## 1. How the numbers were obtained

Queries run (repo search, `per_page=100`, sorted by stars):

```
dsh-skill-market              dsh-skills-market          dsh-skillhub
dsh skill market              dsh skills marketplace     dsh plugin marketplace
dsh-skill-manager             dsh skillhub install       deepseek harness skill
deepseek harness plugin market                           deepseek harness skills sidebar
```

Every result was merged by `full_name`, then filtered to repositories that mention
DSH / DeepSeek Harness **and** whose subject is skills, plugins or a marketplace —
so the counts below are DSH repositories, not raw keyword hits.

**These numbers are a floor, not a total.** Four queries hit the 100-result page
cap while reporting larger totals (`deepseek harness skill` reported 1 197,
`dsh-skill-manager` 130, `dsh plugin marketplace` 117, `deepseek harness plugin
market` 104). The true population is larger than anything below.

## 2. The numbers

| Layer | Count | Meaning |
|---|---:|---|
| DSH-related repositories, merged & de-duplicated | **376** | everything the queries surfaced |
| … shaped like a *market / store / hub* | **199** | half of them |
| … a **plugin** market (GitHub-sourced) | **178** | the dominant interpretation |
| … a **skill** market (SkillHub / skills-sourced) | **21** | this plugin's own category |
| … with ≥ 1 star | 102 | the rest are unstarred |
| … with ≥ 100 stars | 9 | the head is very concentrated |

Creation dates cluster hard: **273 of 376 were created in August 2026**, 68 in
September, 28 in October. Whatever generated this ecosystem did it all at once.

## 3. The head

| Stars | Repository | What it is |
|---:|---|---|
| 6 229 | `dsh-market/dsh-market` | the plugin market inside DSH — browse, search, one-click install |
| 1 009 | `LivXue/dsh-plugin-shop` | plugin market, refreshed daily |
| 303 | `hikariming/dshfind` | DSH principles + plugin market + best practice |
| 278 | `imsai-sh/awesome-deepseek-harness-plugins` | plugin store — claims 11 000+ dsh plugins |
| 173 | `bradeGithub/DSH-Plugins-Marketplace` | in-GUI browse/install/update |
| 141 | `2BingLing/dsh-market` | 6 000+ plugins, five-axis scoring |
| 104 | `Sanqi-normal/dsh-webui-market-plugin` | community catalog browser |

A 6 229-star leader against 178 competitors means discovery, not implementation,
is the scarce resource here.

## 4. This plugin's actual category — 21 repositories

Filtered to DSH + skills + market. Sorted by stars:

```
  35★  Tencent/skillhub                          see §5 — the vendor ships one
  31★  weibaohui/skills-management               skill market: install/delete/detail API + UI
  29★  aa2246740/dsh-skillhub                    manages skills already on disk (not a market)
  27★  NanmiCoder/dsh-skills-hub                 browse, preview, install, remove
  11★  sulfide2085/dsh-skill-manager             unifies DSH/Codex/Claude skills, hot toggles
   9★  peiqi10086/dsh-skills-market              SkillHub mall + sidebar panel + dsh_skillhub_search
   6★  pn1024/dsh-skill-market                   SkillHub + ClawHub, sidebar entry, overlay panel
   6★  vonweller/dsh-skillhub                    browse skillhub.cn, install into ~/.dsh/skills
   1★  2026heshao/dsh-skill-mcp-board            MCP + skills + three markets, one-click install
   1★  montersy123/dsh-skill-market              browse/search/install SkillHub skills
   1★  gzsxy/dsh-plugin-skills-manager           skill console incl. bundled market
   0★  Aidea-cc/dsh-skill-hub                    SkillHub + ClawHub, sidebar + overlay
   0★  Asher191919/dsh-skills-hub                "a skill marketplace panel in the DSH web UI"
   0★  JACKWang19559/dsh-skill-hub               sidebar Skills panel for DSH desktop
   0★  JasperGuWP/dsh-plugin-market              browse/precheck/install/update plugins + skills
   0★  K1yomizu/dsh-skillhub                     this plugin
   0★  LeonDing1005/skillhub-dsh                 skill dashboard for DSH
   0★  Nuomc/dsh-skills-marketplace              browse, search, rate, install from GitHub
   0★  QQ-M/dsh-skill-market                     settings-page skill market from GitHub
   0★  rickwindman/dsh-destinywind-skillhub      manage local + discover other agents' skills
   0★  ringoOTK/dsh-skillhub-finder              (no description)
```

Several are near-identical to this one in shape **and** name — `peiqi10086/dsh-skills-market`
even ships the same model tool name, `dsh_skillhub_search`.

## 5. The upstream vendor already ships a plugin

`Tencent/skillhub` (35★) contains `dsh-plugin/` — **`@tencent/skillhub`, v0.2.16**,
MIT, published as part of the official SkillHub repository. Its README describes:

- search / browse by category over the public API
- clickable skill cards in the conversation stream, with detail pages
- AI score, verified publisher and safety markers, version history, TRACE evaluation
- install by zip to the local skills directory, list and uninstall
- a **plugin plaza in the sidebar footer** — the same slot this plugin uses
- in-conversation DSH plugin search with one-click install and restart
- installed/known tabs, meta cards (file count, size, mtime)
- self-update to the latest GitHub release
- bilingual UI

That is a superset of the brief this plugin was built from. It installs as:

```sh
dsh plugin --profile web add @tencent/skillhub
```

One caveat worth recording: **`@tencent/skillhub` returned 404 on the npm registry
when checked on 2026-10-12**, despite the README documenting that install path. The
GitHub source path (`github:Tencent/skillhub#path:dsh-plugin`) is the one that is
certainly live. The 404 may mean the package was unpublished or never released.

## 6. Name and registry collisions

| Identifier | Status |
|---|---|
| GitHub `K1yomizu/dsh-skillhub` | taken by this plugin — but **two others share the name**: `aa2246740/dsh-skillhub` (29★), `vonweller/dsh-skillhub` (6★) |
| npm `dsh-skillhub` | **free** |
| npm `dsh-skill-market` | **TAKEN** — v1.0.0, 2026-09-10, *"聚合 SkillHub + ClawHub 双源搜索技能"* |
| npm `dsh-skills-market` | free |
| npm `dsh-market` | free |

The npm finding is the interesting one: the plugin's **original** package name was
already registered by someone else building the same thing. The rename to
`dsh-skillhub` — made for naming consistency with the registry it talks to —
incidentally moved it off a taken name. Publishing under the old name would have
failed.

## 7. What this means for the project

Stated plainly, because the alternative is pretending:

1. **This is not a green field.** 21 repositories in the same category, 178 in the
   adjacent one, and a 6 229-star incumbent in the general case.
2. **The upstream vendor has already built the obvious thing** and given it away
   under MIT, including the same sidebar slot and a broader feature list.
3. **The differentiators that survive contact with that fact** are narrower than the
   original brief implied. What this plugin has that the survey did not find
   elsewhere:
   - the post-install read-back against DSH's own `parseSkillFile` (§DEVNOTES 6.5) —
     the registry validates nothing, so ~10% of skills install and are then dropped
     silently; this reports it instead of claiming success
   - a source-fallback chain that reports which source answered, rather than
     failing opaquely
   - per-file `sha256` verification against the upstream manifest
   - a host that bundles with zero third-party runtime dependencies
4. **The honest framing is now connector, not product.** Given the vendor's own
   plugin exists, the durable role for this code is as the skill-source layer the
   ecosystem still lacks a good version of — not as another market to compete for
   attention with 178 others.

None of this is a reason to delete the work. It is a reason to stop describing it as
filling a gap, and to describe it as what it is: one more entry in a crowded field,
with a small number of things it does more carefully.
