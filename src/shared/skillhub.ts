/**
 * SkillHub data layer — fetch-injected pure functions, shared by both halves.
 *
 * Contract source of truth: the live `api.skillhub.cn` API, as documented in
 * the reference implementation `montersy123/dsh-skill-market`'s
 * `docs/skillhub-api.md` and re-verified against the endpoint from this repo
 * (see DEVNOTES for the probe transcript).
 *
 *   GET /api/skills?page&pageSize&sortBy&order&keyword&category
 *       -> { code, message, data: { skills, total } }        (code === 0 is OK)
 *   GET /api/v1/categories
 *       -> { count, items: [{ key, level, version, name, nameEn, sortOrder, active }] }
 *   GET /api/v1/skills/<slug>/files?namespace&version
 *       -> { count, files: [{ path, sha256, size }], namespace, version }
 *   GET /api/v1/skills/<slug>/file?path&namespace&version
 *       -> raw bytes (302 to object storage; `fetch` follows redirects)
 *   GET /api/v1/skills/<slug>?namespace
 *       -> { skill, latestVersion, namespace, ... }
 *
 * The host is unreachable from the browser (no CORS headers on any endpoint),
 * which is exactly why every call is proxied through the Host half's route.
 */

import type { MarketCategory, MarketItem, MarketPage, MarketSort, SkillDetail, SourceAttempt } from './types.ts'

/**
 * Re-exported so callers can keep importing the detail shape from the layer
 * that produces it, while `types.ts` stays the single home for wire contracts.
 */
export type { SkillDetail }

/** The primary public SkillHub host. */
export const SKILLHUB_PRIMARY_HOST = 'https://api.skillhub.cn'

/**
 * Same-path mirror, verified reachable and schema-identical to the primary.
 * It is the first fallback so a primary outage degrades to "slightly older
 * data" rather than to "no market".
 */
export const SKILLHUB_MIRROR_HOST = 'https://api.skillhub.tencent.com'

/** One entry of the upstream file manifest. */
export interface RemoteFile {
  path: string
  sha256: string
  size: number
}

/** The file manifest for one concrete version. */
export interface RemoteManifest {
  version: string
  files: RemoteFile[]
}

/** Minimal structural subset of `fetch` both runtimes satisfy. */
export interface FetchResponseLike {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
  arrayBuffer(): Promise<ArrayBuffer>
}

export type FetchLike = (
  url: string,
  init: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<FetchResponseLike>

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_PAGE_SIZE = 30
const MAX_PAGE_SIZE = 100

/**
 * Upstream-safe identifier grammar. Applied to `slug`, `namespace` and every
 * manifest `path` before the value is interpolated into a proxied upstream URL,
 * so the proxy can never be steered at another upstream path.
 */
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/** HTTP-level upstream failure. */
export class SkillHubHttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'SkillHubHttpError'
    this.status = status
  }
}

/** Aborted or timed-out upstream call. */
export class SkillHubTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SkillHubTimeoutError'
  }
}

/** Rejected an identifier that is not safe to interpolate into a URL path. */
export class SkillHubInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SkillHubInputError'
  }
}

/**
 * Assert one URL path segment is upstream-safe.
 * @param value - candidate segment.
 * @param label - field name used in the error message.
 * @returns the value, for inline use.
 * @throws when the value contains separators, traversal, or an empty head.
 */
export function assertSafeSegment(value: string, label: string): string {
  if (!SAFE_SEGMENT.test(value)) throw new SkillHubInputError(`invalid ${label}`)
  return value
}

/**
 * Assert one manifest-relative file path is safe to join under an install root.
 * Rejects absolute paths, drive letters, traversal and empty segments.
 * @param value - manifest path such as `hooks/guard.py`.
 * @returns the value, for inline use.
 * @throws when the path could escape the skill directory.
 */
export function assertSafeRelativePath(value: string): string {
  if (value === '' || value.startsWith('/') || value.startsWith('\\')) {
    throw new SkillHubInputError('invalid file path')
  }
  if (/^[A-Za-z]:/.test(value)) throw new SkillHubInputError('invalid file path')
  for (const segment of value.replaceAll('\\', '/').split('/')) {
    if (segment === '' || segment === '.' || segment === '..') {
      throw new SkillHubInputError('invalid file path')
    }
  }
  return value
}

function makeSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
}

/**
 * Classify a failed upstream call as caller-cancelled or timed-out.
 * @param signal - the caller's signal; a set flag means cancellation, not a timeout.
 * @param timeoutMs - the deadline that expired.
 * @param what - operation label, so the message names the failing endpoint.
 * @throws always.
 */
