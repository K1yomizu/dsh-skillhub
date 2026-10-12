/**
 * Panel state store.
 *
 * Deliberately framework-free: a plain `getSnapshot`/`subscribe` pair (the
 * `HostObservable` shape) with an immutable snapshot, exactly the pattern the
 * documented `hooks` compartment consumes. React never enters this file; the
 * renderer binds `useMarket(selector)` from the source at its own side.
 *
 * Referential-stability rule: every nested object and array in the snapshot is
 * rebuilt only when its own content changes, so selectors returning sub-objects
 * stay stable between unrelated mutations and `Object.is` comparison does not
 * thrash.
 */

import type { MarketCategory, MarketItem, MarketPage, MarketSort, SkillLevel } from '../shared/types.ts'
import type { SkillDetail } from '../shared/skillhub.ts'
import type { TranslateFn } from './i18n.ts'
import * as api from './api.ts'

/** Panel tab. */
export type PanelTab = 'market' | 'installed'

/** Market tab state. */
export interface MarketTabState {
  keyword: string
  category: string
  sortBy: MarketSort
  page: number
  loading: boolean
  error: string | null
  /** The last successful page, retained while a new one loads. */
  result: MarketPage | null
  /** `source:itemKey` of the row currently being installed. */
  installingKey: string
  /** Rows installed during this panel session, keyed `namespace/slug`. */
  installedKeys: readonly string[]
}

/** Installed tab state. */
export interface InstalledTabState {
  loading: boolean
  error: string | null
  skills: readonly InstalledSkillView[]
  projectDir: string
  userDir: string
  filter: string
  level: 'all' | SkillLevel | 'builtin'
}

/** One installed row plus its in-flight switch state. */
export interface InstalledSkillView {
  level: SkillLevel | 'builtin'
  manageable: boolean
  source: string
  dir: string
  name: string
  description: string
  modelInvocable: boolean
  userInvocable: boolean
  /** `dir:surface` of a switch currently being written. */
  pending?: string
}

/** Detail view state. */
export interface DetailState {
  loading: boolean
  item: MarketItem | null
  detail: SkillDetail | null
  error: string | null
}

/** Transient banner. */
export interface Notice {
  kind: 'ok' | 'error'
  text: string
}

/** Full immutable panel snapshot. */
export interface PanelSnapshot {
  open: boolean
  tab: PanelTab
  loaded: boolean
  market: MarketTabState
  installed: InstalledTabState
  categories: readonly MarketCategory[]
  categoriesDegraded: boolean
  detail: DetailState
  notice: Notice | null
}

const INITIAL_MARKET: MarketTabState = {
  keyword: '',
  category: '',
  sortBy: 'score',
  page: 1,
  loading: false,
  error: null,
  result: null,
  installingKey: '',
  installedKeys: [],
}

const INITIAL_INSTALLED: InstalledTabState = {
  loading: false,
  error: null,
  skills: [],
  projectDir: '',
  userDir: '',
  filter: '',
  level: 'all',
}

const INITIAL_DETAIL: DetailState = { loading: false, item: null, detail: null, error: null }

/** Key identifying one market row. */
export function rowKey(item: Pick<MarketItem, 'namespace' | 'slug'>): string {
  return `${item.namespace}/${item.slug}`
}

/** Map a SkillSource label to the level bucket the panel groups by. */
function levelOf(source: string, level: SkillLevel): SkillLevel | 'builtin' {
  return source.endsWith('dsh') ? 'builtin' : level
}

/**
 * Observable panel store.
 *
 * Snapshot identity changes only on mutation, which is what the renderer's
 * `useMarket` selector hook requires.
 */
export class SkillMarketStore {
  private snapshot: PanelSnapshot = {
    open: false,
    tab: 'market',
    loaded: false,
    market: INITIAL_MARKET,
    installed: INITIAL_INSTALLED,
    categories: [],
    categoriesDegraded: false,
    detail: INITIAL_DETAIL,
    notice: null,
  }

  private readonly listeners = new Set<() => void>()

  /** Read the current snapshot (identity-stable between mutations). */
  getSnapshot(): PanelSnapshot {
    return this.snapshot
  }

