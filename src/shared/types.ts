/**
 * Shared wire contracts between the Host half (Node) and the Client half
 * (browser). Both halves import this module; nothing here touches Node or DOM
 * globals, so the same file bundles into both artifacts.
 */

/** Skill directory level a skill is installed at. */
export type SkillLevel = 'project' | 'user'

/** Only these two levels are writable; the other roots we surface are read-only. */
export const WRITABLE_LEVELS: readonly SkillLevel[] = ['project', 'user']

/** Which backing source actually produced a market listing. */
export type MarketSourceId = 'skillhub' | 'skillhub-mirror' | 'local'

/** One market row, normalised across sources. */
export interface MarketItem {
  /** Skill slug, unique within a namespace. */
  slug: string
  /** Publisher namespace handle (empty for locally-derived rows). */
  namespace: string
  /** Display name. */
  name: string
  /** Short description (Chinese preferred when available). */
  description: string
  /** Primary category key. */
  category: string
  downloads: number
  installs: number
  stars: number
  /** Icon URL, or empty string when the source provides none. */
  iconUrl: string
  /** Public skill page, or empty string when unknown. */
  pageUrl: string
  /** Set when the row came from the locally-installed fallback. */
  local?: InstalledSkill
}

/** One page of market results plus which source served it. */
export interface MarketPage {
  source: MarketSourceId
  /** True when the primary source failed and a fallback answered. */
  degraded: boolean
  /** Per-source attempt log, newest last; surfaced in the panel. */
  attempts: SourceAttempt[]
  total: number
  page: number
  pageSize: number
  items: MarketItem[]
}

/** Outcome of one source attempt in the fallback chain. */
export interface SourceAttempt {
  source: MarketSourceId
  ok: boolean
  /** Present only when `ok` is false. */
  error?: string
}

/** A category row from SkillHub, or the built-in copy when offline. */
export interface MarketCategory {
  key: string
  name: string
}

/**
 * Read-only skill record backing the panel's detail view.
 *
 * `readme` is the packaged SKILL.md body with its YAML frontmatter stripped:
 * the upstream `skill.overviewMd` field is empty for every skill probed, so the
 * file DSH actually loads is the only honest source for an overview.
 */
export interface SkillDetail {
  slug: string
  namespace: string
  name: string
  summary: string
  /** SKILL.md body of the skill, frontmatter stripped. */
  readme: string
  version: string
  category: string
  tags: string[]
  pageUrl: string
}

/** One locally installed skill, as the management view needs it. */
export interface InstalledSkill {
  level: SkillLevel
  /**
   * Whether this plugin may modify the skill. Skills under the DSH-owned
   * `~/.dsh/skills` / `<project>/.dsh/skills` roots are surfaced read-only.
   */
  manageable: boolean
  /** Root-kind label from the DSH skill provider taxonomy. */
  source: string
  /** Directory name on disk (the skill's folder). */
  dir: string
  /** Name from `SKILL.md` frontmatter (falls back to the directory name). */
  name: string
  description: string
  /** Whether the model-facing surface is enabled (`disable-model-invocation`). */
  modelInvocable: boolean
  /** Whether the human-facing `/name` surface is enabled (`user-invocable`). */
  userInvocable: boolean
}

/** Request body of `POST /search`. */
export interface SearchRequest {
  keyword?: string
  category?: string
  sortBy?: MarketSort
  page?: number
  pageSize?: number
}

/** Sort keys SkillHub accepts (verified against the live API). */
export type MarketSort = 'score' | 'downloads' | 'stars' | 'updated_at'

export const MARKET_SORTS: readonly MarketSort[] = ['score', 'downloads', 'stars', 'updated_at']

/** Request body shared by every cwd-sensitive endpoint. */
export interface CwdRequest {
  cwd?: string
}

/** Request body of `POST /install`. */
export interface InstallRequest extends CwdRequest {
  slug: string
  namespace: string
  level: SkillLevel
  /** Pin an exact version; omit for latest. */
  version?: string
}