function throwForAbortOrTimeout(signal: AbortSignal | undefined, timeoutMs: number, what: string): never {
  if (signal?.aborted === true) throw new DOMException('aborted', 'AbortError')
  throw new SkillHubTimeoutError(
    `SkillHub ${what} request timed out after ${Math.round(timeoutMs / 1000)}s`,
  )
}

/**
 * Issue one upstream request, normalising transport failures.
 * @param fetchImpl - fetch implementation.
 * @param url - absolute upstream URL.
 * @param init - headers, caller signal, and timeout override.
 * @param what - operation label used in timeout diagnostics.
 * @returns the raw response, including non-2xx ones (callers classify those).
 */
async function request(
  fetchImpl: FetchLike,
  url: string,
  init: { headers?: Record<string, string>; signal?: AbortSignal; timeoutMs?: number },
  what: string,
): Promise<FetchResponseLike> {
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS
  try {
    return await fetchImpl(url, { headers: init.headers, signal: makeSignal(init.signal, timeoutMs) })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError' && init.signal?.aborted === true) throw error
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throwForAbortOrTimeout(init.signal, timeoutMs, what)
    }
    throw error
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Build the public skill page URL. The upstream `homepage` / `sourceUrl`
 * fields point at the API host, which answers 405 in a browser; the SPA's real
 * skill route is `/skills/<namespace>/<slug>` (verified in DEVNOTES).
 * @param namespace - publisher handle.
 * @param slug - skill slug.
 * @returns the browser-openable page URL, or '' when either part is missing.
 */
export function skillPageUrl(namespace: string, slug: string): string {
  if (namespace === '' || slug === '') return ''
  return `https://skillhub.cn/skills/${encodeURIComponent(namespace)}/${encodeURIComponent(slug)}`
}

/** Map one raw upstream list row to the shared row shape. */
export function mapSkillHubItem(raw: unknown): MarketItem {
  const row = asRecord(raw)
  const namespace = asRecord(row['namespace'])
  const handle = asString(namespace['handle'])
  const slug = asString(row['slug'])
  // `description_zh` is the Chinese short summary; fall back to the English one.
  const description = asString(row['description_zh']) || asString(row['description'])
  return {
    slug,
    namespace: handle,
    name: asString(row['name']),
    description,
    category: asString(row['category']),
    downloads: asNumber(row['downloads']),
    installs: asNumber(row['installs']),
    stars: asNumber(row['stars']),
    iconUrl: asString(row['iconUrl']),
    pageUrl: skillPageUrl(handle, slug),
  }
}

/**
 * Reject a non-2xx upstream response.
 *
 * The URL is part of the message on purpose: every host in the fallback chain
 * serves the same paths, so a failure that does not name the host it came from
 * cannot be told apart from its mirror's.
 * @param res - the upstream response.
 * @param url - the exact URL requested, for diagnostics.
 * @param what - operation label.
 * @throws {@link SkillHubHttpError} when the status is outside 2xx.
 */
function assertOk(res: FetchResponseLike, url: string, what: string): void {
  if (!res.ok) throw new SkillHubHttpError(res.status, `SkillHub ${what} failed with HTTP ${res.status} (${url})`)
}

/**
 * Validate the upstream envelope and unwrap its `data` member.
 * @param url - the exact URL requested, for diagnostics.
 * @param res - the upstream response.
 * @param what - operation label.
 * @returns the unwrapped `data` object (or the body itself for flat responses).
 */
async function readData(url: string, res: FetchResponseLike, what: string): Promise<Record<string, unknown>> {
  assertOk(res, url, what)
  const parsed: unknown = await res.json()
  const body = asRecord(parsed)
  // Envelope check: `{ code: 0 }` is the upstream's success marker.
  const code = body['code']
  if (typeof code === 'number' && code !== 0) {
    throw new SkillHubHttpError(
      res.status,
      `SkillHub ${what} returned code ${code}: ${asString(body['message'])} (${url})`,
    )
  }
  return asRecord(body['data'] ?? body)
}

/**
 * Search / browse the market on one host.
 * @param fetchImpl - fetch implementation (Node's global fetch on the host).
 * @param params - host, query, and paging.
 * @param extra - caller abort signal and timeout override.
 * @returns the normalised page of rows.
 */
export async function searchSkills(
  fetchImpl: FetchLike,
  params: {
    host: string
    keyword?: string
    category?: string
    sortBy?: MarketSort
    page?: number
    pageSize?: number
  },
  extra: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Omit<MarketPage, 'source' | 'degraded' | 'attempts'>> {
  const page = Math.max(1, Math.trunc(params.page ?? 1))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(params.pageSize ?? DEFAULT_PAGE_SIZE)))
  const query = new URLSearchParams({
    sortBy: params.sortBy ?? 'score',
    order: 'desc',
    page: String(page),
    pageSize: String(pageSize),
  })
  const keyword = params.keyword?.trim()
  if (keyword !== undefined && keyword !== '') query.set('keyword', keyword)
  if (params.category !== undefined && params.category !== '') query.set('category', params.category)

  const url = `${params.host}/api/skills?${query.toString()}`
  const res = await request(fetchImpl, url, extra, 'search')
  const data = await readData(url, res, 'search')
  const list = Array.isArray(data['skills']) ? data['skills'] : []
  const items = list.map(mapSkillHubItem)
  return { total: asNumber(data['total']) || items.length, page, pageSize, items }
}