  /** Subscribe to snapshot changes. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private commit(patch: Partial<PanelSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of this.listeners) listener()
  }

  private patchMarket(patch: Partial<MarketTabState>): void {
    this.commit({ market: { ...this.snapshot.market, ...patch } })
  }

  private patchInstalled(patch: Partial<InstalledTabState>): void {
    this.commit({ installed: { ...this.snapshot.installed, ...patch } })
  }

  /* ---------------------------------------------------------------- */
  /* Panel lifecycle                                                   */
  /* ---------------------------------------------------------------- */

  /** Open the panel, running the first load exactly once. */
  open(): void {
    this.commit({ open: true })
    if (!this.snapshot.loaded) {
      this.commit({ loaded: true })
      void this.loadCategories()
      void this.search()
      void this.loadInstalled()
    }
  }

  /** Close the panel and drop any transient notice. */
  close(): void {
    this.commit({ open: false, notice: null, detail: INITIAL_DETAIL })
  }

  /** Flip the panel's visibility. */
  toggle(): void {
    if (this.snapshot.open) this.close()
    else this.open()
  }

  /** Select a tab. */
  setTab(tab: PanelTab): void {
    if (this.snapshot.tab === tab) return
    this.commit({ tab })
    if (tab === 'installed') void this.loadInstalled()
  }

  /** Dismiss the current notice. */
  clearNotice(): void {
    if (this.snapshot.notice !== null) this.commit({ notice: null })
  }

  private notify(kind: Notice['kind'], text: string): void {
    this.commit({ notice: { kind, text } })
  }

  /* ---------------------------------------------------------------- */
  /* Market tab                                                        */
  /* ---------------------------------------------------------------- */

  /** Update the search box (no request). */
  setKeyword(keyword: string): void {
    this.patchMarket({ keyword })
  }

  /** Update the category filter and re-query immediately. */
  setCategory(category: string): void {
    this.patchMarket({ category, page: 1 })
    void this.search()
  }

  /** Update the sort key and re-query immediately. */
  setSortBy(sortBy: MarketSort): void {
    this.patchMarket({ sortBy, page: 1 })
    void this.search()
  }

  /** Move one page and re-query. */
  goToPage(page: number): void {
    if (page < 1) return
    this.patchMarket({ page })
    void this.search()
  }

  /** Run the current query. */
  async search(): Promise<void> {
    const { keyword, category, sortBy, page } = this.snapshot.market
    this.patchMarket({ loading: true, error: null })
    try {
      const result = await api.searchMarket({
        ...(keyword.trim() === '' ? {} : { keyword: keyword.trim() }),
        ...(category === '' ? {} : { category }),
        sortBy,
        page,
      })
      this.patchMarket({ loading: false, result, error: null })
    } catch (error) {
      this.patchMarket({ loading: false, error: messageOf(error) })
    }
  }

  /** Load the category table, falling back to the built-in copy. */
  async loadCategories(): Promise<void> {
    try {
      const loaded = await api.loadCategories()
      this.commit({ categories: loaded.categories, categoriesDegraded: loaded.degraded })
    } catch {
      // The panel can still search without a category filter.
      this.commit({ categories: [], categoriesDegraded: true })
    }
  }

  /* ---------------------------------------------------------------- */
  /* Install / uninstall                                               */
  /* ---------------------------------------------------------------- */

  /**
   * Install one market row at the requested level.
   * @param item - the row.
   * @param level - target level.
   * @param t - translate function for the result notice.
   */
  async install(item: MarketItem, level: SkillLevel, t: TranslateFn): Promise<void> {
    const key = rowKey(item)
    if (this.snapshot.market.installingKey !== '') return
    this.patchMarket({ installingKey: key })
    try {
      const result = await api.installSkill({ slug: item.slug, namespace: item.namespace, level })
      this.patchMarket({
        installingKey: '',
        installedKeys: this.snapshot.market.installedKeys.includes(key)
          ? this.snapshot.market.installedKeys
          : [...this.snapshot.market.installedKeys, key],
      })
      this.notify('ok', t('notice.installed', {
        name: item.name,
        level: t(level === 'user' ? 'installed.level.user' : 'installed.level.project'),
        count: result.fileCount,
      }))
      await this.loadInstalled()
    } catch (error) {
      this.patchMarket({ installingKey: '' })
      this.notify('error', messageOf(error))
    }
  }

