/**
 * Browser half of `dsh-skillhub`.
 *
 * Three registrations, all effect-scoped so plugin unload removes them cleanly:
 *
 *   1. the stylesheet, into `document.head`;
 *   2. the sidebar footer entry into `sidebar.footer.action` (a root list);
 *   3. the panel into `shell.overlay` (a root list, click-through by contract).
 *
 * Both slots are `list`-cardinality, so this contributes fresh ids beside the
 * shipped occupants instead of replacing them — which also means the entry order
 * is ours to choose. `order` is negative because the host's own Cordis Plugin
 * entry sits at 0 with an upward-expanding popover; ordering after it would put
 * this button underneath that popover.
 *
 * `ctx.slots.inject(key, cb)` rather than a bare `register` is deliberate: the
 * sidebar and the app frame are themselves slot occupants, so the callback runs
 * on each declaration lifetime and the contributions survive a remount of the
 * owner.
 */

import type { Context } from '@deepseek-ai/cordis'
import { bindTranslate, detectLocale } from './i18n.ts'
import { SkillMarketEntry } from './entry.tsx'
import { SkillMarketOverlay, type PanelActions } from './panel.tsx'
import { PANEL_CSS } from './styles.ts'
import { SkillMarketStore } from './store.ts'

/** Plugin id inside the client composition; must equal the package name. */
export const name = 'dsh-skillhub'

/** The slots registry is the only service this half needs. */
export const inject = ['slots']

/** Panel entry id in `sidebar.footer.action`. */
const ENTRY_ID = 'skill-hub'

/** Panel entry id in `shell.overlay`. */
const OVERLAY_ID = 'skill-hub-panel'

/** Footer entry order. Negative keeps it clear of the host's own popover row. */
const ENTRY_ORDER = -40

/**
 * Mount the browser half.
 * @param ctx - client root context carrying the `slots` service.
 */
export function apply(ctx: Context): void {
  const t = bindTranslate(detectLocale())
  const store = new SkillMarketStore()

  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset['plugin'] = name
    tag.textContent = PANEL_CSS
    document.head.appendChild(tag)
    return () => { tag.remove() }
  }, 'skill-hub: panel styles')

  // Built once so the injected `actions` object keeps a stable identity; the
  // overlay's Esc-binding effect depends on it.
  const actions: PanelActions = {
    close: () => { store.close() },
    setTab: tab => { store.setTab(tab) },
    clearNotice: () => { store.clearNotice() },
    setKeyword: keyword => { store.setKeyword(keyword) },
    submitSearch: () => { void store.search() },
    setCategory: category => { store.setCategory(category) },
    setSortBy: sortBy => { store.setSortBy(sortBy) },
    goToPage: page => { store.goToPage(page) },
    refresh: () => { void store.loadInstalled() },
    install: (item, level) => { void store.install(item, level, t) },
    openDetail: item => { void store.openDetail(item) },
    closeDetail: () => { store.closeDetail() },
    setInstalledFilter: filter => { store.setInstalledFilter(filter) },
    setInstalledLevel: level => { store.setInstalledLevel(level) },
    uninstall: skill => { void store.uninstall(skill, t) },
    promote: skill => { void store.promote(skill, t) },
    setInvocation: (skill, surface, value) => { void store.setInvocation(skill, surface, value, t) },
  }

  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register({
      name: 'sidebar.footer.action',
      id: ENTRY_ID,
      order: ENTRY_ORDER,
      label: () => t('entry.label'),
      inject: () => ({
        toggle: () => { store.toggle() },
        t,
        hooks: { market: store },
      }),
    }, SkillMarketEntry))

  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register({
      name: 'shell.overlay',
      id: OVERLAY_ID,
      order: 120,
      label: () => t('panel.title'),
      inject: () => ({
        actions,
        t,
        hooks: { market: store },
      }),
    }, SkillMarketOverlay))
}
