# DEVNOTES

Engineering record for `dsh-skillhub`: where every contract came from, what
the live upstream actually answers, which traps cost time, and what is and is not
verified.

Target DSH: **`0.2.0-rc.2`**. Facts checked against a full clone of the DSH source
tree at `0.2.1-alpha.2` (I will cite `packages/…` paths from it throughout) and
against the published `@deepseek-ai/*` packages for `0.2.0-rc.2`.

---

## 1. Sources of truth

Third-party implementations were read for ideas only. Every contract this plugin
implements is cited to official code, because the four reference repositories
disagree with each other in places and with the current framework in others.

### Official plugin-development guide

`packages/preset/agent-preset/skills/cordis-plugin-development/` — the guide DSH
itself ships to agents. Its `references/ui-plugin.md` and
`templates/decoration/` are the authority for the manifest shape, and this
plugin's `package.json` matches the template entry-for-entry:

- `exports`: `"."`, `"./client"`, `"./locale/*.json"`, `"./icon"`
- `files[]`: the bundle, the client bundle, `cordis.patch.yml`, `locale/*.json`, `icon.svg`
- `dsh.bundle.patch`, `dsh.client.{platform,immediately,inject}`
- the browser artifact is a lazy factory whose `id` equals the package name

`locale/*.json` needs exactly `meta.title` + `meta.description` for the Web UI's
plugin listing; icon is SVG ≤ 256 KiB in-package.

### Slot contracts

| slot | declared by | shape |
|------|-------------|-------|
| `sidebar.footer.action` | `packages/client/ui-sidebar/src/client/contract/slots.ts` | `{ kind: 'list'; scope: 'root'; owner: SidebarFooterActionOwnerProps }`, owner `= { wide: boolean }` |
| `shell.overlay` | `packages/client/ui-layout/src/client/index.ts` | `{ kind: 'list'; scope: 'root' }` — a seat inside the AppFrame root entry, no owner share, no session binding |

Both shapes were independently confirmed against the **published** declarations
in `@deepseek-ai/dsh-client-ui-renderer@0.2.0-rc.2/lib/types/client/registry.d.ts`,
whose `SlotMap` doc block states the intent for `shell.overlay` outright: it is
the supported surface for "a surface of your own that floats over the whole app",
additive, and **click-through until the occupant opts back into pointer events**.
That sentence is why `styles.ts` puts `pointer-events: none` on `.smk-layer` and
`auto` on `.smk-mask` / `.smk-panel` rather than relying on a z-index fight.

`order: -40` for the footer entry comes from the same source of truth read the
other way round: the host's Cordis Plugin row is at `order: 0` and expands its
popover upward, so a later order would be covered.

### Skill directories

`packages/skill/skill-filesystem/src/index.ts` defines the provider roots and
their ranks; `packages/skill/skill/src/index.ts` defines `isSkillName`
(`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`) and the invocation-policy frontmatter keys.
`local.ts` reproduces the rank table and the `.system` skip so the panel manages
exactly the directories DSH reads.

Frontmatter booleans are parsed for `true|yes|on|1` / `false|no|off|0`,
case-insensitively, and both surfaces default to **enabled** — which is why
enabling *removes* the key instead of writing `false`. `disable-model-invocation`
is the canonical key.

### Web route and tools

- `packages/host/webserver/src/index.ts` — `WebRoute { kind: 'exact' | 'prefix', path, handler }` and the `webServer` service.
- `packages/core/tools/src/schema.ts` — `defineTool` and `ParameterSchemaSpec`, where `required` is per-property (`{ type: 'string', required: true }`), not an array. `packages/boot/plugin-manager/src/tools.ts` is the worked example this plugin's tool follows.

---

## 2. SkillHub API — probe record

Reached over the network during development; every claim below was observed, not
inferred.

| request | observed |
|---------|----------|
| `GET /api/skills?page&pageSize&sortBy&order&keyword&category` | `{ code, message, data: { skills, total } }`, `code: 0` = success |
| `GET /api/v1/categories` | `{ count, items: [{ key, level, version, name, nameEn, sortOrder, active }] }` |
| `GET /api/v1/skills/<slug>/files?namespace&version` | `{ count, files: [{ path, sha256, size }], namespace, version }` |
| `GET /api/v1/skills/<slug>/file?path&namespace&version` | raw bytes, `302` to object storage (`fetch` follows) |
| `GET /api/v1/skills/<slug>?namespace` | `{ skill, latestVersion, namespace }` |

Confirmed working on both `https://api.skillhub.cn` (primary) and
`https://api.skillhub.tencent.com` (mirror) with the same paths and schema.
`sortBy` accepts `score | downloads | stars | updated_at`.

Four upstream findings drove real design decisions:

1. **No CORS headers on any endpoint.** The browser cannot call SkillHub at all,
   which is why every call is proxied by the Host half's `webServer` route rather
   than fetched from the panel.
2. **Omitting `version` silently serves the latest revision.** So a manifest
   fetched at one version and files fetched without it can mix revisions inside a
   single skill directory and then fail the manifest's own `sha256` check. This
   is why `fetchSkillFile` takes a mandatory `version` and why the install
   pipeline threads the manifest's version through every file request.