  /** Remove an installed skill. */
  async uninstall(skill: InstalledSkillView, t: TranslateFn): Promise<void> {
    try {
      await api.uninstallSkill({ name: skill.dir, level: skill.level === 'builtin' ? 'user' : skill.level })
      this.notify('ok', t('notice.removed', { name: skill.name }))
      await this.loadInstalled()
    } catch (error) {
      this.notify('error', messageOf(error))
    }
  }

  /** Promote a project-level skill to user level. */
  async promote(skill: InstalledSkillView, t: TranslateFn): Promise<void> {
    try {
      await api.promoteSkill({ name: skill.dir })
      this.notify('ok', t('notice.promoted', { name: skill.name }))
      await this.loadInstalled()
    } catch (error) {
      this.notify('error', messageOf(error))
    }
  }

  /**
   * Flip one invocation switch, optimistically updating the row.
   * @param skill - the row.
   * @param surface - which switch.
   * @param value - new value.
   * @param t - translate function for the result notice.
   */
  async setInvocation(
    skill: InstalledSkillView,
    surface: 'modelInvocable' | 'userInvocable',
    value: boolean,
    t: TranslateFn,
  ): Promise<void> {
    const pending = `${skill.dir}:${surface}`
    this.patchInstalled({
      skills: this.snapshot.installed.skills.map(row =>
        row.dir === skill.dir ? { ...row, pending, [surface]: value } : row),
    })
    try {
      await api.setInvocation({
        name: skill.dir,
        level: skill.level === 'builtin' ? 'user' : skill.level,
        [surface]: value,
      })
      this.notify('ok', t('notice.updated', { name: skill.name }))
      await this.loadInstalled()
    } catch (error) {
      this.notify('error', messageOf(error))
      // Re-read the truth from disk after a failed write.
      await this.loadInstalled()
    }
  }

  /* ---------------------------------------------------------------- */
  /* Installed tab                                                     */
  /* ---------------------------------------------------------------- */

  /** Update the installed-list text filter. */
  setInstalledFilter(filter: string): void {
    this.patchInstalled({ filter })
  }

  /** Update the installed-list level filter. */
  setInstalledLevel(level: InstalledTabState['level']): void {
    this.patchInstalled({ level })
  }

  /** Reload the installed list and the resolved directories. */
  async loadInstalled(): Promise<void> {
    this.patchInstalled({ loading: true, error: null })
    try {
      const loaded = await api.listInstalled()
      this.patchInstalled({
        loading: false,
        error: null,
        projectDir: loaded.projectDir,
        userDir: loaded.userDir,
        skills: loaded.skills.map(skill => ({
          level: levelOf(skill.source, skill.level),
          manageable: skill.manageable,
          source: skill.source,
          dir: skill.dir,
          name: skill.name,
          description: skill.description,
          modelInvocable: skill.modelInvocable,
          userInvocable: skill.userInvocable,
        })),
      })
    } catch (error) {
      this.patchInstalled({ loading: false, error: messageOf(error) })
    }
  }

  /* ---------------------------------------------------------------- */
  /* Detail view                                                       */
  /* ---------------------------------------------------------------- */

  /** Open the detail view for one market row. */
  async openDetail(item: MarketItem): Promise<void> {
    this.commit({ detail: { loading: true, item, detail: null, error: null } })
    if (item.namespace === '') {
      this.commit({ detail: { loading: false, item, detail: null, error: null } })
      return
    }
    try {
      const loaded = await api.fetchDetail({ slug: item.slug, namespace: item.namespace })
      this.commit({ detail: { loading: false, item, detail: loaded.detail, error: null } })
    } catch (error) {
      this.commit({ detail: { loading: false, item, detail: null, error: messageOf(error) } })
    }
  }

  /** Close the detail view. */
  closeDetail(): void {
    this.commit({ detail: INITIAL_DETAIL })
  }
}

/** Normalise an unknown thrown value into a readable message. */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
