/**
 * Post-install read-back validation against DSH's own skill load contract.
 *
 * Why this exists: the marketplace writes whatever the registry serves, then
 * reports success. But DSH drops a `SKILL.md` whose frontmatter violates
 * `parseSkillFile`, and it drops it *silently* — one `ctx.logger.warn` that no
 * user ever reads. The directory is on disk, the panel lists the files, and the
 * model still cannot see the skill. Measured against the live registry, roughly
 * one in ten of the most-downloaded skills fails this way.
 *
 * The rules below are transcribed from `packages/skill/skill-filesystem` in the
 * DSH source tree. Order matters and is preserved exactly, because upstream
 * short-circuits: the *first* failing rule is the one that explains the drop.
 *
 *   1. the file opens with `---` and that block is eventually closed
 *   2. `name` and `description` are both non-empty strings
 *   3. `name` matches `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
 *   4. none of the camel-case invocation keys are present — upstream rejects
 *      them outright rather than aliasing them to the canonical names
 *   5. every present invocation switch carries a value `frontmatterBoolean`
 *      can coerce (`true|false|yes|no|on|off|1|0`, case-insensitive)
 *
 * Deliberately NOT checked: malformed YAML. Upstream parses the block with a
 * real YAML parser and can reject it, but this Host half bundles with zero
 * third-party runtime dependencies and so reads frontmatter by hand. A skill
 * whose block is *syntactically* invalid YAML is therefore reported as fine by
 * this validator and dropped by DSH. That gap is recorded in DEVNOTES rather
 * than papered over.
 */

import { SKILL_NAME, unquote } from './local.ts'
import type { SkillContractIssue } from '../shared/types.ts'

/** One `key: value` line inside the frontmatter block. */
const FRONTMATTER_KEY = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/

/**
 * Camel-case invocation keys upstream refuses, and the canonical key to name in
 * the message. Transcribed from `parseInvocationPolicy`'s three
 * `rejectLegacyInvocationKey` calls, including the order they are tested in.
 */
const LEGACY_INVOCATION_KEYS: readonly (readonly [legacy: string, canonical: string])[] = [
  ['disableModelInvocation', 'disable-model-invocation'],
  ['modelInvocable', 'disable-model-invocation'],
  ['userInvocable', 'user-invocable'],
]

/** Invocation switches, and the tokens `frontmatterBoolean` accepts for them. */
const INVOCATION_KEYS: readonly string[] = ['disable-model-invocation', 'user-invocable']
const BOOLEAN_TOKENS: ReadonlySet<string> = new Set(['true', 'false', 'yes', 'no', 'on', 'off', '1', '0'])

/** Frontmatter read as raw key -> scalar text, for the rules that need both. */
interface RawFrontmatter {
  /** False when the file does not open with a `---` line. */
  present: boolean
  /** False when no closing `---` line follows the opening one. */
  closed: boolean
  fields: Map<string, string>
}

/**
 * Read the frontmatter block keeping every key, not just the three this plugin
 * models.
 *
 * `parseFrontmatter` in `./local.ts` discards unknown keys on purpose; rule 4
 * above needs to *see* the keys it would otherwise discard, so the validator
 * cannot reuse it. Value handling is shared (`unquote`) so the two readers at
 * least agree on what a scalar is.
 * @param text - raw SKILL.md text.
 * @returns the block's raw fields, plus how complete the block itself is.
 */
function readRawFrontmatter(text: string): RawFrontmatter {
  const lines = text.replaceAll('\r\n', '\n').split('\n')
  if (lines[0]?.trim() !== '---') return { present: false, closed: false, fields: new Map() }

  let end = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === '---') { end = index; break }
  }
  const fields = new Map<string, string>()
  if (end < 0) return { present: true, closed: false, fields }

  for (const line of lines.slice(1, end)) {
    const match = FRONTMATTER_KEY.exec(line)
    if (match === null) continue
    const key = match[1] ?? ''
    // First occurrence wins, matching `parseFrontmatter`.
    if (!fields.has(key)) fields.set(key, unquote(match[2] ?? ''))
  }
  return { present: true, closed: true, fields }
}

/**
 * Check one SKILL.md against DSH's load contract.
 * @param text - raw SKILL.md text, as read back from disk.
 * @returns the first rule the file violates, or `undefined` when DSH will load
 *   it. The first violation is the whole answer, because upstream stops there.
 */
export function checkSkillContract(text: string): SkillContractIssue | undefined {
  const front = readRawFrontmatter(text)
  if (!front.present || !front.closed) {
    return {
      code: 'missing-frontmatter',
      message: 'skill file ignored: missing YAML frontmatter',
    }
  }

  // Upstream `stringField` also rejects a non-string or empty value, so `''`
  // stands in for "absent" here.
  const name = front.fields.get('name') ?? ''
  const description = front.fields.get('description') ?? ''
  if (name === '' || description === '') {
    return {
      code: 'missing-name-or-description',
      message: 'skill file ignored: frontmatter requires name and description',
    }
  }

  if (!SKILL_NAME.test(name)) {
    return {
      code: 'invalid-name',
      message: `skill file ignored: invalid skill name "${name}"`,
      detail: name,
    }
  }

  for (const [legacy, canonical] of LEGACY_INVOCATION_KEYS) {
    if (front.fields.has(legacy)) {
      return {
        code: 'legacy-invocation-key',
        message: `frontmatter field "${legacy}" is unsupported; use "${canonical}"`,
        detail: legacy,
        hint: canonical,
      }
    }
  }

  for (const key of INVOCATION_KEYS) {
    const raw = front.fields.get(key)
    if (raw === undefined) continue
    if (!BOOLEAN_TOKENS.has(raw.toLowerCase())) {
      return {
        code: 'invalid-invocation-boolean',
        message: `frontmatter field "${key}" must be a boolean`,
        detail: raw,
      }
    }
  }

  return undefined
}