3. **`skill.overviewMd` is always empty** for the skills probed. A "detail"
   panel built on it would render blank, so the overview is instead the packaged
   `SKILL.md` body with its frontmatter stripped — the same file DSH loads at run
   time, and therefore the only honest source.
4. **The upstream `homepage` / `sourceUrl` fields point at the API host**, which
   answers `405` in a browser. The SPA's real route is
   `https://skillhub.cn/skills/<namespace>/<slug>`, so `skillPageUrl()`
   constructs that instead of trusting the field.

`pay-skill` is filtered out of the category table: it is a commercial tier marker,
not a subject.

Also probed and rejected as data sources: `clawhub.ai` and `dshfind.com`, whose
APIs return `404`.

### Why file-by-file instead of the zip endpoint

`/download` exists, but per-file `sha256` from the manifest is the only integrity
signal upsteam offers. Taking it means downloads can be verified individually,
and it avoids adding an unzip dependency to a plugin whose Host half otherwise
bundles with zero third-party runtime dependencies.

### Are SkillHub skills the same thing DSH reads? Measured, not assumed

Both ecosystems publish a `SKILL.md` with YAML frontmatter, which makes "the same"
an easy and wrong answer. `scripts/audit-compat.mjs` samples the live registry,
fetches each raw `SKILL.md` exactly the way the install pipeline would, and runs
DSH's own rules from `dsh-skill-filesystem@0.2.0-rc.2`'s `parseSkillFile` over the
result. Top 30 by downloads:

| check | result |
|---|---|
| loads cleanly in DSH | **27 / 30** |
| dropped by DSH | **3 / 30** |
| uses `disable-model-invocation` or `user-invocable` | **1 / 30** |
| uses `whenToUse` | 0 / 30 |
| uses `allowed-tools` (Claude-style; DSH ignores it) | 8 / 30 |

The contract DSH actually enforces, from the source:

- `name` and `description` are **required**; either missing and the file is
  ignored with a `logger.warn`.
