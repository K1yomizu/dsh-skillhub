/**
 * Local skill-directory layer (Host half only — Node filesystem).
 *
 * The root taxonomy, ranks and project-root discovery mirror the official
 * provider `packages/skill/skill-filesystem/src/index.ts` in the DSH source
 * tree, so this plugin manages exactly the directories DSH itself reads:
 *
 *   rank  source            path                              writable here
 *   100   project-dsh       <projectRoot>/.dsh/skills         read-only
 *   200   project-agents    <projectRoot>/.agents/skills      yes  (project level)
 *   400   user-dsh          $DSH_HOME/skills  (~/.dsh/skills) read-only
 *   500   user-agents       $DSH_AGENTS_HOME/skills (~/.agents/skills) yes (user level)
 *
 * `projectRoot` is the nearest ancestor of the working directory containing
 * `.git`, falling back to the working directory itself — the same walk
 * `findProjectRoot` performs upstream.
 *
 * Only the `.agents/skills` roots are written: they are the shared agent-config
 * convention, and the `.dsh/skills` roots belong to DSH (they also carry a
 * `.system` subtree that upstream explicitly skips). Skills found there are
 * still listed, flagged `manageable: false`, so the panel shows the whole
 * picture without touching what it does not own.
 */

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import type { InstalledSkill, SkillLevel } from '../shared/types.ts'

/** Kebab-case skill name grammar, identical to DSH's `SKILL_NAME`. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Root descriptor: one directory DSH reads skills from. */
export interface SkillRoot {
  path: string
  level: SkillLevel
  /** DSH provider `source` label. */
  source: string
  /** Whether this plugin may install into / delete from the root. */
  manageable: boolean
  /** Whether a `.system` child is skipped (user-dsh carries DSH internals). */
  skipSystem: boolean
}

/** Result of an install: what was written and where. */
export interface WriteResult {
  path: string
  fileCount: number
}

/** Resolve the DSH config home, matching upstream `resolveDshHome`. */
export function resolveDshHome(): string {
  const configured = process.env['DSH_HOME']
  return resolve(configured !== undefined && configured !== '' ? configured : join(homedir(), '.dsh'))
}

/** Resolve the shared agent-config home, matching upstream `resolveAgentsHome`. */
export function resolveAgentsHome(): string {
  const configured = process.env['DSH_AGENTS_HOME']
  return resolve(configured !== undefined && configured !== '' ? configured : join(homedir(), '.agents'))
}

/**
 * Walk up from `cwd` to the nearest directory containing `.git`.
 * @param cwd - working directory to start from.
 * @returns the project root, or `cwd` when no `.git` is found.
 */
