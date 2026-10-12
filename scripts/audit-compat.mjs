/**
 * Audit how well SkillHub's SKILL.md files satisfy DSH's skill-frontmatter
 * contract.
 *
 * The two are different ecosystems that happen to share a file format, so the
 * interesting question is not "are they the same" but "does a SkillHub skill
 * survive DSH's parser". DSH is strict about a few things and silent about the
 * rest — a skill it drops produces a `logger.warn` and nothing the model can
 * see, which is exactly the failure mode worth measuring.
 *
 * Checks, mirroring `dsh-skill-filesystem`'s `parseSkillFile`:
 *   - `name` and `description` present          (else: dropped)
 *   - `name` matches ^[a-z0-9]+(?:-[a-z0-9]+)*$ (else: dropped)
 *   - no legacy camelCase invocation keys       (else: dropped, thrown)
 *   - whether the canonical invocation keys are even used
 *
 * Usage
 *   node scripts/audit-compat.mjs [--count 30] [--sort downloads]
 */

import { writeFile } from 'node:fs/promises'

const HOST = 'https://api.skillhub.cn'
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LEGACY_KEYS = ['disableModelInvocation', 'modelInvocable', 'userInvocable']

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 || i === process.argv.length - 1 ? fallback : process.argv[i + 1]
}

const count = Number(arg('count', '30'))
const sortBy = arg('sort', 'downloads')

async function getJson(url) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const body = await res.json()
  if (typeof body?.code === 'number' && body.code !== 0) throw new Error(`code ${body.code}: ${body.message}`)
  return body?.data ?? body
}

async function getText(url) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

/** Pull the top-level keys out of a leading YAML frontmatter block. */
function frontmatterKeys(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end === -1) return null
  const block = text.slice(3, end)
  const keys = []
  for (const line of block.split('\n')) {
    const match = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:/.exec(line)
    if (match !== null) keys.push(match[1])
  }
  const name = /^name\s*:\s*(.+)$/m.exec(block)?.[1]?.trim().replace(/^['"]|['"]$/g, '')
  return { keys, name }
}

const listing = await getJson(`${HOST}/api/skills?sortBy=${sortBy}&order=desc&page=1&pageSize=${count}`)
const items = (listing.skills ?? []).map(row => ({
  slug: row.slug,
  namespace: row.namespace?.handle ?? '',
  downloads: row.downloads ?? 0,
  name: row.name ?? '',
}))

console.log(`sampling ${items.length} skills sorted by ${sortBy}\n`)

const rows = []
const CONCURRENCY = 4
for (let i = 0; i < items.length; i += CONCURRENCY) {
  const batch = items.slice(i, i + CONCURRENCY)
  const settled = await Promise.all(batch.map(async item => {
    const record = {
      slug: item.slug,
      namespace: item.namespace,
      downloads: item.downloads,
      displayName: item.name,
      ok: false,
      reason: '',
      version: '',
      name: '',
      keys: [],
      missing: '',
      legacy: '',
    }
    try {
      // The manifest answers without a version pin and reports the one it served,
      // which is exactly how the install pipeline pins a revision.
      const manifest = await getJson(`${HOST}/api/v1/skills/${item.slug}/files?namespace=${encodeURIComponent(item.namespace)}`)
      const version = manifest.version ?? ''
      record.version = String(version)
      const url = `${HOST}/api/v1/skills/${item.slug}/file?path=SKILL.md`
        + `&namespace=${encodeURIComponent(item.namespace)}&version=${encodeURIComponent(String(version))}`
      const text = await getText(url)
      const fm = frontmatterKeys(text)
      if (fm === null) { record.reason = 'no frontmatter'; return record }
      record.keys = fm.keys
      record.name = fm.name ?? ''
      if (fm.name === undefined) record.missing += ' name'
      if (!fm.keys.includes('description')) record.missing += ' description'
      if (fm.name !== undefined && !SKILL_NAME.test(fm.name)) record.reason = `bad name "${fm.name}"`
      const legacy = LEGACY_KEYS.filter(key => fm.keys.includes(key))
      if (legacy.length > 0) record.legacy = legacy.join(',')
      if (record.reason === '' && record.missing === '' && record.legacy === '') record.ok = true
      else if (record.reason === '') record.reason = record.legacy === '' ? 'missing required' : 'legacy key'
    } catch (error) {
      record.reason = String(error.message)
    }
    return record
  }))
  rows.push(...settled)
}

const good = rows.filter(r => r.ok)
const dropped = rows.filter(r => !r.ok)
const withInvocation = rows.filter(r => r.keys.includes('disable-model-invocation') || r.keys.includes('user-invocable'))
const withWhenToUse = rows.filter(r => r.keys.includes('whenToUse'))
const withMcpOrTools = rows.filter(r => r.keys.includes('allowed-tools'))

// Keys DSH does not read at all — harmless, but they show what the file is for.
const ignored = new Map()
for (const row of rows) {
  for (const key of row.keys) {
    if (['name', 'description', 'whenToUse', 'metadata', 'disable-model-invocation', 'user-invocable'].includes(key)) continue
    ignored.set(key, (ignored.get(key) ?? 0) + 1)
  }
}

console.log(`loads cleanly in DSH      ${good.length}/${rows.length}`)
console.log(`dropped by DSH            ${dropped.length}/${rows.length}`)
console.log(`uses invocation keys      ${withInvocation.length}/${rows.length}`)
console.log(`uses whenToUse            ${withWhenToUse.length}/${rows.length}`)
console.log(`uses allowed-tools        ${withMcpOrTools.length}/${rows.length}`)
console.log('\ntop keys DSH ignores (count):')
console.log([...ignored.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, n]) => `  ${k} (${n})`).join('\n'))

if (dropped.length > 0) {
  console.log('\ndropped:')
  for (const row of dropped) console.log(`  ${row.namespace}/${row.slug}  ->  ${row.reason}${row.missing}`)
}

const reportPath = 'docs/skillhub-dsh-compat.json'
await writeFile(reportPath, `${JSON.stringify({ host: HOST, sortBy, sampledAt: new Date().toISOString(), rows }, null, 2)}\n`)
console.log(`\nfull report -> ${reportPath}`)
