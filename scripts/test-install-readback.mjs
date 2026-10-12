/**
 * End-to-end read-back test.
 *
 * The unit test (`test-contract.mjs`) proves the *rules* match DSH's. This one
 * proves the rules are actually *wired into the install path*: it drives the
 * real `installFromMarket` against the live SkillHub registry and inspects the
 * `warnings` the panel would render.
 *
 * Both fixtures are real rows taken from `docs/skillhub-dsh-compat.json`:
 *
 *   clawhub_ivangdavila/self-improving  name is "Self-Improving + Proactive Agent"
 *                                       -> DSH drops it (invalid name grammar)
 *   indiv-ebandao/anti-fraud            name is "anti-fraud"
 *                                       -> DSH loads it
 *
 * Installation is redirected to a throwaway directory by pointing
 * `DSH_AGENTS_HOME` at a temp dir, so nothing touches the real
 * `~/.agents/skills`. The temp tree is removed on exit either way.
 *
 * Usage: node scripts/test-install-readback.mjs   (needs network)
 * Exit:  0 when every assertion holds, 1 otherwise.
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let failures = 0
let checks = 0

/**
 * Record one assertion.
 * @param {unknown} actual - observed value.
 * @param {unknown} expected - required value.
 * @param {string} label - what is being asserted.
 */
function check(actual, expected, label) {
  checks += 1
  const ok = actual === expected
  if (!ok) failures += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`)
}

const sandbox = await mkdtemp(join(tmpdir(), 'dsh-skillhub-readback-'))
process.env['DSH_AGENTS_HOME'] = sandbox

// Imported after the env var is set, so `resolveAgentsHome` cannot have cached
// a path from the real home directory.
const { installFromMarket } = await import('../src/host/market.ts')

const deps = { fetchImpl: fetch }
/** Install one registry row at user level, into the sandbox. */
const install = (slug, namespace) =>
  installFromMarket(deps, { slug, namespace, level: 'user' }, undefined, sandbox)

try {
  console.log(`sandbox: ${sandbox}\n`)
  console.log('-- a skill DSH will drop --')
  const broken = await install('self-improving', 'clawhub_ivangdavila')
  console.log(`     path ${broken.path}`)
  console.log(`     v${broken.version}, ${broken.fileCount} files`)
  check(broken.path.startsWith(sandbox), true, 'install stayed inside the sandbox')
  check(broken.fileCount > 0, true, 'files were written')
  check(broken.warnings.length, 1, 'read-back produced exactly one warning')
  const issue = broken.warnings[0]
  check(issue?.code, 'invalid-name', 'warning blamed on the name grammar')
  check(issue?.detail, 'Self-Improving + Proactive Agent', 'warning carries the offending name')
  console.log(`     ${issue?.message}`)

  // The warning must describe the file that is actually on disk — that is the
  // whole point of validating a read-back rather than the downloaded bytes.
  const landed = await readFile(join(broken.path, 'SKILL.md'), 'utf8')
  check(landed.includes('name: Self-Improving + Proactive Agent'), true, 'on-disk SKILL.md carries the name the warning names')
  check(landed.length > 0, true, 'on-disk SKILL.md is non-empty')

  console.log('\n-- a skill DSH will load --')
  const good = await install('anti-fraud', 'indiv-ebandao')
  console.log(`     path ${good.path}`)
  console.log(`     v${good.version}, ${good.fileCount} files`)
  check(good.path.startsWith(sandbox), true, 'install stayed inside the sandbox')
  check(good.warnings.length, 0, 'clean skill produced no warnings')
} catch (error) {
  failures += 1
  console.log(`FAIL threw — ${error instanceof Error ? error.message : String(error)}`)
} finally {
  await rm(sandbox, { recursive: true, force: true })
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`)
process.exit(failures === 0 ? 0 : 1)
