/**
 * Host half of `dsh-skillhub`.
 *
 * Responsibilities:
 *   1. serve the panel's same-origin JSON API on the `webServer` service;
 *   2. register the read-only `dsh_skillhub_search` model tool.
 *
 * The browser half is a separate artifact (`lib/client.js`) discovered through
 * `package.json#dsh.client`; nothing in this file imports React or touches the
 * DOM.
 *
 * Service availability is deliberately asymmetric: the route is mounted from
 * `webServer`, which a web profile always has, while the model tool is attached
 * through a deferred `ctx.inject(['tools'])`. A profile without the tools
 * service therefore still gets a working panel instead of a plugin that fails
 * to activate.
 *
 * The `WebRoute` import below is load-bearing, not just descriptive: `ctx.webServer`
 * exists only because `@deepseek-ai/dsh-host-webserver` merges it into `Context`,
 * and that merge is visible to this program only once the package is imported.
 * Typing the route literal as `WebRoute` keeps the import referenced while
 * checking the literal against the framework's own route shape.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import z from '@deepseek-ai/schemastery'
import type Schema from '@deepseek-ai/schemastery'
import type { FetchLike } from '../shared/skillhub.ts'
import { API_PREFIX, handleApiRequest } from './api.ts'
import { createSearchTool, SEARCH_TOOL_NAME } from './tool.ts'

/** Plugin id inside the composition. */
export const name = 'dsh-skillhub'

/**
 * Only `webServer` gates activation. `tools` is attached lazily so a profile
 * without it still mounts the panel.
 */
export const inject = ['webServer']

/** Plugin configuration (patch-layer overridable by row id `skill-hub`). */
export interface Config {
  /** Upstream request timeout in milliseconds. */
  timeoutMs?: number
  /** Level pre-selected in the panel's install action. */
  defaultLevel?: 'user' | 'project'
  /** Rows per market page. */
  pageSize?: number
  /** Register the `dsh_skillhub_search` model tool. */
  enableModelTool?: boolean
}

/** Validated configuration schema. */
export const Config: Schema<Config> = z.object({
  timeoutMs: z.number().step(1).min(1000).max(120_000).default(15_000),
  defaultLevel: z.union([z.const('user'), z.const('project')]).default('user'),
  pageSize: z.number().step(1).min(1).max(100).default(30),
  enableModelTool: z.boolean().default(true),
})

/**
 * Node `fetch` adapted to the structural subset the shared data layer needs.
 * @param url - absolute upstream URL.
 * @param init - headers and abort signal.
 * @returns the response.
 */
const nodeFetch: FetchLike = async (url, init) =>
  await fetch(url, {
    ...(init.headers === undefined ? {} : { headers: init.headers }),
    ...(init.signal === undefined ? {} : { signal: init.signal }),
    redirect: 'follow',
  })

/**
 * Mount the Host half.
 * @param ctx - host context carrying the `webServer` service.
 * @param config - validated plugin configuration.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const deps = { fetchImpl: nodeFetch }

  const route: WebRoute = {
    kind: 'prefix',
    path: API_PREFIX,
    handler: (req, res) => { void handleApiRequest(deps, req, res) },
  }

  ctx.effect(() => ctx.webServer.register(route), 'skill-hub: panel API route')

  if (config.enableModelTool !== false) {
    // Deferred injection: the tool row appears only when `tools` is present,
    // and disappears with this plugin's fiber either way.
    ctx.inject(['tools'], (toolCtx) => {
      toolCtx.effect(() => toolCtx.tools.register(createSearchTool(nodeFetch)), `skill-hub: ${SEARCH_TOOL_NAME}`)
    })
  }
}

export { SEARCH_TOOL_NAME }
