/**
 * Capture the plugin's UI from a *running* DSH web profile.
 *
 * This is the only verification step that exercises the browser half for real:
 * it drives a headless Chromium over the DevTools protocol, boots the shipped
 * `lib/client.js` through the page's own `__ModuleLoader__`, clicks the sidebar
 * entry, and photographs what the renderer produced.
 *
 * Zero dependencies — Node 22 ships both `fetch` and a global `WebSocket`.
 *
 * Usage
 *   node scripts/capture-ui.mjs --url "http://127.0.0.1:3080/?token=..." [--out docs/preview]
 *
 * Getting the URL: `dsh --profile web --no-open` prints
 *   `dsh web: http://127.0.0.1:<port>/?token=<token>`
 * The token is regenerated on every boot, so it must come from that line.
 *
 * Getting the browser: any Chromium started with a debugging port works, e.g.
 *   msedge.exe --headless=new --remote-debugging-port=9222 --user-data-dir=<tmp>
 * Point `--cdp` at it if you use a different port.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/* ------------------------------------------------------------------ */
/* Arguments                                                           */
/* ------------------------------------------------------------------ */

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 || i === process.argv.length - 1 ? fallback : process.argv[i + 1]
}

const pageUrl = arg('url', process.env.DSH_WEB_URL ?? '')
const cdpUrl = arg('cdp', process.env.DSH_CDP_URL ?? 'http://127.0.0.1:9222')
const outDir = resolve(arg('out', process.env.DSH_PREVIEW_DIR ?? 'docs/preview'))
const width = Number(arg('width', '1440'))
const height = Number(arg('height', '900'))
const scale = Number(arg('scale', '2'))

if (pageUrl === '') {
  console.error('usage: node scripts/capture-ui.mjs --url "http://127.0.0.1:<port>/?token=<token>" [--out docs/preview]')
  process.exit(2)
}

const wait = ms => new Promise(r => setTimeout(r, ms))

/* ------------------------------------------------------------------ */
/* A minimal CDP client                                                */
/* ------------------------------------------------------------------ */

class CdpSession {
  constructor(ws) {
    this.ws = ws
    this.nextId = 0
    this.pending = new Map()
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      if (message.id === undefined) return
      const settle = this.pending.get(message.id)
      if (settle === undefined) return
      this.pending.delete(message.id)
      settle(message)
    })
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId
    return new Promise(settle => {
      this.pending.set(id, settle)
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId === undefined ? {} : { sessionId }) }))
    })
  }
}

/* ------------------------------------------------------------------ */
/* Drive                                                               */
/* ------------------------------------------------------------------ */

const version = await (await fetch(`${cdpUrl}/json/version`)).json()
const socket = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((open, fail) => {
  socket.addEventListener('open', open)
  socket.addEventListener('error', fail)
})

const root = new CdpSession(socket)
const created = await root.send('Target.createTarget', { url: 'about:blank' })
const targetId = created.result.targetId
const attached = await root.send('Target.attachToTarget', { targetId, flatten: true })
const sessionId = attached.result.sessionId

const call = (method, params) => root.send(method, params, sessionId)

async function evaluate(expression) {
  const reply = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  const details = reply.result?.exceptionDetails
  if (details !== undefined) throw new Error(details.exception?.description ?? details.text)
  return reply.result?.result?.value
}

/** Poll `expression` until it is truthy, or give up after `seconds`. */
async function until(expression, seconds, label) {
  for (let i = 0; i < seconds; i++) {
    await wait(1000)
    if (await evaluate(expression) === true) return true
  }
  console.warn(`  ! timed out waiting for ${label}`)
  return false
}

/** Photograph the page, or a sub-rectangle of it when `clip` is given. */
async function shot(name, clip) {
  const reply = await call('Page.captureScreenshot', clip === undefined ? { format: 'png' } : { format: 'png', clip })
  const bytes = Buffer.from(reply.result.data, 'base64')
  await writeFile(`${outDir}/${name}.png`, bytes)
  console.log(`  ${name}.png  ${(bytes.length / 1024).toFixed(0)} KiB`)
}

await mkdir(outDir, { recursive: true })
await call('Page.enable')
await call('Runtime.enable')
await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false })
await call('Page.navigate', { url: pageUrl })

console.log('waiting for the shell…')
await until(`!!document.querySelector('.smk-entry')`, 40, 'the sidebar entry')

// The first boot shows the "preview build" notice; it covers the panel.
await evaluate(`(() => {
  const dismiss = [...document.querySelectorAll('button')]
    .find(node => /继续|Continue|知道了|Got it/.test(node.innerText))
  if (dismiss === undefined) return 'no notice'
  dismiss.click()
  return 'dismissed'
})()`)
await wait(800)

console.log('capturing…')
await shot('04-sidebar-entry')

await evaluate(`document.querySelector('.smk-entry').click()`)
await until(`document.querySelectorAll('.smk-row').length > 0`, 40, 'market results')
await shot('01-market')

const panel = await evaluate(`(() => {
  const rect = document.querySelector('.smk-panel').getBoundingClientRect()
  return JSON.stringify({ x: rect.x, y: rect.y, width: rect.width, height: rect.height })
})()`)
const rect = JSON.parse(panel)
await shot('05-market-closeup', {
  x: rect.x - 8, y: rect.y - 8, width: rect.width + 16, height: rect.height + 16, scale: 2,
})

await evaluate(`[...document.querySelectorAll('.smk-tab')][1]?.click()`)
await wait(2500)
await shot('02-installed')

await evaluate(`[...document.querySelectorAll('.smk-tab')][0]?.click()`)
await wait(1200)
await evaluate(`document.querySelector('.smk-row .smk-link')?.click()`)
await until(`!!document.querySelector('.smk-detail-body')`, 20, 'the detail body')
await wait(1500)
await shot('03-detail')

const market = await evaluate(`document.querySelector('.smk-meta')?.innerText ?? ''`)
const installed = await evaluate(`[...document.querySelectorAll('.smk-footer span')].map(n => n.innerText).join(' ')`)

console.log('\nsummary')
console.log('  market meta :', market.replace(/\n/g, ' | '))
console.log('  installed   :', installed)
console.log('  output dir  :', outDir)

await root.send('Target.closeTarget', { targetId })
socket.close()
process.exit(0)