/** Request body of `POST /uninstall`. */
export interface UninstallRequest extends CwdRequest {
  name: string
  level: SkillLevel
}

/** Request body of `POST /promote` (project level -> user level). */
export interface PromoteRequest extends CwdRequest {
  name: string
}

/** Request body of `POST /set-invocation`. */
export interface SetInvocationRequest extends CwdRequest {
  name: string
  level: SkillLevel
  modelInvocable?: boolean
  userInvocable?: boolean
}

/**
 * Why DSH would silently refuse to load a SKILL.md that was just installed.
 *
 * These mirror the failure branches of DSH's own `parseSkillFile`
 * (`@deepseek-ai/dsh-skill-filesystem/src/index.ts`). Every one of them ends in
 * a bare `ctx.logger.warn(...)` followed by `return` — the directory stays on
 * disk and looks installed, but no model ever sees it.
 */
export type SkillContractIssueCode =
  /** No opening `---`, or a block that is never closed. */
  | 'missing-frontmatter'
  /** `name` and/or `description` absent, empty, or not a string. */
  | 'missing-name-or-description'
  /** `name` present but not kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). */
  | 'invalid-name'
  /** Camel-case invocation keys, which DSH rejects outright rather than aliasing. */
  | 'legacy-invocation-key'
  /** An invocation switch whose value `frontmatterBoolean` cannot coerce. */
  | 'invalid-invocation-boolean'
  /**
   * The plugin could not re-read what it just wrote.
   *
   * Not one of DSH's own rules — this is the read-back failing to run at all.
   * Kept as a distinct code so a diagnostic is never mistaken for a verdict
   * about the skill, and a clean-looking skill is never silently passed.
   */
  | 'unreadable'

/** One contract violation, as the post-install read-back reports it. */
export interface SkillContractIssue {
  code: SkillContractIssueCode
  /** The offending value, when the rule is about a single one. */
  detail?: string
  /** What to write instead, when the rule has one canonical replacement. */
  hint?: string
  /**
   * English fallback wording, following upstream's own log text. The panel
   * prefers a localized sentence built from `code` + `detail` + `hint`; this is
   * only rendered when a code has no translation.
   */
  message: string
}

/** Install outcome, reported with the files actually written. */
export interface InstallResult {
  path: string
  level: SkillLevel
  /** Version actually served by the upstream manifest. */
  version: string
  fileCount: number
  /**
   * Read-back findings, empty when the skill will actually load.
   *
   * An install can succeed and still be unusable, so "wrote 12 files" is not on
   * its own an honest success signal. Upstream `findskills` treats this
   * read-back as mandatory for exactly that reason.
   */
  warnings: SkillContractIssue[]
}

/* ------------------------------------------------------------------ */
/* Route payloads                                                      */
/*                                                                     */
/* One named type per successful route body. Handlers used to be typed */
/* against the bare `object`, which silently rejected every property  */
/* they actually returned.                                            */
/* ------------------------------------------------------------------ */

/** `POST /search` — one market page, naming the source that served it. */
export type SearchPayload = MarketPage

/** `POST /categories` — the category table, live or built-in. */
export interface CategoriesPayload {
  categories: MarketCategory[]
  /** True when both hosts failed and the built-in table answered. */
  degraded: boolean
}

/** `POST /installed` — every installed skill plus the roots it was read from. */
export interface InstalledPayload {
  skills: InstalledSkill[]
  /** Project-level skills directory for the requested cwd (read-only root). */
  projectDir: string
  /** User-level skills directory (writable root). */
  userDir: string
}

/** `POST /install` — where the skill landed and what was written. */
export type InstallPayload = InstallResult

/** `POST /promote` — the skill's path after the project -> user move. */
export interface PromotePayload {
  path: string
}

/** `POST /detail` — the detail record plus the host that answered. */
export interface DetailPayload {
  detail: SkillDetail
  source: MarketSourceId
}

/** Uniform JSON envelope. Errors never throw across the HTTP boundary. */
export type ApiResponse<T> = ({ ok: true } & T) | { ok: false; error: string; kind?: string }
