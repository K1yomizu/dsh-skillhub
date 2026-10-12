/**
 * Market orchestration (Host half): the source fallback chain and the
 * download/verify/install pipeline.
 *
 * Fallback policy — "prefer SkillHub, fall back automatically":
 *
 *   1. `skillhub`         https://api.skillhub.cn          (primary)
 *   2. `skillhub-mirror`  https://api.skillhub.tencent.com (same schema)
 *   3. `local`            the locally installed skills, keyword-filtered
 *
 * Every attempt is recorded and returned with the response, so the panel can
 * say *what* degraded instead of silently showing stale or partial data. A
 * remote failure never throws at the call site: it degrades to the next source.
 */

import type { FetchLike } from '../shared/skillhub.ts'
import {
  BUILTIN_CATEGORIES,
  SKILLHUB_MIRROR_HOST,
  SKILLHUB_PRIMARY_HOST,
  fetchCategories,
  fetchSkillFile,
  fetchSkillManifest,
  searchSkills,
} from '../shared/skillhub.ts'
import type {
  InstallRequest,
  InstallResult,
  InstalledSkill,
  MarketCategory,
  MarketItem,
  MarketPage,
  MarketSourceId,
  SearchRequest,
  SourceAttempt,
} from '../shared/types.ts'
import { levelRoot, listInstalled, sha256Hex, writeSkill, type IncomingFile } from './local.ts'

/** Remote sources in priority order. */
const REMOTE_SOURCES: readonly { id: MarketSourceId; host: string }[] = [
  { id: 'skillhub', host: SKILLHUB_PRIMARY_HOST },
  { id: 'skillhub-mirror', host: SKILLHUB_MIRROR_HOST },
]

/** How many files a single install may download in parallel. */
const INSTALL_CONCURRENCY = 4

/** Hard ceiling on an install's total bytes, so a bad manifest cannot fill the disk. */
const MAX_INSTALL_BYTES = 64 * 1024 * 1024

/** Cap on the number of files one install may write. */
const MAX_INSTALL_FILES = 600

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Run `work` against each remote source until one succeeds.
 * @param work - per-host operation; a rejection moves to the next source.
 * @param signal - caller cancellation; aborts the loop immediately.
 * @returns the first success, the winning host, and the attempt log.
 * @throws the last error when every source fails.
 */
async function withRemoteSources<T>(
  work: (host: string, signal: AbortSignal | undefined) => Promise<T>,
  signal: AbortSignal | undefined,
): Promise<{ value: T; source: MarketSourceId; host: string; attempts: SourceAttempt[] }> {
  const attempts: SourceAttempt[] = []
  let lastError: unknown
  for (const candidate of REMOTE_SOURCES) {
    if (signal?.aborted === true) throw signal.reason ?? new Error('aborted')
    try {
      const value = await work(candidate.host, signal)
      attempts.push({ source: candidate.id, ok: true })
      return { value, source: candidate.id, host: candidate.host, attempts }
    } catch (error) {
      lastError = error
      attempts.push({ source: candidate.id, ok: false, error: errorText(error) })
    }
  }
  throw Object.assign(new Error(errorText(lastError)), { attempts })
}

/** Turn a locally installed skill into a market row, for the offline fallback. */
function localToItem(skill: InstalledSkill): MarketItem {
  return {
    slug: skill.dir,
    namespace: '',
    name: skill.name,
    description: skill.description,
    category: 'local',
    downloads: 0,
    installs: 0,
    stars: 0,
    iconUrl: '',
    pageUrl: '',
    local: skill,
  }
}

/**
 * Filter the local fallback by the same query the remote sources received.
 * @param skills - locally installed skills.
 * @param request - the original search request.
 * @returns matching rows.
 */
function filterLocal(skills: readonly InstalledSkill[], request: SearchRequest): MarketItem[] {
  const keyword = request.keyword?.trim().toLowerCase() ?? ''
  if (keyword === '') return skills.map(localToItem)
  return skills
    .filter(skill =>
      skill.name.toLowerCase().includes(keyword)
      || skill.dir.toLowerCase().includes(keyword)
      || skill.description.toLowerCase().includes(keyword))
    .map(localToItem)
}

/**
 * Search the market, degrading through the source chain.
 * @param deps - fetch implementation and the local-skill supplier.
 * @param request - query and paging.
 * @param signal - caller cancellation.
 * @returns a page that always names the source which served it.
 */
