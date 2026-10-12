/**
 * The market panel — the `shell.overlay` occupant.
 *
 * `shell.overlay` is a frame-wide, root-scoped `list`, and the layer itself is
 * click-through by contract: this component only re-enables pointer events on
 * its own nodes, so the app underneath stays interactive everywhere else.
 *
 * All state lives in {@link SkillMarketStore} outside React; components read it
 * through the framework-bound `useMarket` selector hook (threaded down as a
 * prop, since the hook is registration-scoped) and call plain action callbacks.
 * Nothing here talks to the network directly.
 */

import { useEffect, useMemo, type ReactNode } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { MarketItem, MarketSort, SkillLevel } from '../shared/types.ts'
import type { SkillDetail } from '../shared/skillhub.ts'
import type { InstalledSkillView, PanelSnapshot, PanelTab } from './store.ts'
import type { TranslateFn } from './i18n.ts'

/** Framework-bound selector hook over the panel snapshot. */
export type MarketSelector = SnapshotSelectorHook<PanelSnapshot>

/** Action surface the panel drives, supplied through the registration's inject face. */
export interface PanelActions {
  close: () => void
  setTab: (tab: PanelTab) => void
  clearNotice: () => void
  setKeyword: (keyword: string) => void
  submitSearch: () => void
  setCategory: (category: string) => void
  setSortBy: (sortBy: MarketSort) => void
  goToPage: (page: number) => void
  refresh: () => void
  install: (item: MarketItem, level: SkillLevel) => void
  openDetail: (item: MarketItem) => void
  closeDetail: () => void
  setInstalledFilter: (filter: string) => void
  setInstalledLevel: (level: PanelSnapshot['installed']['level']) => void
  uninstall: (skill: InstalledSkillView) => void
  promote: (skill: InstalledSkillView) => void
  setInvocation: (skill: InstalledSkillView, surface: 'modelInvocable' | 'userInvocable', value: boolean) => void
}

/** Props composed by the framework for the `shell.overlay` occupant. */
export interface SkillMarketOverlayProps {
  actions: PanelActions
  t: TranslateFn
  useMarket: MarketSelector
}

/** Shared props of the panel's inner views. */
interface ViewProps {
  actions: PanelActions
  t: TranslateFn
  useMarket: MarketSelector
}

/** Compact stat line for a market row. */
function statsLine(item: MarketItem): string {
  const parts: string[] = []
  if (item.downloads > 0) parts.push(`↓ ${item.downloads}`)
  if (item.installs > 0) parts.push(`⤓ ${item.installs}`)
  if (item.stars > 0) parts.push(`★ ${item.stars}`)
  return parts.join('   ')
}

/** Localised label for a level bucket. */
function levelLabel(t: TranslateFn, level: PanelSnapshot['installed']['level']): string {
  if (level === 'project') return t('installed.level.project')
  if (level === 'user') return t('installed.level.user')
  if (level === 'builtin') return t('installed.level.builtin')
  return t('installed.level.all')
}

/** Label for the source that served the current page. */
function sourceLabelOf(t: TranslateFn, source: string): string {
  if (source === 'skillhub') return t('market.source.skillhub')
  if (source === 'skillhub-mirror') return t('market.source.skillhub-mirror')
  return t('market.source.local')
}

/* ------------------------------------------------------------------ */
/* Market tab                                                          */
/* ------------------------------------------------------------------ */

function MarketRow({ item, actions, t, busyKey }: {
  item: MarketItem
  actions: PanelActions
  t: TranslateFn
  busyKey: string
}): ReactNode {
  const key = `${item.namespace}/${item.slug}`
  const installing = busyKey === key
  const blocked = busyKey !== '' || item.namespace === ''
  return (
    <div className="smk-row">
      <div className="smk-row-main">
        <div className="smk-row-title">
          <button
            type="button"
            className="smk-link"
            onClick={() => actions.openDetail(item)}
            title={item.name}
          >
            <span className="smk-row-name">{item.name}</span>
          </button>
          <span className="smk-row-id">
            {item.namespace === '' ? item.slug : `@${item.namespace}/${item.slug}`}
          </span>
        </div>
        {item.description === '' ? null : <div className="smk-row-desc">{item.description}</div>}
        <div className="smk-row-stats">
          {statsLine(item)}
          {item.category === '' ? null : `   #${item.category}`}
        </div>
      </div>
      <div className="smk-row-actions">
        <button
          type="button"
          className="smk-btn"
          data-variant="primary"
          data-size="sm"
          disabled={blocked}
          onClick={() => actions.install(item, 'user')}
        >
          {installing ? t('install.installing') : t('install.user')}
        </button>
        <button
          type="button"
          className="smk-btn"
          data-size="sm"
          disabled={blocked}
          onClick={() => actions.install(item, 'project')}
        >
          {t('install.project')}
        </button>
      </div>
    </div>
  )
}