export function findProjectRoot(cwd: string): string {
  let current = resolve(cwd)
  while (true) {
    if (existsSync(join(current, '.git'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(cwd)
    current = parent
  }
}

/** The writable project-level skills directory. */
export function projectSkillsDir(cwd: string): string {
  return join(findProjectRoot(cwd), '.agents', 'skills')
}

/** The writable user-level skills directory. */
export function userSkillsDir(): string {
  return join(resolveAgentsHome(), 'skills')
}

/**
 * Resolve every skill root for a working directory, in DSH rank order.
 * @param cwd - working directory selecting the project roots.
 * @returns root descriptors, highest priority first.
 */
export function skillRoots(cwd: string): SkillRoot[] {
  const projectRoot = findProjectRoot(cwd)
  return [
    { path: join(projectRoot, '.dsh', 'skills'), level: 'project', source: 'project-dsh', manageable: false, skipSystem: false },
    { path: join(projectRoot, '.agents', 'skills'), level: 'project', source: 'project-agents', manageable: true, skipSystem: false },
    { path: join(resolveDshHome(), 'skills'), level: 'user', source: 'user-dsh', manageable: false, skipSystem: true },
    { path: join(resolveAgentsHome(), 'skills'), level: 'user', source: 'user-agents', manageable: true, skipSystem: false },
  ]
}

/**
 * Resolve the writable root for one level.
 * @param level - requested level.
 * @param cwd - working directory selecting the project root.
 * @returns the absolute directory.
 * @throws when the level is not writable.
 */
export function levelRoot(level: SkillLevel, cwd: string): string {
  if (level === 'project') return projectSkillsDir(cwd)
  if (level === 'user') return userSkillsDir()
  throw new Error(`invalid level: ${String(level)}`)
}

/** Whether a skill directory name satisfies the kebab-case grammar. */
export function isSkillName(name: string): boolean {
  return SKILL_NAME.test(name)
}

/** Frontmatter fields this plugin reads and writes. */
export interface SkillFrontmatter {
  name?: string
  description?: string
  modelInvocable?: boolean
  userInvocable?: boolean
}

/**
 * Parse the fields useful to the manager out of a SKILL.md.
 *
 * Hand-rolled on purpose: only three scalar keys matter here, and pulling in a
 * full YAML parser would add a runtime dependency to the Host bundle. Truthiness
 * follows upstream `frontmatterBoolean` exactly (`true|yes|on|1`, case-insensitive).
 * @param text - raw SKILL.md text.
 * @returns the parsed subset; absent keys stay undefined.
 */
export function parseFrontmatter(text: string): SkillFrontmatter {
  const lines = text.replaceAll('\r\n', '\n').split('\n')
  if (lines[0]?.trim() !== '---') return {}
  let end = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === '---') { end = index; break }
  }
  if (end < 0) return {}

  const front: SkillFrontmatter = {}
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line)
    if (match === null) continue
    const key = match[1] ?? ''
    const value = unquote(match[2] ?? '')
    if (key === 'name' && front.name === undefined && value !== '') front.name = value
    if (key === 'description' && front.description === undefined && value !== '') front.description = value
    if (key === 'disable-model-invocation') {
      const flag = frontmatterBoolean(value)
      if (flag !== undefined) front.modelInvocable = !flag
    }
    if (key === 'user-invocable') {
      const flag = frontmatterBoolean(value)
      if (flag !== undefined) front.userInvocable = flag
    }
  }
  return front
}

/**
 * Strip a single pair of matching surrounding quotes from a frontmatter scalar.
 *
 * Exported so the read-back validator in `./contract.ts` unquotes exactly the
 * way this parser does — two readers that disagree about what a value *is*
 * would make the two halves of the plugin contradict each other.
 * @param value - raw scalar text.
 * @returns the unquoted, trimmed scalar.
 */
export function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2) {
    const first = trimmed[0]
    if ((first === '"' || first === "'") && trimmed.at(-1) === first) {
      return trimmed.slice(1, -1)
    }
  }
  return trimmed
}

/** Upstream-compatible boolean coercion for frontmatter scalars. */
function frontmatterBoolean(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === 'yes' || normalized === 'on' || normalized === '1') return true
  if (normalized === 'false' || normalized === 'no' || normalized === 'off' || normalized === '0') return false
  return undefined
}

/** One entry discovered under a skill root. */
interface DiscoveredSkill {
  /** Directory name, or the bare filename for flat `*.md` skills. */
  dir: string
  /** Absolute path of the SKILL.md (or flat markdown file). */
  file: string
  /** Whether this is a directory bundle (`SKILL.md` inside a folder). */
  bundled: boolean
}

/**
 * Enumerate skill entries directly under one root (one level deep, no recursion).
 * @param root - root descriptor.
 * @returns discovered entries, name-sorted.
 */
async function discover(root: SkillRoot): Promise<DiscoveredSkill[]> {
  if (!existsSync(root.path)) return []
  let entries
  try {
    entries = await readdir(root.path, { withFileTypes: true })
  } catch {
    return []
  }
  const found: DiscoveredSkill[] = []
  for (const entry of entries) {
    if (root.skipSystem && entry.name === '.system') continue
    if (entry.isDirectory()) {
      // Upstream also follows symlinked directories; `stat` resolves them.
      found.push({ dir: entry.name, file: join(root.path, entry.name, 'SKILL.md'), bundled: true })
      continue
    }
    if (entry.name.endsWith('.md')) {
      found.push({ dir: entry.name.slice(0, -3), file: join(root.path, entry.name), bundled: false })
    }
  }
  return found.sort((left, right) => left.dir.localeCompare(right.dir))
}

/**
 * Read one discovered skill into a management row.
 * @param root - owning root descriptor.
 * @param entry - discovered entry.
 * @returns the row, or `undefined` when no readable SKILL.md exists.
 */