export async function searchMarket(
  deps: { fetchImpl: FetchLike; listLocal: () => Promise<InstalledSkill[]> },
  request: SearchRequest,
  signal: AbortSignal | undefined,
): Promise<MarketPage> {
  const page = Math.max(1, Math.trunc(request.page ?? 1))
  const pageSize = Math.max(1, Math.trunc(request.pageSize ?? 30))
  try {
    const { value, source, attempts } = await withRemoteSources(
      (host, inner) => searchSkills(deps.fetchImpl, { host, ...request, page, pageSize }, { signal: inner }),
      signal,
    )
    return { ...value, source, degraded: source !== 'skillhub', attempts }
  } catch (error) {
    const attempts = (error as { attempts?: SourceAttempt[] }).attempts ?? []
    // Offline path: answer from what is already installed on this machine.
    const items = filterLocal(await deps.listLocal(), request)
    return {
      source: 'local',
      degraded: true,
      attempts,
      total: items.length,
      page: 1,
      pageSize,
      items,
    }
  }
}

/**
 * Load the category table, preferring the live one.
 * @param fetchImpl - fetch implementation.
 * @param signal - caller cancellation.
 * @returns live categories, or the built-in copy when both hosts fail.
 */
export async function loadCategories(
  fetchImpl: FetchLike,
  signal: AbortSignal | undefined,
): Promise<{ categories: MarketCategory[]; degraded: boolean }> {
  try {
    const { value } = await withRemoteSources(
      (host, inner) => fetchCategories(fetchImpl, { host, signal: inner }),
      signal,
    )
    if (value !== undefined && value.length > 0) return { categories: value, degraded: false }
  } catch {
    // Fall through to the built-in table.
  }
  return { categories: [...BUILTIN_CATEGORIES], degraded: true }
}

/**
 * Download one skill and write it into the requested level.
 *
 * Files are fetched from the manifest one by one at a pinned version and each
 * one is verified against the manifest's `sha256` before it is written. The
 * upstream serves the *latest* revision when `version` is omitted, which would
 * silently mix revisions inside a single skill directory, so the version the
 * manifest reported is threaded through every file request.
 * @param deps - fetch implementation.
 * @param request - skill identity, target level, optional version pin.
 * @param signal - caller cancellation.
 * @returns where it landed, the version served, and the file count.
 */
export async function installFromMarket(
  deps: { fetchImpl: FetchLike },
  request: InstallRequest,
  signal: AbortSignal | undefined,
  cwd: string,
): Promise<InstallResult> {
  const root = levelRoot(request.level, cwd)

  // The manifest is fetched once; the host that answered it is reused for every
  // file, so a single install can never assemble files from two revisions.
  const { value: manifest, host } = await withRemoteSources(
    (candidate, inner) => fetchSkillManifest(
      deps.fetchImpl,
      { host: candidate, slug: request.slug, namespace: request.namespace, version: request.version },
      { signal: inner },
    ),
    signal,
  )

  if (manifest.files.length === 0) throw new Error('upstream manifest contains no files')
  if (manifest.files.length > MAX_INSTALL_FILES) {
    throw new Error(`skill has too many files (${manifest.files.length})`)
  }
  const totalBytes = manifest.files.reduce((sum, file) => sum + file.size, 0)
  if (totalBytes > MAX_INSTALL_BYTES) throw new Error('skill exceeds the install size limit')

  const files = await downloadAll(deps.fetchImpl, host, request, manifest, signal)
  const result = await writeSkill(root, request.slug, files, true)
  return { path: result.path, level: request.level, version: manifest.version, fileCount: result.fileCount }
}

/** Download every manifest file with bounded concurrency and verify hashes. */
async function downloadAll(
  fetchImpl: FetchLike,
  host: string,
  request: InstallRequest,
  manifest: { version: string; files: readonly { path: string; sha256: string; size: number }[] },
  signal: AbortSignal | undefined,
): Promise<IncomingFile[]> {
  const results = new Array<IncomingFile | undefined>(manifest.files.length)
  let cursor = 0

  const worker = async (): Promise<void> => {
    while (true) {
      const index = cursor
      cursor += 1
      const file = manifest.files[index]
      if (file === undefined) return
      if (signal?.aborted === true) throw signal.reason ?? new Error('aborted')

      const bytes = await fetchSkillFile(
        fetchImpl,
        { host, slug: request.slug, namespace: request.namespace, path: file.path, version: manifest.version },
        { signal },
      )
      if (file.sha256 !== '') {
        const actual = sha256Hex(bytes)
        if (actual !== file.sha256) {
          throw new Error(`integrity check failed for "${file.path}"`)
        }
      }
      results[index] = { path: file.path, content: bytes }
    }
  }

  const workers = Array.from({ length: Math.min(INSTALL_CONCURRENCY, manifest.files.length) }, () => worker())
  await Promise.all(workers)

  const files: IncomingFile[] = []
  for (const entry of results) {
    if (entry !== undefined) files.push(entry)
  }
  if (files.length !== manifest.files.length) throw new Error('install stalled before every file arrived')
  return files
}

/**
 * List the locally installed skills for a working directory.
 * @param cwd - working directory selecting the project roots.
 * @returns installed rows.
 */
export async function listLocalSkills(cwd: string): Promise<InstalledSkill[]> {
  return await listInstalled(cwd)
}