- `name` must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`. **SkillHub does not enforce
  this**, and this is the entire failure class: all three drops were name
  grammar, not content — `Mysteel_PriceSearch`, `全国电子印章互认平台`,
  `Self-Improving + Proactive Agent`.
- the legacy camelCase aliases (`disableModelInvocation`, `modelInvocable`,
  `userInvocable`) are a **hard error**, not a fallback: `rejectLegacyInvocationKey`
  throws and the skill is dropped. No sample carried one, but it is the most
  costly possible mismatch, so the audit checks for it explicitly.
- `parseInvocationPolicy` defaults to `modelInvocable: true` and
  `userInvocable: true` when the keys are absent — which, per the table above, is
  the case for 29 of 30 registry skills.

Everything else is ignored rather than rejected: `version` (20/30), `author` (8),
`license` (8), `slug` (7), `displayName` (6), `homepage` (5), `agent_created` (3),
`xiaping_*`, `triggers`, `dependency`. None of it affects loading. The traffic is
one-way in that respect — DSH's optional `whenToUse` appears in none of them.

So the honest summary: **same file format, different contract.** A SkillHub skill
is a DSH skill about 90% of the time, and the ~10% that are not fail *silently* —
DSH logs a warning the model never sees, so an installed-but-invisible skill looks
exactly like one that was never installed. The plugin used to inherit that
silence; it no longer does. See §6.7.

Full per-skill record: [`docs/skillhub-dsh-compat.json`](./docs/skillhub-dsh-compat.json).

---

## 3. Traps that cost real time

Recorded because none of them fail loudly, and two of them produced errors in
files that had nothing to do with the cause.

### 3.1 `declare module` on a re-exporting package silently erases the module

**Symptom.** 13 errors, chief among them `Property 'effect' does not exist on type
'Context'` in `src/host/index.ts` and `src/client/index.tsx` — files that contain
no augmentation at all.

**Cause.** `declare module '@deepseek-ai/cordis' { interface Context { … } }` is
only read as an *augmentation* when the declaring file also imports the target
module. With no import of the target, TypeScript parses the block as a fresh
**ambient module declaration** and replaces the package's real declarations —
erasing `ctx.effect`, `ctx.inject`, and every other member the framework mixes in
through `declare module './context.ts'`.

**Isolated with four probes**, augmenting `Context` with a `foo` property and then
calling `ctx.effect()`:

| probe | augmenting file imports cordis? | result |
|-------|--------------------------------|--------|
| A | yes, in a `.ts` | passes — `foo` **and** `effect` both resolve |
| G | yes, in a `.ts`, split across two files | passes |
| D | no import at all, in a `.d.ts` | fails: `effect` gone, `foo` present |
| E | imports only `dsh-client-ui-slots` | fails |
| H | imports only `schemastery` | fails |

The rule the table encodes: **the declaring file must import the module it
augments.** Confirmation from the other direction — the official
`@deepseek-ai/dsh-host-webserver/lib/types/index.d.ts` augments `Context` for
`webServer` and imports `{ Context, Service }` on the line directly above the
augmentation block.

**Fix.** `src/client/slot-map.d.ts` carries an anchored, commented,
deliberately-referenced `import type { Context as CordisContext }`. The same rule
explains why `ctx.webServer` was missing: nothing imported
`@deepseek-ai/dsh-host-webserver`, so its `Context` merge was never in the
program. `src/host/index.ts` now imports `WebRoute` from it and types the route
literal with it — the import is load-bearing *and* the literal gets checked
against the framework's own route shape.

### 3.2 A missing peer dependency degrades a type to `any` behind `skipLibCheck`

**Symptom.** 14 × `TS7006: Parameter 'snapshot' implicitly has an 'any' type` on
every `useMarket(selector)` callback, plus the same for every callback nested
inside one, across `entry.tsx` and `panel.tsx`. The cause was three modules away.

**Cause.** `@deepseek-ai/dsh-client-store` is a required dependency of
`@deepseek-ai/dsh-client-ui-slots`, and `SnapshotSelectorHook` is re-exported from
it. The package was absent, so that re-export resolved to `any`; `skipLibCheck:
true` means TS does not report errors *inside* declaration files, so the broken
re-export stayed silent. `useMarket` was therefore `any`, and so was everything
downstream of it.

**Fix.** Install the peer. The lesson generalises: **a plugin's type errors can
originate in an uninstalled peer of a peer, and `skipLibCheck` will not tell
you.** When a type collapses to `any` for no visible reason, check what the
declaring package itself imports.

### 3.3 The client `slots` face no longer needs a hand-written shim

An earlier revision of this plugin hand-wrote a `SlotsService` interface because
`@deepseek-ai/dsh-client-ui-renderer@0.1.0-rc.8` did not ship its client types and
its `src/` is not published. Verified false for `0.2.0-rc.2`: the package now
publishes `lib/types/client/`, whose `index.d.ts` merges `slots: SlotRegistry` and
`uiRenderer` into `Context`, and `registry.d.ts` reuses `SlotCore['register']`
verbatim.

So the parallel interface was deleted. `slot-map.d.ts` now contains only the two
`SlotMap` entries (which genuinely are not reachable — they are declared by
`ui-sidebar` and `ui-layout`, neither a dependency here). Reusing the official
type also keeps the framework's four-share `ComposedProps` checking on the
`register` call sites; a hand-written signature would have checked nothing and
drifted.

### 3.4 esbuild's JS API takes `external` as literal strings only

`external: [/^node:/, /^@deepseek-ai\//]` throws `"external" must be an array of
strings`. The `/regex/` form is a CLI convenience. `scripts/build.mjs` now uses a
one-rule resolver plugin to keep the whole `@deepseek-ai/*` scope external, with
`platform: 'node'` handling Node builtins. The `--dump-config` output below
confirms the externals are correct: the Host bundle imports only `node:*` and
`@deepseek-ai/*`.

---

### 3.5 A plugin must not declare dsh's own packages as `dependencies`

The official guide states the rule outright (`cordis-plugin-development/SKILL.md`):

> Packages shipped with dsh resolve from the dsh installation, so the bundle
> declares no dependencies on them.

The mechanism is worth knowing, because it also explains the failure mode.
`@deepseek-ai/dsh-app-boot/lib/worker/profile-resolution-bootstrap.js` is a module
resolution interception layer. It pulls Node's own loaders out through
`node-addon-require-builtin`, then **replaces `Module._resolveFilename` and the ESM
loader's `resolveSync`** so that bare-package requests made *from inside a profile*
are routed by DSH instead of by Node's directory walk. `routeScoped` decides in two
steps:

1. Scan only the profile's own `node_modules` (`searchPath.startsWith(layer.localPrefix)`)
   and use a candidate found there — **profile-local wins**.
2. Otherwise, if the requested name is in the installation's package table, take the
   `interception` route and re-resolve the request as if it came from the
   installation (`route.entry.declarer`), so dsh's own packages come from dsh.

Step 1 is the trap. This plugin originally listed five `@deepseek-ai/*` packages
under `dependencies` — leftovers from the smoke test, which needed them importable.
pnpm therefore installed **12** packages into the profile's `node_modules`, and every
one of them shadows the installation's copy at step 1. That is not theoretical:
`schemastery` was among them, so `Config` would have been validated by a
schema object from this checkout's copy rather than the installation's. Cordis
consumes it through `Config["~standard"].validate(config)` (Standard Schema, not
`instanceof`), so it happens to survive — but the general case does not.

Both reference points agree with the rule: the official `decoration` template's
`package.json` has **no dependency fields at all**, and so does
`dsh-sidebar-footer-stack`, whose Host half imports nothing but `node:fs/promises`,
`node:os` and `node:path`.

The fix is to declare none. `@deepseek-ai/dsh-tools` and `@deepseek-ai/schemastery`
stay externals in the Host bundle (they resolve from the installation at load time),
and packages needed only to run `scripts/smoke-host.mjs` belong in `devDependencies`,
which pnpm does not install into a profile.

Corroborating detail from the same file: `DSH_PROFILE_DIR`'s `node_modules` is
documented as holding "only profile-installed bundles" — which is exactly what a
correct profile looks like, and what the repaired one now is (one entry).

### 3.6 Verifying resolution from outside a booted profile

A plain `node -e "import('dsh-skillhub')"` run from the profile directory
**fails** with `ERR_MODULE_NOT_FOUND: Cannot find package '@deepseek-ai/schemastery'`,
even when the plugin is installed and the profile is correct. That is expected, not a
defect: the interception layer is installed only inside a Harness-owned Worker during
profile boot (`worker-bootstrap.js` reads its registration from worker environment
data). Outside a boot there is no routing, so Node's own resolution runs and a plugin
that legitimately declares no dependencies cannot resolve dsh's packages.

Do not "fix" this by adding the dependency back — see §3.5.

---

## 4. Environment findings (not plugin defects)

### 4.1 pnpm `link:` protocol

`pnpm 12.5.1` writes a `link:` dependency into `package.json` and the lockfile but
**never creates `node_modules/<pkg>`**, so DSH's post-install reconcile step fails
with `cannot resolve profile bundle "dsh-skillhub"`.

Reproduced in an empty scratch directory, so it is not a DSH or plugin issue, and
narrowed to the protocol: registry dependencies install fine, and `file:` installs
fine. `pnpm` itself reports `12.5.1 → 12.11.2` available, so this is a
since-fixed version, not a design constraint. Use an explicit `file:` prefix (see
README), or upgrade pnpm.

### 4.2 DSH's published `0.2.0-rc.2` tree needs pnpm, not npm

Installing `@deepseek-ai/dsh@0.2.0-rc.2` with `npm --legacy-peer-deps` yields a
tree where **34 plugins fail to import**, each missing a sibling contract package:
`dsh-jobs-local` → `@deepseek-ai/dsh-jobs`, `dsh-shell-env` → `@deepseek-ai/dsh-shell`,
`dsh-sandbox-local` → `@deepseek-ai/dsh-sandbox`, and so on. These are
`peerDependencies` by design (`*-local` implements a base contract package), and
`--legacy-peer-deps` skips exactly those. Use `pnpm`, which auto-installs them.

A related gap: `@deepseek-ai/dsh-app-boot` peer-depends on
`@deepseek-ai/cordis-plugin-group@~1.0.4`, but pnpm's `workspace:~` rewrite
publishes a request for a `0.2.x` version of that package that does not exist
(only `1.0.x` is published). The `~1.0.4` line *is* available and satisfies the
real requirement; installing it explicitly is what makes `dsh --version` run at
all.

**The npm tree is repairable, and that is what unblocked §6.6.** The failure list
names its own cure: every `failed to import` entry carries the exact package it
could not resolve. Collecting those from the startup report yields 19 names, all
published at `0.2.0-rc.2`:

```
@deepseek-ai/dsh-{anonymous-user-id,attachment,compaction,deepseek-account,fs,jobs,
llm-deepseek,output-retention,ptc-runtime,sandbox,session-persistence,session-query,
session-telemetry,session-title-llm,shell,spill,subagent-in-process-driver,
util-time,workflow}
```

Installing them explicitly at the same version fixes the tree without touching
pnpm, and `dsh --profile web` then boots and serves. The general rule: for a
`--legacy-peer-deps` tree, the missing-peers set is discoverable from the error
output, and pinning it by hand is equivalent to what pnpm would have done.

### 4.3 A green `tsc` proves less than it looks like

`typescript@7.0.2` with `skipLibCheck: true` will not report a declaration file
that imports a package which is not installed (§3.2). Both of the silent failures
in this project were of that shape. The mitigation used here is not a compiler
flag but assertions in the build: `scripts/build.mjs` fails the build if the
artifacts lack the factory banner, the loader id, the tool name, or if the
manifest omits `lib/` or `cordis.patch.yml`.

---

## 5. Design decisions worth stating

**This is not a re-skin of anything already in the box.** DSH `0.2.0-rc.2` ships
no marketplace: `@deepseek-ai/dsh-client-ui-skill`, `dsh-skill`,
`dsh-skill-filesystem` and `dsh-tool-skill` exist, but no client package contains
the string `market`. What DSH *does* ship is `~/.dsh/skills/findskills`, a
model-driven skill installer that walks GitHub (`anthropics/skills`,
`vercel-labs/agent-skills`, `addyosmani/agent-skills`, …) and the GitHub API. So
the two paths share a goal and share nothing else:

| | shipped `findskills` | this plugin |
|---|---|---|
| driven by | the model, through shell commands | the user, through a panel |
| source | GitHub repositories + the GitHub API | SkillHub (`api.skillhub.cn`), mirrored |
| installs into | a DSH skill root, hand-written | the two `.agents` roots, staged + hashed |
| manages | nothing after the fact | invocation flags, delete, project→user promote |
| in-session | yes, by definition | `dsh_skillhub_search`, read-only |

The overlap is real and worth naming: DSH can already install skills without this
plugin. What is new is the *surface* — a browsable registry that is not GitHub, a
one-click path into DSH's own roots, and management of what landed there.

**A survey on 2026-10-12 corrected the assumption behind that paragraph.**
[`docs/landscape.md`](./docs/landscape.md) searched GitHub through 11 queries and
merged the results: **376 DSH-related repositories, 199 of them marketplace-shaped,
178 of those plugin markets, and 21 in this exact skill-market category** — against
a 6 229-star incumbent in the general case. Three of the 21 are near-identical in
shape *and* name; `peiqi10086/dsh-skills-market` even ships the same model tool
name, `dsh_skillhub_search`. This is not an empty slot.

Two findings from that survey matter more than the counts:

1. **The registry's own vendor ships a DSH plugin.** `Tencent/skillhub` (35★)
   contains `dsh-plugin/` — `@tencent/skillhub` v0.2.16, MIT — whose README
   describes conversation-stream cards, detail pages with AI scores and TRACE
   evaluation, zip install/uninstall, *a plugin plaza in the sidebar footer* (this
   plugin's slot), in-conversation plugin search with one-click install, meta cards,
   self-update to the latest release, and a bilingual UI. That is a superset of the
   brief this plugin was built from. Worth recording: the documented npm install
   path returned **404** when checked, so the GitHub source path is the one that is
   certainly live.
2. **The original package name was already taken on npm.** `dsh-skill-market`
   resolves to a published v1.0.0 (2026-09-10) described as *"聚合 SkillHub +
   ClawHub 双源搜索技能"* — someone else's implementation of the same idea, under
   the name this plugin used before the rename. `dsh-skillhub` is free. Publishing
   under the old name would have failed.

The honest framing after that survey is **connector, not product**: with the
vendor's own plugin in the field, the durable role for this code is the skill-source
layer — the read-back validation of §6.7, the reported fallback chain, per-file
hash verification, zero-dependency host — rather than a 179th market competing for
attention. That is a smaller claim than the original brief, and a truer one.

**The registry is SkillHub's, not ours.** The panel is a view over
`api.skillhub.cn`, the same marketplace this machine's WorkBuddy environment
already draws from — `~/.workbuddy/skills/find-skills__skillhub/` carries a
`_skillhub_meta.json` reading `source: skillhub`,
`canonicalName: @clawhub_root/find-skills`. Pointing at it was the brief ("prefer
SkillHub, fall back automatically"), and the namespace slugs the panel shows
(`@clawhub_root/…`, `@indiv-…/…`, `@org-…/…`, `@user_…/…`) are that registry's own.
Nothing is scraped and nothing is mirrored locally: `src/shared/skillhub.ts` maps
their JSON onto our wire types and the panel renders its own rows.

**Package identity is `dsh-skillhub`; the panel label is still Skill Market.** The
package, the repo, `cordis.patch.yml`'s row id (`skill-hub`), the client module id
and the route prefix (`/plugins/dsh-skillhub/api`) all follow the registry the
plugin talks to. The user-facing label stays `技能市场` / *Skill Market*, because
that is what the surface is — a marketplace UI, whose backed registry happens to
be called SkillHub. Renaming the label to match would be naming the shop after its
supplier. The split is deliberate; this paragraph exists so the next reader does
not read it as an unfinished rename.

**Already-installed entries are DSH's, not ours.** The installed tab reads the same
four roots DSH reads (`local.ts`), so it shows real files on disk — in the §6.6
capture that is `~/.dsh/skills/findskills`, rank 400 `user-dsh`, which the plugin
did not put there and cannot write to. The `内置/只读` chip is the taxonomy being
honest, not a label invented for a screenshot.

**Fallback is a three-step chain, and it is reported.** `skillhub` →
`skillhub-mirror` → locally installed skills. Every attempt is recorded in
`MarketPage.attempts` and surfaced in the panel, so degradation is visible rather
than silent. A remote failure never throws at the call site.

**The install pipeline never mixes revisions.** One manifest fetch, one host
reused for every file (so a single install cannot assemble files from two
revisions), per-file `sha256`, staged-then-renamed writes.

**Read-only surfaces are read-only.** The `.dsh` roots are shown with
`manageable: false`; enabling removes the frontmatter key instead of writing
`false`; the model tool cannot install anything.

**Only `webServer` gates activation.** `tools` is attached through a deferred
`ctx.inject(['tools'])` rather than a hard `inject`, so a profile without the
tools service still gets a working panel instead of a plugin that fails to
activate. `inject` is a capability boundary in Cordis — an undeclared service is
refused by the proxy — so declaring less than the plugin can use is what makes
this possible.

**No third-party runtime dependencies in the Host half.** The `SkillHub` client
is a fetch-injected pure module shared by both halves; the browser half talks
only to the Host's own route. This is also why the frontmatter parser is
hand-written (the grammar needed is a flat `key: value` subset) rather than
pulling in a YAML library.

---

## 6. Verification record

Environment: Node `22.22.2`, `typescript@7.0.2`, `esbuild@0.28.2`, `pnpm@12.5.1`,
`@deepseek-ai/dsh@0.2.0-rc.2`.

### 6.1 Static and build

| step | command | result |
|------|---------|--------|
| type check | `npx tsc --noEmit` | **0 errors**, exit 0 |
| host build | `npm run build` | `lib/index.js` — 8 inputs, 42 215 B |
| client build | `npm run build` | `lib/client.js` — 54 828 B |
| manifest + patch assertions | `npm run build` | passed |
| contract rules, 28 cases | `npm test` | **28/28 passed** |
| install read-back, live | `npm run test:readback` | **9/9 passed** — §6.7 |

`npm run verify:live` chains all of the above plus §6.2; exit 0.

### 6.2 Host half, live

`scripts/smoke-host.mjs` loads the **built** `lib/index.js` into a real Cordis
context, mounts its route on a stand-in `webServer` (the plugin only ever calls
`register({ kind, path, handler })` on it), and drives the routes over loopback
against the **live** SkillHub API.

`npm run smoke` → **25/25 checks passed**, exit 0. The parts that matter:

| check | observed |
|-------|----------|
| `POST /search` | `ok:true`, `source:"skillhub"`, attempts recorded |
| first row | `Excel (@kunlungrowth/excel)` |
| row `pageUrl` | `https://skillhub.cn/skills/kunlungrowth/excel` — the SPA route, not the API host |
| `POST /categories` | live table, `pay-skill` absent |
| `POST /installed` | roots resolved; `manageable` flags reported |
| `POST /detail` | `Excel v1.0.2`, `readme` 1300 chars of frontmatter-stripped SKILL.md — the version pin and the per-file fetch both worked |
| guards | GET → `method-not-allowed`; foreign `Origin` → `forbidden-origin`; `text/plain` → `unsupported-media-type`; unknown path → `not-found`; `level: nonsense` → rejected by name; `slug: ../../etc` → rejected |

**This test paid for itself immediately.** First run: 19/22, with `/search`
degrading to the `local` source and reporting **no** attempts — meaning both
upstreams had failed before the fallback chain could even record a try. Cause: the
route aborted its own upstream work.

```js
req.on('close', () => { controller.abort(…) })   // wrong
```

`req`'s `'close'` also fires when the request has merely been fully *consumed*,
not only when the client went away, so every upstream call slower than the body
read was cancelled by us. Fixed to watch `res` and test `writableEnded`, which
distinguishes "we already answered" from "the client really left":

```js
res.on('close', () => {
  if (!res.writableEnded) controller.abort(…)   // client gone mid-flight
})
```

Nothing about the type checker, the build, or `--dump-config` could have caught
this. It is the standing argument for the smoke test existing.

### 6.3 Profile install and composition

| step | command | result |
|------|---------|--------|
| install | `dsh plugin --profile web add "file:…"` | linked, exit 0 |
| bundle registration | `~/.dsh/profiles/web/package.json` | `dsh.profile.bundles` gained `dsh-skillhub` |
| installed artifact | `~/.dsh/profiles/web/node_modules/dsh-skillhub` | carries the final `lib/` (verified: contains the `writableEnded` fix) plus `README.md`, `DEVNOTES.md`, `LICENSE`, `locale/`, `icon.svg`, `cordis.patch.yml` — i.e. `files[]` ships what it claims |
| composition | `dsh --profile web --dump-config` | exit 0, 1262 lines, last layer `# == dsh-skillhub` → `- id: skill-hub / name: dsh-skillhub` |

The `--dump-config` result is the end-to-end proof of the packaging contract: the
plugin was discovered as a bundle, its `dsh.bundle.patch` was found and loaded, and
its insert row landed in the composed tree **last** — after `@deepseek-ai/dsh-base`
and `@deepseek-ai/dsh-web-app` — exactly the documented layering order
(`profile.bundles` → profile `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` →
`--patch`).

The install was run twice (`remove` → `add`) — first because pnpm's `link:` bug
(§4.1) left a broken profile, then again to confirm the final build installs
cleanly. The second run also surfaced a behaviour worth knowing: the installer's
`reconcile` step only registers bundles among dependencies that are **new in this
run**, so re-running `add` with the dependency already present is a no-op and will
not repair a missing registration. `remove` first.

### 6.4 The reserved `desktop` profile — the real target

DSH Desktop boots `--profile desktop` (the string is in its `app.asar`), so this is
the profile an actual user runs; the `web` profile above was only ever a test bed.

| step | command | result |
|------|---------|--------|
| refusal | `dsh plugin --profile desktop add …` | exit 1 — `profile "desktop" is managed exclusively by the Electron application` |
| sanctioned path | `node scripts/desktop-profile.mjs add "file:…"` | exit 0, `+ dsh-skillhub`, 734 ms |
| first install (before §3.5 was fixed) | — | pnpm added **15** packages: the plugin plus 12 shadowing `@deepseek-ai/*` copies and their transitive deps |
| repair | `… remove dsh-skillhub` then `… add "file:…"` | `Packages: -15` then `Packages: +1` |
| final profile | `~/.dsh/profiles/desktop/node_modules` | **one** entry, `dsh-skillhub` — matching "holds only profile-installed bundles" |
| bundle registration | `~/.dsh/profiles/desktop/package.json` | `bundles` is now `[…, dsh-experimental-schedule-bundle, dsh-skillhub]` |
| composition | `node scripts/dump-desktop.mjs` | exit 0, **1294** lines, last layer `# == dsh-skillhub` → `- id: skill-hub / name: dsh-skillhub` |
| user layer intact | same dump | the profile's own `cordis.patch.yml` overrides (`agent-default-model` → `deepseek-flash`, `ui-settings-account`, `ui-chat`, `ui-settings`) all still appear |

The composition check cannot go through `dsh --dump-config`: `rejectElectronProfile`
guards the boot action unconditionally, and `manageDesktopProfile` only unbinds the
`plugin` subcommand. The composer itself (`runDumpConfig`) takes no such stance, which
is what `scripts/dump-desktop.mjs` calls. Running it from an installation also proves
the two-anchor resolution order — in-box bundles resolve from the installation
(`INSTALL_ANCHOR`), `dsh-skillhub` from the profile.

A backup of the profile's original `package.json`, `cordis.patch.yml`, `cordis.yml`
and `pnpm-workspace.yaml` was taken first and is at
`~/.dsh/profiles/desktop/.backup-manual/`.

### 6.5 What is not verified

- **The model tool in a real conversation.** Its registration is type-checked
  against `defineTool` and its parameter schema follows the official example, but
  it has not been called by a model.
- **Icon rendering constraints** (≤ 256 KiB, accepted formats) were followed but
  not validated by the DSH UI.
- **The panel inside the packaged desktop application.** §6.6 exercises the same
  client bundle and the same slots in a real renderer, but through `dsh --profile
  web` in headless Chromium rather than through the Electron shell. What remains
  unproven there is the Electron-specific carrier, not the plugin.
- **Interaction flows beyond the four photographed.** Install, uninstall and promote
  are wired to the same handlers the Host half exposes, and those handlers are
  covered by §6.2 against the real upstream, but the buttons themselves were not
  clicked in the renderer — doing so would write into the user's real skill
  directories.

Everything that §6.5 previously listed as unknown — the rendered React tree, the
CSS against real theme tokens, and the client bundle being required by a real
`__ModuleLoader__` — is now covered by §6.6.

### 6.6 The rendered panel

The last unproven claim was that `lib/client.js` actually renders. It does. The
session, captured by `scripts/capture-ui.mjs` into `docs/preview/`:

```
dsh --profile web --no-open
dsh web: http://127.0.0.1:3080/?token=<token>       # token is per-boot

msedge.exe --headless=new --remote-debugging-port=9222 --user-data-dir=<tmp>
node scripts/capture-ui.mjs --url "http://127.0.0.1:3080/?token=<token>"
```

What the run establishes, beyond the pixels:

| Claim | Evidence |
|---|---|
| the client bundle loads through the page's own loader | `.smk-entry` exists in the DOM; no `Runtime.exceptionThrown` during boot |
| the sidebar slot composes as a contribution, not a replacement | the entry sits in the footer beside 插件 and 设置, with the host's own rows intact |
| the overlay slot is click-through | the shell behind the panel stays visible and the app is not dimmed by a full-bleed surface |
| the Host route answers a real browser | the market tab reports **共 191990 个技能** through `/plugins/dsh-skillhub/api/search` |
| the source chip reports the source that served it | the chip reads **SkillHub 主源**, matching the §2 probe record |
| the frontmatter parser reads real skills | the installed tab resolves the workspace's `findskills` SKILL.md and flags its root 内置/只读 |
| SKILL.md is stripped, not shown raw | the detail view opens with `# 编程专家.Skill — …`; no `---` frontmatter block above it |
| i18n resolves | every string in the four shots is Chinese; no key leaked through untranslated |

Two things this pass changed in the notes above: §4.2's claim that *"no dsh tree on
this machine boots far enough to serve HTTP"* is now false — the npm tree is
repairable, and §4.2 records the 19 packages that repair it. And §6.3's profile
install is no longer only a configuration-tree claim: the same plugin that was
verified as a composed tree is the one that rendered here.

### 6.7 The post-install read-back

The gap §6.5 used to carry — *"installed skills are not re-validated the way DSH
will read them"* — is closed. `installFromMarket` now re-parses the landed
`SKILL.md` with DSH's own rules before returning, and reports any violation in
`InstallResult.warnings`; the panel renders it as a warning notice instead of a
success one.

**Rule provenance.** `src/host/contract.ts` transcribes the failure branches of
`parseSkillFile` in `@deepseek-ai/dsh-skill-filesystem/lib/index.js`, in the same
order, because upstream short-circuits — the first failing rule is the one that
explains the drop:

| # | rule | upstream site |
|---|------|---------------|
| 1 | block opens with `---` and is closed | *missing YAML frontmatter* |
| 2 | `name` and `description` both non-empty strings | *frontmatter requires name and description* |
| 3 | `name` matches `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` | *invalid skill name* |
| 4 | no `disableModelInvocation` / `modelInvocable` / `userInvocable` | `rejectLegacyInvocationKey` |
| 5 | invocation switches coerce as booleans | `frontmatterBoolean` throws `TypeError` |

Rule 4 deserves the emphasis it gets: the camel-case keys are **rejected
outright**, not aliased. A skill written against an older convention is dropped,
so a read-back that merely normalised the names would hide a real failure.

**Evidence.**

| step | command | result |
|------|---------|--------|
| rule transcription, 28 cases | `npm test` | **28/28 passed** |
| real install, failing + passing fixture | `npm run test:readback` | **9/9 passed** |

The unit cases include the three named failures from §2's audit verbatim —
`Mysteel_PriceSearch`, `全国电子印章互认平台`, `Self-Improving + Proactive Agent`
— plus the ordering cases that prove rule 3 is blamed before rule 4 when a file
breaks both.

The read-back test is the one that matters, because it drives the real pipeline
against the live registry:

```
-- a skill DSH will drop --
     path <tmp>/skills/self-improving
     v1.2.16, 15 files
ok   read-back produced exactly one warning
ok   warning blamed on the name grammar
ok   warning carries the offending name
     skill file ignored: invalid skill name "Self-Improving + Proactive Agent"
ok   on-disk SKILL.md carries the name the warning names

-- a skill DSH will load --
     path <tmp>/skills/anti-fraud
     v1.0.11, 19 files
ok   clean skill produced no warnings
```

Both fixtures install into a throwaway tree (`DSH_AGENTS_HOME` pointed at a temp
directory) so the pass never writes into the real `~/.agents/skills`. The second
half of that assertion is the one a naive implementation would miss: a validator
that always fired would satisfy the first fixture and fail the second.

**What is still not checked: malformed YAML.** Upstream parses the block with a
real YAML parser, so it can also reject a block that is syntactically invalid —
`description: a: b`, an unclosed flow sequence. The Host half bundles with zero
third-party runtime dependencies and reads frontmatter by hand, so it cannot
make that judgement and reports such a file as clean. This is a real residual
gap, left open deliberately rather than papered over: the alternative is a YAML
parser in the Host bundle, which this plugin's packaging rules rule out.

**Two deliberate non-behaviours.** The plugin does not rewrite the author's
frontmatter to make a skill load (that is editing someone else's metadata), and
it does not delete or refuse the install (the files are legitimately what the
registry serves, and the user may want them). It reports, and leaves the
decision to the person looking at the panel.

---

## 7. Reproducing §6.3

The profile half needs a `dsh` CLI, which may not be on `PATH`. On this machine
none was, so one was installed into a scratch directory:

```bash
mkdir /tmp/dsh-cli && cd /tmp/dsh-cli && npm init -y
# --legacy-peer-deps is required: the published tree has peer conflicts
npm install --legacy-peer-deps @deepseek-ai/dsh@0.2.0-rc.2
```

`dsh --version` then still fails with
`Cannot find package '@deepseek-ai/cordis-plugin-group'`. That package is a
`peerDependency` whose published version is rewritten from `workspace:~` to an
unpublished `0.2.x`; the real requirement is `~1.0.4`, which does exist:

```bash
npm install --legacy-peer-deps @deepseek-ai/cordis-plugin-group@1.0.4
./node_modules/.bin/dsh --version        # -> 0.2.0-rc.2
```

Then the install and composition checks:

```bash
cd /path/to/dsh-skillhub && npm run build

DSH=/tmp/dsh-cli/node_modules/.bin/dsh
$DSH plugin --profile web add "file:$PWD"
# remove first if re-running — reconcile only registers newly added deps:
#   $DSH plugin --profile web remove dsh-skillhub

$DSH --profile web --dump-config | tail -3
#   # == dsh-skillhub
#   - id: skill-hub
#   name: dsh-skillhub
```

Use the `file:` prefix. A bare path makes pnpm choose `link:`, and pnpm `12.5.1`
never materialises that entry (§4.1).

**Booting the full profile from an npm-installed CLI** needs one extra step:
`npm --legacy-peer-deps` skips the peer dependencies the tree needs, leaving 34
base plugins unable to import (§4.2). Rather than switching to pnpm — whose
`12.5.1` on this machine never writes top-level `node_modules` — install the
missing siblings explicitly. The error output names them:

```bash
$DSH --profile web 2>&1 | tail -40
#   jobs / Package: @deepseek-ai/dsh-jobs-local / failed to import
#   ... 33 more
```

Every failure line corresponds to one `ERR_MODULE_NOT_FOUND` in the startup
report under `$DSH_HOME/logs/`; collecting the targets gives 19 packages (§4.2):

```bash
npm install --legacy-peer-deps @deepseek-ai/dsh-jobs@0.2.0-rc.2 \
  @deepseek-ai/dsh-attachment@0.2.0-rc.2 # …and the other 17
```

`dsh --profile web --no-open` then boots and serves, which is what §6.6 drives.