/**
 * Fetch the category table.
 * @param fetchImpl - fetch implementation.
 * @param extra - host plus caller abort signal.
 * @returns categories in upstream order, `pay-skill` filtered out (it is a
 *   commercial tier marker rather than a subject category), or `undefined`
 *   when the host answers without a usable list.
 */
export async function fetchCategories(
  fetchImpl: FetchLike,
  extra: { host: string; signal?: AbortSignal; timeoutMs?: number },
): Promise<MarketCategory[] | undefined> {
  const url = `${extra.host}/api/v1/categories`
  const res = await request(fetchImpl, url, extra, 'categories')
  assertOk(res, url, 'categories')
  const body = asRecord(await res.json())
  const items = Array.isArray(body['items']) ? body['items'] : []
  const categories: MarketCategory[] = []
  for (const raw of items) {
    const row = asRecord(raw)
    const key = asString(row['key'])
    if (key === '' || key === 'pay-skill') continue
    categories.push({ key, name: asString(row['name']) || key })
  }
  return categories.length === 0 ? undefined : categories
}

/** Fallback category table, used when both hosts are unreachable. */
export const BUILTIN_CATEGORIES: readonly MarketCategory[] = [
  { key: 'office-efficiency', name: '办公效率' },
  { key: 'content-creation', name: '内容创作' },
  { key: 'dev-programming', name: '开发编程' },
  { key: 'data-analysis', name: '数据分析' },
  { key: 'design-media', name: '设计多媒体' },
  { key: 'ai-agent', name: 'AI Agent' },
  { key: 'knowledge-management', name: '知识管理' },
  { key: 'business-ops', name: '商业运营' },
  { key: 'education', name: '教育学习' },
  { key: 'professional', name: '行业专业' },
  { key: 'it-ops-security', name: 'IT 运维与安全' },
  { key: 'life-service', name: '生活服务' },
]

/**
 * Fetch a skill's file manifest for one version.
 * @param fetchImpl - fetch implementation.
 * @param params - host, skill identity, and optional version pin.
 * @param extra - caller abort signal and timeout override.
 * @returns the manifest, including the version the server actually served.
 */
