/**
 * Typed client for the Host half's same-origin JSON API.
 *
 * The browser half never talks to SkillHub directly: none of the upstream
 * endpoints send CORS headers, so every market call is proxied by the Host
 * route registered on the composition's `webServer`.
 */

import type {
  ApiResponse,
  InstallRequest,
  InstallResult,
  InstalledSkill,
  MarketCategory,
  MarketItem,
  MarketPage,
  SetInvocationRequest,
  SkillLevel,
} from '../shared/types.ts'
import type { SkillDetail } from '../shared/skillhub.ts'

/** Route prefix, mirroring the Host half. */
export const API_BASE = '/plugins/dsh-skill-market/api'

/** Fired when a request cannot reach the Host route at all. */
export class MarketTransportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MarketTransportError'
  }
}

/**
 * POST one JSON request to the Host route.
 *
 * The route answers HTTP 200 with `{ ok: false, error }` for handled failures,
 * so only a transport-level problem (route missing, network down) reaches the
 * catch below.
 * @param path - sub-path below {@link API_BASE}.
 * @param body - JSON request body.
 * @returns the parsed envelope.
 */
async function post<T>(path: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new MarketTransportError(error instanceof Error ? error.message : String(error))
  }
  if (!response.ok) throw new MarketTransportError(`HTTP ${response.status}`)
  try {
    return (await response.json()) as ApiResponse<T>
  } catch {
    throw new MarketTransportError('malformed response from the skill-market route')
  }
}

/** Throw the envelope's error message, or return the payload. */
function unwrap<T>(envelope: ApiResponse<T>): T {
  if (!envelope.ok) {
    const error = new Error(envelope.error)
    if (envelope.kind !== undefined) error.name = envelope.kind
    throw error
  }
  return envelope
}

/** Search/browse the market. */
export async function searchMarket(request: {
  keyword?: string
  category?: string
  sortBy?: string
  page?: number
  pageSize?: number
}): Promise<MarketPage> {
  return unwrap(await post<MarketPage>('/search', { ...request }))
}

/** Load the category table (live, with a built-in fallback). */
export async function loadCategories(): Promise<{ categories: MarketCategory[]; degraded: boolean }> {
  return unwrap(await post<{ categories: MarketCategory[]; degraded: boolean }>('/categories', {}))
}

/** List installed skills plus the resolved directories. */
export async function listInstalled(): Promise<{
  skills: InstalledSkill[]
  projectDir: string
  userDir: string
}> {
  return unwrap(await post<{ skills: InstalledSkill[]; projectDir: string; userDir: string }>('/installed', {}))
}

/** Install one skill at the requested level. */
export async function installSkill(request: InstallRequest): Promise<InstallResult> {
  return unwrap(await post<InstallResult>('/install', { ...request }))
}

/** Remove one installed skill. */
export async function uninstallSkill(request: { name: string; level: SkillLevel }): Promise<void> {
  unwrap(await post<Record<string, never>>('/uninstall', { ...request }))
}

/** Promote a project-level skill to user level. */
export async function promoteSkill(request: { name: string }): Promise<{ path: string }> {
  return unwrap(await post<{ path: string }>('/promote', { ...request }))
}

/** Flip one or both invocation switches of an installed skill. */
export async function setInvocation(request: SetInvocationRequest): Promise<void> {
  unwrap(await post<Record<string, never>>('/set-invocation', { ...request }))
}

/** Fetch a skill's detail record (overview comes from the packaged SKILL.md). */
export async function fetchDetail(request: { slug: string; namespace: string }): Promise<{ detail: SkillDetail }> {
  return unwrap(await post<{ detail: SkillDetail }>('/detail', { ...request }))
}

/** Re-exported so callers do not need a second import for row rendering. */
export type { MarketItem }