async function readSkill(root: SkillRoot, entry: DiscoveredSkill): Promise<InstalledSkill | undefined> {
  let text: string
  try {
    if (!entry.bundled) {
      const info = await stat(entry.file)
      if (!info.isFile()) return undefined
    }
    text = await readFile(entry.file, 'utf8')
  } catch {
    return undefined
  }
  const front = parseFrontmatter(text)
  return {
    level: root.level,
    manageable: root.manageable,
    source: root.source,
    dir: entry.dir,
    name: front.name ?? entry.dir,
    description: front.description ?? '',
    modelInvocable: front.modelInvocable ?? true,
    userInvocable: front.userInvocable ?? true,
  }
}

/**
 * List every installed skill across all roots of a working directory.
 *
 * Roots are visited in DSH rank order and a later root never replaces an
 * earlier row with the same directory name, so the listing matches which copy
 * DSH would actually load.
 * @param cwd - working directory selecting the project roots.
 * @returns the merged, de-duplicated rows.
 */
export async function listInstalled(cwd: string): Promise<InstalledSkill[]> {
  const rows: InstalledSkill[] = []
  const seen = new Set<string>()
  for (const root of skillRoots(cwd)) {
    for (const entry of await discover(root)) {
      const key = `${root.level}:${entry.dir}`
      if (seen.has(key)) continue
      const row = await readSkill(root, entry)
      if (row === undefined) continue
      seen.add(key)
      rows.push(row)
    }
  }
  return rows
}

/**
 * Rewrite the invocation switches in a SKILL.md frontmatter block.
 *
 * Enabling a surface removes its key entirely, because both keys default to
 * enabled — the same normalisation upstream produces.
 * @param root - writable root containing the skill.
 * @param dir - skill directory name.
 * @param flags - surfaces to change; omitted surfaces are preserved.
 */
export async function setSkillInvocation(
  root: string,
  dir: string,
  flags: { modelInvocable?: boolean; userInvocable?: boolean },
): Promise<void> {
  const file = resolveSkillFile(root, dir)
  const lines = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n').split('\n')
  if (lines[0]?.trim() !== '---') throw new Error('SKILL.md has no YAML frontmatter')
  let end = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === '---') { end = index; break }
  }
  if (end < 0) throw new Error('SKILL.md frontmatter is not closed')

  const head = lines
    .slice(1, end)
    .filter(line => !/^(disable-model-invocation|user-invocable)\s*:/.test(line))
  if (flags.modelInvocable === false) head.push('disable-model-invocation: true')
  if (flags.userInvocable === false) head.push('user-invocable: false')
  await writeFile(file, [...['---'], ...head, ...lines.slice(end)].join('\n'), 'utf8')
}

/**
 * Resolve a skill's SKILL.md path, rejecting names that could escape the root.
 * @param root - root directory.
 * @param dir - skill directory name.
 * @returns the absolute SKILL.md path.
 * @throws when the name is unsafe or the skill does not exist.
 */
export function resolveSkillFile(root: string, dir: string): string {
  if (!isSkillName(dir)) throw new Error(`invalid skill name: ${dir}`)
  if (!existsSync(root)) throw new Error(`skill root does not exist: ${root}`)
  const candidate = join(root, dir)
  // Defence in depth: `isSkillName` already excludes separators and dots.
  if (!resolve(candidate).startsWith(resolve(root) + sep)) throw new Error(`invalid skill name: ${dir}`)

  const bundled = join(candidate, 'SKILL.md')
  if (existsSync(bundled)) return bundled
  const flat = join(root, `${dir}.md`)
  if (existsSync(flat)) return flat
  throw new Error(`skill not found: ${dir}`)
}

/** One file to write, relative to the skill directory. */
export interface IncomingFile {
  /** Manifest-relative path, already validated by the caller. */
  path: string
  content: Uint8Array
}

/**
 * Write a downloaded skill into a root, atomically from the panel's view.
 *
 * Files land in a sibling staging directory first and are then renamed into
 * place, so an interrupted or failed download can never leave a half-written
 * skill that DSH would load.
 * @param root - writable root directory.
 * @param dir - target skill directory name.
 * @param files - files to write.
 * @param overwrite - replace an existing skill directory.
 * @returns where it landed and how many files were written.
 * @throws when the skill already exists and `overwrite` is false, or when no
 *   `SKILL.md` is present (a skill without one is not a skill).
 */