function MarketTab({ actions, t, useMarket }: ViewProps): ReactNode {
  const market = useMarket(snapshot => snapshot.market)
  const categories = useMarket(snapshot => snapshot.categories)
  const categoriesDegraded = useMarket(snapshot => snapshot.categoriesDegraded)
  const result = market.result

  return (
    <>
      <div className="smk-toolbar">
        <input
          className="smk-input"
          value={market.keyword}
          placeholder={t('search.placeholder')}
          onChange={event => actions.setKeyword(event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') actions.submitSearch() }}
        />
        <select
          className="smk-select"
          value={market.category}
          onChange={event => actions.setCategory(event.currentTarget.value)}
        >
          <option value="">{t('filter.allCategories')}</option>
          {categories.map(category => (
            <option key={category.key} value={category.key}>{category.name}</option>
          ))}
        </select>
        <select
          className="smk-select"
          value={market.sortBy}
          onChange={event => actions.setSortBy(event.currentTarget.value as MarketSort)}
        >
          {(['score', 'downloads', 'stars', 'updated_at'] as const).map(sort => (
            <option key={sort} value={sort}>{t(`sort.${sort}` as const)}</option>
          ))}
        </select>
        <button type="button" className="smk-btn" data-variant="primary" onClick={actions.submitSearch}>
          {t('search.button')}
        </button>
      </div>

      <div className="smk-meta">
        {result === null ? null : (
          <>
            <span>{t('market.total', { total: result.total })}</span>
            <span className="smk-chip">{sourceLabelOf(t, result.source)}</span>
            {result.degraded
              ? <span className="smk-chip" data-tone="warn">{t('market.degraded', { source: sourceLabelOf(t, result.source) })}</span>
              : null}
            {categoriesDegraded ? <span className="smk-chip" data-tone="warn">categories: built-in</span> : null}
          </>
        )}
      </div>

      {market.error === null ? null : <div className="smk-error">{market.error}</div>}

      {result !== null && result.items.length > 0 ? (
        <div className="smk-list">
          {result.items.map(item => (
            <MarketRow
              key={`${item.namespace}/${item.slug}`}
              item={item}
              actions={actions}
              t={t}
              busyKey={market.installingKey}
            />
          ))}
        </div>
      ) : market.loading ? (
        <div className="smk-loading">{t('market.loading')}</div>
      ) : market.error === null ? (
        <div className="smk-empty">{t('market.empty')}</div>
      ) : null}

      <div className="smk-footer">
        <span>{result === null ? '' : t('market.total', { total: result.total })}</span>
        <div className="smk-pager">
          <button
            type="button"
            className="smk-btn"
            data-size="sm"
            disabled={market.page <= 1 || market.loading}
            onClick={() => actions.goToPage(market.page - 1)}
          >
            ‹
          </button>
          <span>{market.page}</span>
          <button
            type="button"
            className="smk-btn"
            data-size="sm"
            disabled={market.loading || result === null || market.page * result.pageSize >= result.total}
            onClick={() => actions.goToPage(market.page + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Installed tab                                                       */
/* ------------------------------------------------------------------ */

function InstalledRow({ skill, actions, t }: {
  skill: InstalledSkillView
  actions: PanelActions
  t: TranslateFn
}): ReactNode {
  return (
    <div className="smk-row">
      <div className="smk-row-main">
        <div className="smk-row-title">
          <span className="smk-row-name">{skill.name}</span>
          <span className="smk-row-id">{skill.dir}</span>
          <span className="smk-chip">{levelLabel(t, skill.level)}</span>
          {skill.manageable ? null : <span className="smk-chip" data-tone="warn">{t('installed.readonly')}</span>}
        </div>
        {skill.description === '' ? null : <div className="smk-row-desc">{skill.description}</div>}
        <div className="smk-switches">
          <label className="smk-switch" data-readonly={skill.manageable ? 'false' : 'true'} title={t('installed.model.hint')}>
            <input
              type="checkbox"
              checked={skill.modelInvocable}
              disabled={!skill.manageable || skill.pending !== undefined}
              onChange={event => actions.setInvocation(skill, 'modelInvocable', event.currentTarget.checked)}
            />
            {t('installed.model')}
          </label>
          <label className="smk-switch" data-readonly={skill.manageable ? 'false' : 'true'} title={t('installed.user.hint')}>
            <input
              type="checkbox"
              checked={skill.userInvocable}
              disabled={!skill.manageable || skill.pending !== undefined}
              onChange={event => actions.setInvocation(skill, 'userInvocable', event.currentTarget.checked)}
            />
            {t('installed.user')}
          </label>
        </div>
      </div>
      <div className="smk-row-actions">
        {skill.level === 'project' && skill.manageable ? (
          <button
            type="button"
            className="smk-btn"
            data-size="sm"
            onClick={() => actions.promote(skill)}
            title={t('installed.promote.hint')}
          >
            {t('installed.promote')}
          </button>
        ) : null}
        <button
          type="button"
          className="smk-btn"
          data-size="sm"
          data-variant="danger"
          disabled={!skill.manageable}
          onClick={() => {
            if (window.confirm(t('installed.confirmDelete', { name: skill.name }))) actions.uninstall(skill)
          }}
        >
          {t('installed.delete')}
        </button>
      </div>
    </div>
  )
}

function InstalledTab({ actions, t, useMarket }: ViewProps): ReactNode {
  const installed = useMarket(snapshot => snapshot.installed)
  const rows = useMemo(() => {
    const filter = installed.filter.trim().toLowerCase()
    return installed.skills.filter(skill => {
      if (installed.level !== 'all' && skill.level !== installed.level) return false
      if (filter === '') return true
      return skill.name.toLowerCase().includes(filter)
        || skill.dir.toLowerCase().includes(filter)
        || skill.description.toLowerCase().includes(filter)
    })
  }, [installed.filter, installed.level, installed.skills])

  return (
    <>
      <div className="smk-toolbar">
        <input
          className="smk-input"
          value={installed.filter}
          placeholder={t('installed.filter.placeholder')}
          onChange={event => actions.setInstalledFilter(event.currentTarget.value)}
        />
        <select
          className="smk-select"
          value={installed.level}
          onChange={event => actions.setInstalledLevel(event.currentTarget.value as PanelSnapshot['installed']['level'])}
        >
          {(['all', 'project', 'user', 'builtin'] as const).map(level => (
            <option key={level} value={level}>{levelLabel(t, level)}</option>
          ))}
        </select>
        <button type="button" className="smk-btn" onClick={() => actions.refresh()}>{t('action.refresh')}</button>
      </div>

      <div className="smk-dirs">
        {installed.projectDir === '' ? null : <div>project: {installed.projectDir}</div>}
        {installed.userDir === '' ? null : <div>user: {installed.userDir}</div>}
      </div>

      {installed.error === null ? null : <div className="smk-error">{installed.error}</div>}

      {installed.skills.length === 0 && installed.loading ? (
        <div className="smk-loading">{t('installed.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="smk-empty">{t('installed.empty')}</div>
      ) : (
        <div className="smk-list">
          {rows.map(skill => (
            <InstalledRow key={`${skill.level}:${skill.dir}`} skill={skill} actions={actions} t={t} />
          ))}
        </div>
      )}

      <div className="smk-footer">
        <span>{rows.length} / {installed.skills.length}</span>
        <span>{installed.loading ? t('installed.loading') : ''}</span>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

function DetailView({ actions, t, useMarket }: ViewProps): ReactNode {
  const detail = useMarket(snapshot => snapshot.detail)
  const item = detail.item
  const record: SkillDetail | null = detail.detail
  if (item === null) return null

  const body = record === null
    ? (item.description === '' ? t('detail.noReadme') : item.description)
    : (record.readme === '' ? (record.summary === '' ? t('detail.noReadme') : record.summary) : record.readme)

  return (
    <div className="smk-detail">
      <div className="smk-detail-head">
        <button type="button" className="smk-btn" data-size="sm" onClick={actions.closeDetail}>
          {t('detail.back')}
        </button>
        <strong>{item.name}</strong>
        <span className="smk-row-id">
          {item.namespace === '' ? item.slug : `@${item.namespace}/${item.slug}`}
        </span>
        {record !== null && record.version !== ''
          ? <span className="smk-chip">{t('detail.version', { version: record.version })}</span>
          : null}
        {item.pageUrl === ''
          ? null
          : (
            <a className="smk-btn" data-size="sm" href={item.pageUrl} target="_blank" rel="noreferrer noopener">
              {t('detail.openPage')}
            </a>
          )}
      </div>

      {detail.loading ? <div className="smk-loading">{t('market.loading')}</div> : null}
      {detail.error === null ? null : <div className="smk-error">{detail.error}</div>}

      {record !== null && record.tags.length > 0 ? (
        <div className="smk-meta" style={{ padding: '0 0 8px' }}>
          {record.tags.slice(0, 8).map(tag => <span key={tag} className="smk-chip">{tag}</span>)}
        </div>
      ) : null}

      <div className="smk-detail-body">{body}</div>

      <div className="smk-detail-actions">
        <button
          type="button"
          className="smk-btn"
          data-variant="primary"
          data-size="sm"
          disabled={item.namespace === ''}
          onClick={() => actions.install(item, 'user')}
        >
          {t('install.user')}
        </button>
        <button
          type="button"
          className="smk-btn"
          data-size="sm"
          disabled={item.namespace === ''}
          onClick={() => actions.install(item, 'project')}
        >
          {t('install.project')}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

/**
 * The overlay occupant.
 *
 * Each selector returns either a primitive or a sub-object whose identity only
 * changes when that slice changes, so the renderer's `Object.is` comparison sees
 * a stable snapshot between unrelated mutations.
 * @param props - injected actions/copy plus the framework-bound selector hook.
 */
export function SkillMarketOverlay(props: SkillMarketOverlayProps): ReactNode {
  const { actions, t, useMarket } = props
  const open = useMarket(snapshot => snapshot.open)
  const tab = useMarket(snapshot => snapshot.tab)
  const notice = useMarket(snapshot => snapshot.notice)
  const detailItem = useMarket(snapshot => snapshot.detail.item)

  const detailOpen = detailItem !== null

  // Esc closes the detail view first, then the panel. Bound only while open.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (detailOpen) actions.closeDetail()
      else actions.close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [open, detailOpen, actions])

  if (!open) return null

  return (
    <div className="smk-layer">
      <div className="smk-mask" onClick={actions.close} aria-hidden="true" />
      <div className="smk-panel" role="dialog" aria-modal="true" aria-label={t('panel.title')}>
        <div className="smk-head">
          <div className="smk-head-main">
            <h2 className="smk-title">{t('panel.title')}</h2>
            <p className="smk-subtitle">{t('panel.subtitle')}</p>
          </div>
          <button type="button" className="smk-icon-btn" onClick={actions.close} aria-label={t('action.close')}>✕</button>
        </div>

        <div className="smk-tabs">
          {(['market', 'installed'] as const).map(value => (
            <button
              key={value}
              type="button"
              className="smk-tab"
              data-on={tab === value ? 'true' : 'false'}
              onClick={() => { actions.clearNotice(); actions.setTab(value) }}
            >
              {t(value === 'market' ? 'tab.market' : 'tab.installed')}
            </button>
          ))}
        </div>

        {notice === null ? null : (
          <div className="smk-notice" data-kind={notice.kind} onDoubleClick={actions.clearNotice}>{notice.text}</div>
        )}

        {detailOpen
          ? <DetailView actions={actions} t={t} useMarket={useMarket} />
          : tab === 'market'
            ? <MarketTab actions={actions} t={t} useMarket={useMarket} />
            : <InstalledTab actions={actions} t={t} useMarket={useMarket} />}
      </div>
    </div>
  )
}
