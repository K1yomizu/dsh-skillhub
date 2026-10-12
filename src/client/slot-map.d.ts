/**
 * `SlotMap` entries for the two slots this plugin occupies.
 *
 * A slot key becomes usable only once something merges it into `SlotMap`. Both
 * keys this plugin needs are declared by UI packages a market panel has no
 * runtime reason to depend on:
 *
 *   sidebar.footer.action
 *     packages/client/ui-sidebar/src/client/contract/slots.ts
 *     -> { kind: 'list'; scope: 'root'; owner: SidebarFooterActionOwnerProps }
 *        SidebarFooterActionOwnerProps = { wide: boolean }
 *
 *   shell.overlay
 *     packages/client/ui-layout/src/client/index.ts
 *     -> { kind: 'list'; scope: 'root' } — a seat declared inside the AppFrame
 *        root entry, with no owner share and no session binding.
 *
 * Both are restated verbatim so the two `register` call sites are checked by the
 * framework's own four-share `ComposedProps` machinery instead of being cast.
 * They are `list` slots, so registering adds a cell beside the shipped
 * occupants. The ui-renderer registry docs state the intent for `shell.overlay`
 * outright: it is the supported surface for "a surface of your own that floats
 * over the whole app", additive, and click-through until the entry opts back
 * into pointer events.
 *
 * `ctx.slots` is deliberately NOT declared here.
 * `@deepseek-ai/dsh-client-ui-renderer` publishes its browser half as `./client`,
 * and that entry's own declaration already merges `slots: SlotRegistry` (and
 * `uiRenderer`) into `Context`. Importing it is what puts the real service face
 * — together with the real `SlotCore['register']` overload set — into the
 * program, so a structural copy would only be a second, drifting authority.
 *
 * The two imports below are load-bearing, not stylistic:
 *
 *   1. `@deepseek-ai/dsh-client-ui-renderer/client` must be imported for its
 *      `Context` augmentation to exist at all; nothing else in this plugin
 *      depends on it at the type level.
 *   2. `declare module '@deepseek-ai/dsh-client-ui-slots'` is only read as an
 *      *augmentation* when the declaring file also imports that module. With no
 *      import of the target, TypeScript parses the block as a fresh ambient
 *      module declaration and silently replaces the package's real
 *      declarations. The identical rule governs augmenting
 *      `@deepseek-ai/cordis` — see `@deepseek-ai/dsh-host-webserver`'s types,
 *      which import `Context` on the line directly above their augmentation.
 *
 * Both imports are referenced by the aliases below so they cannot be elided.
 */

import type { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SlotMap } from '@deepseek-ai/dsh-client-ui-slots'

/** The slot service face, re-exported so call sites need not reach into the renderer package. */
export type SlotsService = SlotRegistry

/** The two keys this plugin registers into. Keeps the `SlotMap` import above referenced. */
export type MarketSlotKey = Extract<keyof SlotMap, 'sidebar.footer.action' | 'shell.overlay'>

/**
 * Owner share supplied by the sidebar to each footer action
 * (source: `SidebarFooterActionOwnerProps`).
 */
export interface SidebarFooterActionOwnerProps {
  /** Whether the sidebar renders wide content (false = 56px rail). */
  wide: boolean
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Optional actions beside Settings at the sidebar foot. */
    'sidebar.footer.action': { kind: 'list'; scope: 'root'; owner: SidebarFooterActionOwnerProps }
    /**
     * Frame-wide floating layer above every column. The layer is
     * click-through, so an occupant must opt back into pointer events.
     */
    'shell.overlay': { kind: 'list'; scope: 'root' }
  }
}
