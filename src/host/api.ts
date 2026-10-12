/**
 * Same-origin JSON API for the panel, served on the composition's `webServer`.
 *
 * Why HTTP routes instead of a Remote method: the Remote surface
 * (`packages/api/remotes`) is a closed set that out-of-tree plugins cannot
 * extend, so a plugin-owned route prefix is the supported channel. This is the
 * same mechanism the official `hmr` plugin uses.
 *
 * Every request is `POST` + `application/json`. Cross-site requests therefore
 * cannot reach these routes without a CORS preflight, which the server never
 * answers, and a mismatched `Origin` header is rejected outright. Handlers never
 * throw across the boundary: failures come back as `{ ok: false, error }` with
 * HTTP 200 so the panel can render them.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { FetchLike } from '../shared/skillhub.ts'
import { fetchSkillDetail } from '../shared/skillhub.ts'
import { SKILLHUB_PRIMARY_HOST, SKILLHUB_MIRROR_HOST, assertSafeSegment } from '../shared/skillhub.ts'
import type {
  ApiResponse,
  CategoriesPayload,
  DetailPayload,
  InstallPayload,
  InstallRequest,
  InstalledPayload,
  PromotePayload,
  SearchPayload,
  SearchRequest,
  SetInvocationRequest,
  SkillLevel,
} from '../shared/types.ts'
import { MARKET_SORTS } from '../shared/types.ts'
import {
  levelRoot,
  listInstalled,
  moveSkill,
  projectSkillsDir,
  removeSkill,
  setSkillInvocation,
  userSkillsDir,
} from './local.ts'
import { installFromMarket, loadCategories, searchMarket } from './market.ts'

/** Route prefix serving the panel. */
export const API_PREFIX = '/plugins/dsh-skill-market/api'

/** Largest request body accepted, in bytes. */
const MAX_BODY_BYTES = 64 * 1024

/** Dependencies the route layer needs from the plugin body. */
export interface ApiDeps {
  fetchImpl: FetchLike
}

/* ------------------------------------------------------------------ */
/* Request/response plumbing                                           */
/* ------------------------------------------------------------------ */

function sendJson<T>(res: ServerResponse, body: ApiResponse<T>, status = 200): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(payload)
}

