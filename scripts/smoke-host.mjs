/**
 * Host-half smoke test.
 *
 * Loads the *built* Host artifact (`lib/index.js`) into a real Cordis context and
 * drives its own HTTP routes over a loopback socket. This exercises the whole
 * Host path end to end — activation, `WebRoute` prefix mounting, the request
 * guards, the SkillHub client against the live upstream, the source fallback
 * chain, the JSON envelope, and the local skill scan — without booting a full DSH
 * profile.
 *
 * `webServer` is supplied as a minimal stand-in: the plugin only ever calls
 * `register({ kind, path, handler })` on it, so no more of the real service is
 * needed. The `tools` service is deliberately absent, which also asserts that the
 * deferred `ctx.inject(['tools'])` does not block activation.
 *
 * Usage: node scripts/smoke-host.mjs        (requires `npm run build` first)
 * Exit:  0 when every assertion holds, 1 otherwise.
 */

import { Context } from '@deepseek-ai/cordis'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const plugin = await import('../lib/index.js')

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

/** Mount `route` on a plain http server the way the real webServer would. */
function createStubWebServer() {
  /** @type {{ kind: string, path: string, handler: Function }[]} */
  const routes = []
  const server = createServer((req, res) => {
    const pathname = (req.url ?? '').split('?')[0] ?? ''
    // Longest matching prefix wins, mirroring the real service's contract.
    const matches = routes
      .filter(route =>
        route.kind === 'exact'
          ? route.path === pathname
          : pathname === route.path || pathname.startsWith(`${route.path}/`))
      .sort((a, b) => b.path.length - a.path.length)
    const route = matches[0]
    if (route === undefined) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end('{"ok":false,"error":"no route"}')
      return
    }
    void route.handler(req, res)
  })
  return {
    service: {
      /** @param {{ kind: string, path: string, handler: Function }} route */
      register(route) {
        routes.push(route)
        return () => {
          const index = routes.indexOf(route)
          if (index >= 0) routes.splice(index, 1)
        }
      },
    },
    listen: () => new Promise(resolve => {
      server.listen(0, '127.0.0.1', () => resolve(server.address().port))
    }),
    close: () => new Promise(resolve => { server.close(resolve) }),
  }
}

/**
 * POST a JSON body and return the parsed envelope plus the status.
 * @param {number} port - loopback port.
 * @param {string} path - route suffix.
 * @param {unknown} body - request body.
 * @param {Record<string, string>} [headers] - extra headers, for the guard tests.
 */
async function post(port, path, body, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/plugins/dsh-skillhub/api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body ?? {}),
  })
  const text = await response.text()
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { unparsed: text.slice(0, 200) }
  }
  return { status: response.status, body: parsed }
}

const web = createStubWebServer()
const ctx = new Context()
ctx.provide('webServer', web.service)

plugin.apply(ctx, { timeoutMs: 20_000 })

// A prefix route must have been mounted, and nothing else.
check(plugin.name, 'dsh-skillhub', 'plugin name')
check(JSON.stringify(plugin.inject), JSON.stringify(['webServer']), 'plugin injects only webServer')

const port = await web.listen()
console.log(`\n-- live upstream (port ${port}) --`)

const search = await post(port, '/search', { keyword: 'excel', pageSize: 3 })
check(search.status, 200, 'POST /search -> HTTP 200')
check(search.body.ok, true, 'POST /search -> ok:true')
check(search.body.source, 'skillhub', 'POST /search served by the primary source')
check(Array.isArray(search.body.items), true, 'POST /search -> items[]')
check(search.body.items.length > 0, true, 'POST /search returned rows')
check(Array.isArray(search.body.attempts) && search.body.attempts.length > 0, true, 'POST /search reported its source attempts')
if (search.body.items.length > 0) {
  const first = search.body.items[0]
  console.log(`     first row: ${first.name} (@${first.namespace}/${first.slug}) ${first.pageUrl}`)
  check(typeof first.pageUrl === 'string' && first.pageUrl.startsWith('https://skillhub.cn/skills/'), true, 'row pageUrl targets the SPA route, not the API host')
}

const categories = await post(port, '/categories', {})
check(categories.body.ok, true, 'POST /categories -> ok:true')
check(Array.isArray(categories.body.categories) && categories.body.categories.length > 0, true, 'POST /categories returned a table')
check(categories.body.categories.some(c => c.key === 'pay-skill'), false, 'pay-skill filtered out of categories')

const installed = await post(port, '/installed', {})
check(installed.body.ok, true, 'POST /installed -> ok:true')
check(Array.isArray(installed.body.skills), true, 'POST /installed -> skills[]')
check(typeof installed.body.userDir, 'string', 'POST /installed -> userDir')
check(typeof installed.body.projectDir, 'string', 'POST /installed -> projectDir')
console.log(`     userDir:    ${installed.body.userDir}`)
console.log(`     projectDir: ${installed.body.projectDir}`)
console.log(`     installed:  ${installed.body.skills.length}`)

const detail = await post(port, '/detail', {
  slug: search.body.items[0]?.slug,
  namespace: search.body.items[0]?.namespace,
})
if (search.body.items.length > 0) {
  check(detail.body.ok, true, 'POST /detail -> ok:true')
  check(detail.body.detail?.readme !== undefined, true, 'POST /detail carries a SKILL.md body')
  console.log(`     detail: ${detail.body.detail?.name} v${detail.body.detail?.version}, readme ${detail.body.detail?.readme?.length ?? 0} chars`)
}

console.log('\n-- request guards --')
check((await post(port, '/unknown', {})).body.kind, 'not-found', 'unknown endpoint -> not-found')

const origin = await post(port, '/search', {}, { origin: 'https://evil.example' })
check(origin.body.kind, 'forbidden-origin', 'foreign Origin rejected')

const method = await fetch(`http://127.0.0.1:${port}/plugins/dsh-skillhub/api/search`)
check((await method.json()).kind, 'method-not-allowed', 'GET rejected')

const mediaType = await fetch(`http://127.0.0.1:${port}/plugins/dsh-skillhub/api/search`, {
  method: 'POST',
  headers: { 'content-type': 'text/plain' },
  body: '{}',
})
check((await mediaType.json()).kind, 'unsupported-media-type', 'non-JSON content-type rejected')

const badLevel = await post(port, '/install', { slug: 'x', namespace: 'y', level: 'nonsense' })
check(badLevel.body.ok, false, 'invalid level rejected')
check(String(badLevel.body.error).includes('invalid level'), true, 'invalid level reported by name')

const traversal = await post(port, '/install', { slug: '../../etc', namespace: 'y' })
check(traversal.body.ok, false, 'path traversal in slug rejected')

await web.close()
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`)

// Releasing the root fiber disposes the plugin's effects, which in a real
// profile is what unmounts the route on unload.
ctx.fiber?.dispose?.()
process.exit(failures === 0 ? 0 : 1)
