/**
 * Contract read-back unit test.
 *
 * Runs against the TypeScript source (`src/host/contract.ts`) rather than the
 * built artifact, because the point is to pin the *rules* to DSH's own
 * `parseSkillFile` — not to re-assert that esbuild bundled a file.
 *
 * The rules are transcribed in `src/host/contract.ts`; the cases below are the
 * evidence that the transcription is faithful. Three of them are real skills
 * taken from the live registry that DSH drops, and are marked as such — they
 * are the reason this validator exists at all.
 *
 * Usage: node scripts/test-contract.mjs
 * Exit:  0 when every case matches, 1 otherwise.
 */

import { checkSkillContract } from '../src/host/contract.ts'

let failures = 0
let checks = 0

/**
 * Assert what the validator returns for one SKILL.md.
 * @param {string} label - what is being asserted.
 * @param {string} text - raw SKILL.md.
 * @param {string | undefined} expected - expected issue code, or undefined.
 * @param {{ detail?: string, hint?: string }} [extra] - expected issue fields.
 */
function expect(label, text, expected, extra = {}) {
  checks += 1
  const issue = checkSkillContract(text)
  const got = issue?.code
  const fieldsOk = expected === undefined
    || ((extra.detail === undefined || issue?.detail === extra.detail)
      && (extra.hint === undefined || issue?.hint === extra.hint))
  const ok = got === expected && fieldsOk
  if (!ok) failures += 1
  const observed = issue === undefined
    ? 'undefined'
    : `${issue.code}${issue.detail === undefined ? '' : ` detail=${JSON.stringify(issue.detail)}`}${issue.hint === undefined ? '' : ` hint=${JSON.stringify(issue.hint)}`}`
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` — expected ${String(expected)}, got ${observed}`}`)
}

/** Build a SKILL.md from frontmatter lines. */
const md = (...lines) => ['---', ...lines, '---', '', 'Body text.'].join('\n')

console.log('-- accepted --')
expect('minimal valid skill', md('name: pdf', 'description: Work with PDFs'), undefined)
expect('kebab name with digits', md('name: pdf-2-reader', 'description: Reads PDFs'), undefined)
expect('quoted name', md('name: "pdf-reader"', 'description: Reads PDFs'), undefined)
expect(
  'both invocation switches, canonical',
  md('name: pdf', 'description: Reads PDFs', 'disable-model-invocation: true', 'user-invocable: false'),
  undefined,
)
expect('boolean token "1"', md('name: pdf', 'description: d', 'user-invocable: 1'), undefined)
expect('boolean token "no"', md('name: pdf', 'description: d', 'disable-model-invocation: no'), undefined)
expect('boolean token "ON" (case-insensitive)', md('name: pdf', 'description: d', 'user-invocable: ON'), undefined)
expect('CRLF line endings', md('name: pdf', 'description: Reads PDFs').replaceAll('\n', '\r\n'), undefined)

console.log('\n-- rejected: structure --')
expect('no frontmatter at all', '# Just a heading\n\ntext', 'missing-frontmatter')
expect('frontmatter never closed', '---\nname: pdf\ndescription: d\n', 'missing-frontmatter')
expect('empty file', '', 'missing-frontmatter')

console.log('\n-- rejected: required fields --')
expect('missing description', md('name: pdf'), 'missing-name-or-description')
expect('missing name', md('description: Reads PDFs'), 'missing-name-or-description')
expect('name present but empty', md('name:', 'description: Reads PDFs'), 'missing-name-or-description')

console.log('\n-- rejected: name grammar --')
// The three below are real rows from SkillHub's top-downloaded page, verbatim.
expect('real sample: Mysteel_PriceSearch (underscore + capitals)', md('name: Mysteel_PriceSearch', 'description: 价格查询'), 'invalid-name', { detail: 'Mysteel_PriceSearch' })
expect('real sample: 全国电子印章互认平台 (Chinese name)', md('name: 全国电子印章互认平台', 'description: 电子印章'), 'invalid-name', { detail: '全国电子印章互认平台' })
expect('real sample: Self-Improving + Proactive Agent (spaces + plus)', md('name: Self-Improving + Proactive Agent', 'description: Agent'), 'invalid-name', { detail: 'Self-Improving + Proactive Agent' })
expect('trailing hyphen', md('name: pdf-', 'description: d'), 'invalid-name')
expect('leading hyphen', md('name: -pdf', 'description: d'), 'invalid-name')
expect('double hyphen', md('name: pdf--reader', 'description: d'), 'invalid-name')

console.log('\n-- rejected: invocation policy --')
expect('legacy modelInvocable', md('name: pdf', 'description: d', 'modelInvocable: false'), 'legacy-invocation-key', { detail: 'modelInvocable', hint: 'disable-model-invocation' })
expect('legacy userInvocable', md('name: pdf', 'description: d', 'userInvocable: false'), 'legacy-invocation-key', { detail: 'userInvocable', hint: 'user-invocable' })
expect('legacy disableModelInvocation', md('name: pdf', 'description: d', 'disableModelInvocation: true'), 'legacy-invocation-key', { detail: 'disableModelInvocation', hint: 'disable-model-invocation' })
expect('uncoercible boolean', md('name: pdf', 'description: d', 'disable-model-invocation: maybe'), 'invalid-invocation-boolean', { detail: 'maybe' })
expect('numeric boolean other than 0/1', md('name: pdf', 'description: d', 'user-invocable: 2'), 'invalid-invocation-boolean', { detail: '2' })

console.log('\n-- upstream evaluation order --')
// Upstream short-circuits, so a file that breaks two rules must be blamed on
// the earlier one — otherwise the panel would report a rule DSH never reaches.
expect(
  'invalid name wins over a legacy key',
  md('name: Bad_Name', 'description: d', 'modelInvocable: false'),
  'invalid-name',
)
expect(
  'missing description wins over an invalid name',
  md('name: Bad_Name'),
  'missing-name-or-description',
)
expect(
  'invalid name wins over an uncoercible boolean',
  md('name: Bad_Name', 'description: d', 'user-invocable: maybe'),
  'invalid-name',
)

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`)
process.exit(failures === 0 ? 0 : 1)
