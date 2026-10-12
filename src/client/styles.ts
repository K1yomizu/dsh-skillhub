/**
 * Panel stylesheet, injected once per plugin lifetime and removed on unload.
 *
 * Colors come from DSH's own design tokens (`--dsw-alias-*`, `--dsw-radius-*`),
 * so the panel follows whatever theme the host has active. Every token carries a
 * CSS system-color fallback (`Canvas`, `CanvasText`, `AccentColor`), which is
 * itself theme-aware — so even a host build that drops a token still renders in
 * the correct light/dark polarity instead of a hardcoded guess.
 */

/** Scoped class prefix. */
const P = 'smk'

export const PANEL_CSS = `
.${P}-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 6px 8px;
  border: 0;
  border-radius: var(--dsw-radius-md, 8px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, CanvasText);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.${P}-entry:hover { background: var(--dsw-alias-fill-l1, color-mix(in srgb, CanvasText 8%, transparent)); color: var(--dsw-alias-label-primary, CanvasText); }
.${P}-entry[data-active='true'] { color: var(--dsw-alias-brand-primary, AccentColor); }
.${P}-entry-icon { display: block; flex: none; }
.${P}-entry-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* The overlay layer is click-through by contract: only the mask and the panel
   opt back into pointer events, so the app underneath stays interactive. */
.${P}-layer {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5vh 16px;
  pointer-events: none;
}
.${P}-mask {
  position: absolute;
  inset: 0;
  background: var(--dsw-alias-bg-mask-1, color-mix(in srgb, #000 42%, transparent));
  pointer-events: auto;
}
.${P}-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(760px, 96vw);
  max-height: 90vh;
  overflow: hidden;
  pointer-events: auto;
  border: 0.5px solid var(--dsw-alias-border-l2, color-mix(in srgb, CanvasText 20%, transparent));
  border-radius: var(--dsw-radius-panel, 14px);
  background: var(--dsw-alias-bg-overlay, Canvas);
  color: var(--dsw-alias-label-primary, CanvasText);
  box-shadow: 0 18px 48px color-mix(in srgb, #000 34%, transparent);
  font-size: 13px;
  line-height: 1.5;
}

.${P}-head { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px 0; }
.${P}-head-main { min-width: 0; flex: 1; }
.${P}-title { margin: 0; font-size: 15px; font-weight: 600; }
.${P}-subtitle { margin: 2px 0 0; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 62%, transparent)); font-size: 12px; }
.${P}-icon-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border: 0;
  border-radius: var(--dsw-radius-sm, 6px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, CanvasText);
  cursor: pointer;
}
.${P}-icon-btn:hover { background: var(--dsw-alias-fill-l1, color-mix(in srgb, CanvasText 8%, transparent)); }
.${P}-icon-btn[disabled] { opacity: .45; cursor: default; }

.${P}-tabs { display: flex; gap: 4px; padding: 10px 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l1, color-mix(in srgb, CanvasText 14%, transparent)); }
.${P}-tab {
  padding: 7px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-secondary, CanvasText);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}
.${P}-tab[data-on='true'] { color: var(--dsw-alias-label-primary, CanvasText); border-bottom-color: var(--dsw-alias-brand-primary, AccentColor); }

.${P}-notice { margin: 10px 16px 0; padding: 8px 10px; border-radius: var(--dsw-radius-md, 8px); font-size: 12px; border: 0.5px solid transparent; }
.${P}-notice[data-kind='ok'] { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #2e9e5b) 14%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #2e9e5b) 40%, transparent); }
.${P}-notice[data-kind='error'] { background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #d94a4a) 14%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #d94a4a) 40%, transparent); }

.${P}-toolbar { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px 8px; }
.${P}-input, .${P}-select {
  height: 30px;
  padding: 0 9px;
  border: 0.5px solid var(--dsw-alias-border-l2, color-mix(in srgb, CanvasText 20%, transparent));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1, color-mix(in srgb, CanvasText 4%, transparent));
  color: inherit;
  font: inherit;
  outline: none;
}
.${P}-input:focus, .${P}-select:focus { border-color: var(--dsw-alias-brand-primary, AccentColor); }
.${P}-input { flex: 1 1 220px; min-width: 0; }
.${P}-select { flex: none; }

.${P}-btn {
  height: 30px;
  padding: 0 12px;
  border: 0.5px solid var(--dsw-alias-border-l2, color-mix(in srgb, CanvasText 20%, transparent));
  border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1, color-mix(in srgb, CanvasText 4%, transparent));
  color: inherit;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.${P}-btn:hover:not([disabled]) { background: var(--dsw-alias-fill-l1, color-mix(in srgb, CanvasText 9%, transparent)); }
.${P}-btn[disabled] { opacity: .5; cursor: default; }
.${P}-btn[data-variant='primary'] { background: var(--dsw-alias-brand-primary, AccentColor); border-color: transparent; color: var(--dsw-alias-label-primary-inverted, #fff); }
.${P}-btn[data-variant='danger'] { color: var(--dsw-alias-label-error, #d94a4a); }
.${P}-btn[data-size='sm'] { height: 26px; padding: 0 9px; font-size: 12px; }

.${P}-meta { display: flex; align-items: center; gap: 8px; padding: 0 16px 8px; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 62%, transparent)); font-size: 12px; }
.${P}-chip { padding: 1px 7px; border-radius: 999px; border: 0.5px solid var(--dsw-alias-border-l1, color-mix(in srgb, CanvasText 16%, transparent)); }
.${P}-chip[data-tone='warn'] { border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #c98a20) 50%, transparent); color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary, #c98a20)); }

.${P}-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 16px 12px; display: flex; flex-direction: column; gap: 8px; }
.${P}-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px;
  border: 0.5px solid var(--dsw-alias-border-l1, color-mix(in srgb, CanvasText 14%, transparent));
  border-radius: var(--dsw-radius-lg, 10px);
  background: var(--dsw-alias-bg-layer-1, color-mix(in srgb, CanvasText 3%, transparent));
}
.${P}-row-main { flex: 1; min-width: 0; }
.${P}-row-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.${P}-row-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.${P}-link {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.${P}-link:hover .${P}-row-name { text-decoration: underline; }
.${P}-row-id { color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 58%, transparent)); font-size: 11px; font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); }
.${P}-row-desc { margin-top: 3px; color: var(--dsw-alias-label-secondary, color-mix(in srgb, CanvasText 78%, transparent)); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.${P}-row-actions { flex: none; display: flex; flex-direction: column; gap: 6px; align-items: stretch; }
.${P}-row-stats { margin-top: 4px; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 58%, transparent)); font-size: 11px; }

.${P}-switches { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
.${P}-switch { display: inline-flex; align-items: center; gap: 5px; color: var(--dsw-alias-label-secondary, CanvasText); font-size: 12px; cursor: pointer; }
.${P}-switch input { margin: 0; accent-color: var(--dsw-alias-brand-primary, AccentColor); }
.${P}-switch[data-readonly='true'] { cursor: default; opacity: .7; }

.${P}-empty, .${P}-loading { padding: 22px 16px; text-align: center; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 62%, transparent)); }
.${P}-error { margin: 8px 16px; padding: 8px 10px; border-radius: var(--dsw-radius-md, 8px); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #d94a4a) 12%, transparent); color: var(--dsw-alias-label-error, #d94a4a); font-size: 12px; }

.${P}-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 16px; border-top: 0.5px solid var(--dsw-alias-border-l1, color-mix(in srgb, CanvasText 14%, transparent)); color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 62%, transparent)); font-size: 12px; }
.${P}-pager { display: flex; align-items: center; gap: 6px; }

.${P}-detail { flex: 1; min-height: 0; overflow-y: auto; padding: 12px 16px 16px; }
.${P}-detail-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.${P}-detail-body { white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-secondary, CanvasText); font-size: 12.5px; }
.${P}-detail-actions { display: flex; gap: 8px; margin-top: 12px; }
.${P}-dirs { padding: 8px 16px 0; color: var(--dsw-alias-label-tertiary, color-mix(in srgb, CanvasText 58%, transparent)); font-size: 11px; font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace); word-break: break-all; }
`