export async function fetchSkillManifest(
  fetchImpl: FetchLike,
  params: { host: string; slug: string; namespace: string; version?: string },
  extra: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<RemoteManifest> {
  const slug = assertSafeSegment(params.slug, 'slug')
  const namespace = assertSafeSegment(params.namespace, 'namespace')
  const query = new URLSearchParams({ namespace })
  if (params.version !== undefined && params.version !== '') query.set('version', params.version)

  const url = `${params.host}/api/v1/skills/${slug}/files?${query.toString()}`
  const res = await request(fetchImpl, url, extra, 'manifest')
  assertOk(res, url, 'manifest')
  const body = asRecord(await res.json())
  const rawFiles = Array.isArray(body['files']) ? body['files'] : []
  const files: RemoteFile[] = []
  for (const raw of rawFiles) {
    const row = asRecord(raw)
    const path = asString(row['path'])
    if (path === '') continue
    files.push({ path, sha256: asString(row['sha256']), size: asNumber(row['size']) })
  }
  const version = asString(body['version'])
  return { version, files }
}

/**
 * Fetch one file's raw bytes at a pinned version.
 *
 * Passing `version` through to every file is mandatory: without it the upstream
 * silently serves the *latest* revision, which mixes versions inside one skill
 * directory and fails the manifest's sha256 check (documented upstream trap).
 * @param fetchImpl - fetch implementation.
 * @param params - host, skill identity, manifest-relative path, and version.
 * @param extra - caller abort signal and timeout override.
 * @returns the file bytes.
 */
export async function fetchSkillFile(
  fetchImpl: FetchLike,
  params: { host: string; slug: string; namespace: string; path: string; version: string },
  extra: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Uint8Array> {
  const slug = assertSafeSegment(params.slug, 'slug')
  const namespace = assertSafeSegment(params.namespace, 'namespace')
  const path = assertSafeRelativePath(params.path)
  const query = new URLSearchParams({ path, namespace })
  if (params.version !== '') query.set('version', params.version)

  const url = `${params.host}/api/v1/skills/${slug}/file?${query.toString()}`
  const res = await request(fetchImpl, url, { ...extra, timeoutMs: extra.timeoutMs ?? 60_000 }, 'file')
  assertOk(res, url, `file "${path}"`)
  return new Uint8Array(await res.arrayBuffer())
}

/**
 * Fetch a skill's detail record, including its SKILL.md body.
 *
 * `skill.overviewMd` is empty for every skill probed upstream, so the panel's
 * overview is the packaged SKILL.md itself — the same file DSH loads at run
 * time, with the YAML frontmatter stripped.
 * @param fetchImpl - fetch implementation.
 * @param params - host and skill identity.
 * @param extra - caller abort signal and timeout override.
 * @returns the detail view.
 */
export async function fetchSkillDetail(
  fetchImpl: FetchLike,
  params: { host: string; slug: string; namespace: string },
  extra: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<SkillDetail> {
  const slug = assertSafeSegment(params.slug, 'slug')
  const namespace = assertSafeSegment(params.namespace, 'namespace')
  const query = new URLSearchParams({ namespace })

  const url = `${params.host}/api/v1/skills/${slug}?${query.toString()}`
  const res = await request(fetchImpl, url, extra, 'detail')
  assertOk(res, url, 'detail')
  const body = asRecord(await res.json())
  const skill = asRecord(body['skill'])
  const latest = asRecord(body['latestVersion'])
  const subCategories = Array.isArray(skill['subCategories']) ? skill['subCategories'] : []
  const tags = Array.isArray(skill['tags']) ? skill['tags'] : []

  let readme = ''
  // `summary_zh` is the list-level blurb, used only as the overview fallback.
  const summary = asString(skill['summary_zh']) || asString(skill['summary'])
  try {
    const manifest = await fetchSkillManifest(fetchImpl, params, extra)
    const skillFile = manifest.files.find(file => file.path.toLowerCase() === 'skill.md')
    if (skillFile !== undefined) {
      const bytes = await fetchSkillFile(fetchImpl, { ...params, path: skillFile.path, version: manifest.version }, extra)
      readme = stripFrontmatter(new TextDecoder().decode(bytes))
    }
  } catch {
    // A detail page without the SKILL.md body still renders (summary fallback).
  }

  const handle = asString(asRecord(body['namespace'])['handle']) || namespace
  return {
    slug,
    namespace: handle,
    name: asString(skill['displayName']) || slug,
    summary,
    readme,
    version: asString(latest['version']),
    category: asString(skill['category']),
    tags: [
      ...subCategories.map(entry => asString(asRecord(entry)['name'])).filter(name => name !== ''),
      ...tags.map(tag => asString(tag)).filter(tag => tag !== ''),
    ],
    pageUrl: skillPageUrl(handle, slug),
  }
}

/**
 * Remove a leading `---` YAML frontmatter block from a SKILL.md body.
 * @param text - raw file text.
 * @returns the body with frontmatter removed.
 */
export function stripFrontmatter(text: string): string {
  const normalized = text.replaceAll('\r\n', '\n')
  if (!normalized.startsWith('---\n')) return normalized.trim()
  const end = normalized.indexOf('\n---', 3)
  if (end < 0) return normalized.trim()
  const after = normalized.indexOf('\n', end + 1)
  return (after < 0 ? '' : normalized.slice(after + 1)).trim()
}

/**
 * Count the attempts recorded by the source chain (helper for the panel badge).
 * @param attempts - attempt log.
 * @returns how many sources failed before one answered.
 */
export function failureCount(attempts: readonly SourceAttempt[]): number {
  return attempts.filter(attempt => !attempt.ok).length
}

/** Convenience: is a value a supported sort key? */
export function isMarketSort(value: unknown): value is MarketSort {
  return value === 'score' || value === 'downloads' || value === 'stars' || value === 'updated_at'
}