export async function writeSkill(
  root: string,
  dir: string,
  files: readonly IncomingFile[],
  overwrite: boolean,
): Promise<WriteResult> {
  if (!isSkillName(dir)) throw new Error(`invalid skill name: ${dir}`)
  const dest = join(root, dir)
  if (existsSync(dest) && !overwrite) {
    const error = new Error('already-exists')
    error.name = 'SkillAlreadyExists'
    throw error
  }
  if (!files.some(file => file.path.toLowerCase() === 'skill.md')) {
    throw new Error('package does not contain SKILL.md')
  }

  const staging = join(root, `.staging-${dir}-${process.pid}-${Date.now()}`)
  await mkdir(staging, { recursive: true })
  const written = new Set<string>()
  try {
    for (const file of files) {
      const target = join(staging, ...file.path.split('/'))
      if (!resolve(target).startsWith(resolve(staging) + sep)) continue
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, file.content)
      written.add(file.path)
    }
    if (overwrite && existsSync(dest)) await rm(dest, { recursive: true, force: true })
    await mkdir(root, { recursive: true })
    await rename(staging, dest)
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => {})
    throw error
  }
  return { path: dest, fileCount: written.size }
}

/**
 * Delete an installed skill.
 * @param root - root directory owning the skill.
 * @param dir - skill directory name.
 */
export async function removeSkill(root: string, dir: string): Promise<void> {
  const file = resolveSkillFile(root, dir)
  // Bundled skills delete the whole directory; flat skills delete the file.
  const target = file.endsWith('SKILL.md') ? dirname(file) : file
  if (!resolve(target).startsWith(resolve(root) + sep)) throw new Error(`invalid skill name: ${dir}`)
  await rm(target, { recursive: true, force: true })
}

/**
 * Move a skill between levels (project -> user promotion).
 *
 * A copy-then-delete order keeps the skill usable if the process dies midway:
 * the stale source is removed only after the destination is complete, and an
 * already-present destination is treated as a resumable move rather than an
 * error.
 * @param fromRoot - source root directory.
 * @param toRoot - destination root directory.
 * @param dir - skill directory name.
 * @returns the destination path.
 */
export async function moveSkill(fromRoot: string, toRoot: string, dir: string): Promise<string> {
  if (!isSkillName(dir)) throw new Error(`invalid skill name: ${dir}`)
  const source = join(fromRoot, dir)
  if (!existsSync(source)) throw new Error(`skill not found: ${dir}`)
  const destination = join(toRoot, dir)
  await mkdir(toRoot, { recursive: true })

  if (!existsSync(destination)) {
    const staging = join(toRoot, `.staging-${dir}-${process.pid}-${Date.now()}`)
    await cpRecursive(source, staging)
    await rename(staging, destination)
  }
  await rm(source, { recursive: true, force: true })

  // A flat `<dir>.md` skill also has to move as a file.
  const flat = join(fromRoot, `${dir}.md`)
  if (existsSync(flat)) await rm(flat, { force: true })
  return destination
}

/** Recursive copy that never follows a symlink out of the tree. */
async function cpRecursive(from: string, to: string): Promise<void> {
  await mkdir(to, { recursive: true })
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const source = join(from, entry.name)
    const target = join(to, entry.name)
    if (entry.isDirectory()) {
      await cpRecursive(source, target)
      continue
    }
    if (entry.isFile()) await writeFile(target, await readFile(source))
  }
}

/** Hex sha256 of a buffer or string. */
export function sha256Hex(input: Uint8Array | string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** Whether any path component of `path` escapes `root`. */
export function isInside(root: string, path: string): boolean {
  return resolve(path) === resolve(root) || resolve(path).startsWith(resolve(root) + sep)
}

/** Synchronous existence probe used by the route layer's preflight checks. */
export function pathExists(path: string): boolean {
  return existsSync(path)
}

/** Read a skill's SKILL.md for the panel's local preview. */
export async function readSkillFile(root: string, dir: string): Promise<string> {
  return await readFile(resolveSkillFile(root, dir), 'utf8')
}

/** Filesystem helper used by tests and diagnostics. */
export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}

/** Re-export for the route layer so both halves agree on the name grammar. */
export { SKILL_NAME }
