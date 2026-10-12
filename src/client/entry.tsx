/**
 * Sidebar footer entry — the `sidebar.footer.action` occupant.
 *
 * The slot is a root-scoped `list`, so this contributes one more row beside
 * Settings rather than replacing anything. Its `order` is negative on purpose:
 * the Cordis Plugin entry the host ships sits at 0 and expands its popover
 * upward, so anything ordered after it would be covered.
 */

import type { ReactNode } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarFooterActionOwnerProps } from './slot-map.d.ts'
import type { PanelSnapshot } from './store.ts'
import type { TranslateFn } from './i18n.ts'

/** Props composed by the framework: owner share + this entry's inject face. */
export type SkillMarketEntryProps = SidebarFooterActionOwnerProps & {
  /** Toggle the panel. */
  toggle: () => void
  /** Framework-bound selector hook over the panel snapshot. */
  useMarket: SnapshotSelectorHook<PanelSnapshot>
  /** Copy for the active locale. */
  t: TranslateFn
}

/** Compact storefront glyph, sized to the sidebar's 16px control rhythm. */
function MarketGlyph({ size = 16 }: { size?: number }): ReactNode {
  return (
    <svg
      className="smk-entry-icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 6.2 3.1 2.6h9.8L14 6.2a2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M3.4 8.4v4.3c0 .5.4.9.9.9h7.4c.5 0 .9-.4.9-.9V8.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M6.6 13.6V10h2.8v3.6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The footer action.
 * @param props - owner share plus the injected toggle and selector hook.
 */
export function SkillMarketEntry(props: SkillMarketEntryProps): ReactNode {
  const { wide, toggle, useMarket, t } = props
  const open = useMarket(snapshot => snapshot.open)
  const label = t('entry.label')

  return (
    <button
      type="button"
      className="smk-entry"
      data-active={open ? 'true' : 'false'}
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-expanded={open}
    >
      <MarketGlyph />
      {wide ? <span className="smk-entry-label">{label}</span> : null}
    </button>
  )
}