function sendError(res: ServerResponse, error: string, kind?: string): void {
  sendJson(res, kind === undefined ? { ok: false, error } : { ok: false, error, kind })
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Reject requests that did not originate from the app's own page.
 *
 * The browser sends `Origin` on cross-origin requests and on same-origin
 * non-GET requests, so requiring it to match the `Host` header blocks a
 * malicious page from driving this API against a loopback server.
 */
function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  if (origin === undefined) return true // Same-origin form posts and CLI probes.
  const host = req.headers.host
  if (host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Read and parse a JSON body, bounded by {@link MAX_BODY_BYTES}. */
async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('request body too large')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {}
}

function stringField(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function numberField(body: Record<string, unknown>, key: string): number | undefined {
  const value = body[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function boolField(body: Record<string, unknown>, key: string): boolean | undefined {
  const value = body[key]
  return typeof value === 'boolean' ? value : undefined
}

/** Validate a level field, defaulting to the user level. */
function levelField(body: Record<string, unknown>, fallback: SkillLevel): SkillLevel {
  const value = body['level']
  if (value === 'project' || value === 'user') return value
  if (value === undefined) return fallback
  throw new Error(`invalid level: ${String(value)}`)
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

async function handleSearch(deps: ApiDeps, body: Record<string, unknown>, signal: AbortSignal): Promise<ApiResponse<SearchPayload>> {
  const sortBy = body['sortBy']
  const request: SearchRequest = {
    ...(stringField(body, 'keyword') === undefined ? {} : { keyword: stringField(body, 'keyword') }),
    ...(stringField(body, 'category') === undefined ? {} : { category: stringField(body, 'category') }),
    ...(typeof sortBy === 'string' && MARKET_SORTS.includes(sortBy as never)
      ? { sortBy: sortBy as SearchRequest['sortBy'] }
      : {}),
    ...(numberField(body, 'page') === undefined ? {} : { page: numberField(body, 'page') }),
    ...(numberField(body, 'pageSize') === undefined ? {} : { pageSize: numberField(body, 'pageSize') }),
  }
  const cwd = stringField(body, 'cwd') ?? process.cwd()
  const page = await searchMarket({ fetchImpl: deps.fetchImpl, listLocal: () => listInstalled(cwd) }, request, signal)
  return { ok: true, ...page }
}

async function handleCategories(deps: ApiDeps, signal: AbortSignal): Promise<ApiResponse<CategoriesPayload>> {
  const result = await loadCategories(deps.fetchImpl, signal)
  return { ok: true, ...result }
}

async function handleInstalled(body: Record<string, unknown>): Promise<ApiResponse<InstalledPayload>> {
  const cwd = stringField(body, 'cwd') ?? process.cwd()
  const skills = await listInstalled(cwd)
  return {
    ok: true,
    skills,
    projectDir: projectSkillsDir(cwd),
    userDir: userSkillsDir(),
  }
}

async function handleInstall(deps: ApiDeps, body: Record<string, unknown>, signal: AbortSignal): Promise<ApiResponse<InstallPayload>> {
  const slug = stringField(body, 'slug')
  const namespace = stringField(body, 'namespace')
  if (slug === undefined || namespace === undefined) throw new Error('slug and namespace are required')
  const request: InstallRequest = {
    slug: assertSafeSegment(slug, 'slug'),
    namespace: assertSafeSegment(namespace, 'namespace'),
    level: levelField(body, 'user'),
    ...(stringField(body, 'version') === undefined ? {} : { version: stringField(body, 'version') }),
  }
  const cwd = stringField(body, 'cwd') ?? process.cwd()
  const result = await installFromMarket(deps, request, signal, cwd)
  return { ok: true, ...result }
}

/** Ack route: the skill was removed. Returns the bare success envelope. */
async function handleUninstall(body: Record<string, unknown>): Promise<ApiResponse<object>> {
  const name = stringField(body, 'name')
  if (name === undefined) throw new Error('name is required')
  const cwd = stringField(body, 'cwd') ?? process.cwd()
  await removeSkill(levelRoot(levelField(body, 'user'), cwd), name)
  return { ok: true }
}

async function handlePromote(body: Record<string, unknown>): Promise<ApiResponse<PromotePayload>> {
  const name = stringField(body, 'name')
  if (name === undefined) throw new Error('name is required')
  const cwd = stringField(body, 'cwd') ?? process.cwd()
  const path = await moveSkill(projectSkillsDir(cwd), userSkillsDir(), name)
  return { ok: true, path }
}

/** Ack route: the invocation flags were written. Returns the bare success envelope. */
async function handleSetInvocation(body: Record<string, unknown>): Promise<ApiResponse<object>> {
  const name = stringField(body, 'name')
  if (name === undefined) throw new Error('name is required')
  const cwd = stringField(body, 'cwd') ?? process.cwd()
  const modelInvocable = boolField(body, 'modelInvocable')
  const userInvocable = boolField(body, 'userInvocable')
  if (modelInvocable === undefined && userInvocable === undefined) {
    throw new Error('modelInvocable or userInvocable is required')
  }
  const request: SetInvocationRequest = {
    name,
    level: levelField(body, 'user'),
    ...(modelInvocable === undefined ? {} : { modelInvocable }),
    ...(userInvocable === undefined ? {} : { userInvocable }),
  }
  await setSkillInvocation(levelRoot(request.level, cwd), name, {
    ...(request.modelInvocable === undefined ? {} : { modelInvocable: request.modelInvocable }),
    ...(request.userInvocable === undefined ? {} : { userInvocable: request.userInvocable }),
  })
  return { ok: true }
}

async function handleDetail(deps: ApiDeps, body: Record<string, unknown>, signal: AbortSignal): Promise<ApiResponse<DetailPayload>> {
  const slug = stringField(body, 'slug')
  const namespace = stringField(body, 'namespace')
  if (slug === undefined || namespace === undefined) throw new Error('slug and namespace are required')
  const safeSlug = assertSafeSegment(slug, 'slug')
  const safeNamespace = assertSafeSegment(namespace, 'namespace')

  // Detail view honors the same primary -> mirror fallback as search.
  const hosts = [SKILLHUB_PRIMARY_HOST, SKILLHUB_MIRROR_HOST]
  let lastError: unknown
  for (const host of hosts) {
    try {
      const detail = await fetchSkillDetail(deps.fetchImpl, { host, slug: safeSlug, namespace: safeNamespace }, { signal })
      return { ok: true, detail, source: host === SKILLHUB_PRIMARY_HOST ? 'skillhub' : 'skillhub-mirror' }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error(errorText(lastError))
}

/** Route table: sub-path -> handler. */
const ROUTES: Record<string, (deps: ApiDeps, body: Record<string, unknown>, signal: AbortSignal) => Promise<ApiResponse<object>>> = {
  '/search': handleSearch,
  '/categories': (deps, _body, signal) => handleCategories(deps, signal),
  '/installed': (_deps, body) => handleInstalled(body),
  '/install': handleInstall,
  '/uninstall': (_deps, body) => handleUninstall(body),
  '/promote': (_deps, body) => handlePromote(body),
  '/set-invocation': (_deps, body) => handleSetInvocation(body),
  '/detail': handleDetail,
}

/**
 * Handle one API request.
 * @param deps - plugin dependencies (fetch).
 * @param req - incoming request.
 * @param res - response to own for the full lifecycle.
 */
export async function handleApiRequest(
  deps: ApiDeps,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (req.method !== 'POST') {
      sendError(res, 'method not allowed', 'method-not-allowed')
      return
    }
    if (!originAllowed(req)) {
      sendError(res, 'cross-origin request rejected', 'forbidden-origin')
      return
    }
    const contentType = req.headers['content-type'] ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      sendError(res, 'content-type must be application/json', 'unsupported-media-type')
      return
    }

    const pathname = (req.url ?? '').split('?')[0] ?? ''
    const sub = pathname.startsWith(API_PREFIX) ? pathname.slice(API_PREFIX.length) : pathname
    const handler = ROUTES[sub]
    if (handler === undefined) {
      sendError(res, 'unknown endpoint', 'not-found')
      return
    }

    const controller = new AbortController()
    // The panel may navigate away mid-install, so upstream work must stop with
    // it. Watch `res`, not `req`: `req`'s 'close' also fires when the request has
    // merely been fully *consumed*, which would abort every upstream call that is
    // slower than the body read. `writableEnded` tells the two apart — true once
    // we have answered, false when the client really went away.
    res.on('close', () => {
      if (!res.writableEnded) controller.abort(new Error('client disconnected'))
    })

    const body = await readJsonBody(req)
    const result = await handler(deps, body, controller.signal)
    sendJson(res, result)
  } catch (error) {
    if (error instanceof Error && error.name === 'SkillAlreadyExists') {
      sendError(res, 'already-exists', 'already-exists')
      return
    }
    sendError(res, errorText(error))
  }
}
