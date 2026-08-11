/**
 * The app's colour palette, as CSS custom properties.
 *
 * Every in-app screen used to open with its own copy of these constants as
 * fixed hex values, which is why a theme switch changed nothing on them. The
 * names and light-mode values are unchanged — a file that swaps its local
 * declaration for an import from here looks identical in light mode and gains
 * dark mode for free, because the browser resolves the variable at paint time.
 *
 * The real values live in src/index.css under `:root` and `[data-theme="dark"]`.
 *
 * TWO RULES worth knowing before using these:
 *
 * 1. ON_NEON, not ACCENT, for anything drawn on top of a neon fill. A neon
 *    button stays neon in dark mode, so its label must stay dark. ACCENT
 *    lightens in dark mode and would disappear into the fill.
 *
 * 2. These are `var(...)` strings, so they work in inline styles and in CSS,
 *    but NOT anywhere a literal colour is required — canvas, and the Mapbox
 *    static-image URLs that bake colours into the path. Those keep real hexes.
 */

// Page and surface
export const BG      = 'var(--fm-bg)'
export const CARD    = 'var(--fm-card)'
export const BORDER  = 'var(--fm-border)'
export const HOVER   = 'var(--fm-hover)'
export const HEADER  = 'var(--fm-header)'   // translucent sticky bars

// Side menu. Green in light, ash in dark — see index.css.
export const SB_BG     = 'var(--fm-sb-bg)'
export const SB_BORDER = 'var(--fm-sb-border)'
export const SB_TEXT   = 'var(--fm-sb-text)'
export const SB_MUTED  = 'var(--fm-sb-muted)'
export const SB_CARD   = 'var(--fm-sb-card)'
export const SB_HOVER  = 'var(--fm-sb-hover)'
export const DANGER_SOFT = 'var(--fm-danger-soft)'  // debit / error wash
export const CHIP        = 'var(--fm-chip)'         // neutral pill background
export const WARN_SOFT   = 'var(--fm-warn-soft)'    // caution wash
export const WARN_BORDER = 'var(--fm-warn-border)'

// Type
export const TEXT    = 'var(--fm-text)'
export const MUTED   = 'var(--fm-muted)'
export const MOSS    = 'var(--fm-moss)'
export const ACCENT  = 'var(--fm-accent)'

// Brand — fixed in both themes
export const NEON      = 'var(--fm-neon)'
export const ON_NEON   = 'var(--fm-on-neon)'
export const NEON_SOFT = 'var(--fm-neon-soft)'
// Near-black label on a neon fill, and the inverted pill that carries neon
// text. INVERT lifts in dark mode so the pill stays visible against the card;
// ON_NEON_HARD is fixed, for the same reason ON_NEON is.
export const ON_NEON_HARD = 'var(--fm-on-neon-hard)'
export const INVERT        = 'var(--fm-invert)'
// Solid accent button. Always use the pair: fill + its own label colour.
export const ACCENT_FILL    = 'var(--fm-accent-fill)'
export const ON_ACCENT_FILL = 'var(--fm-on-accent-fill)'

// Depth
export const SHADOW        = 'var(--fm-shadow)'
export const SHADOW_STRONG = 'var(--fm-shadow-strong)'
export const OVERLAY       = 'var(--fm-overlay)'

// Admin panel runs a neutral-grey variant of the same roles in light mode.
export const ADMIN_BG     = 'var(--fm-admin-bg)'
export const ADMIN_CARD   = 'var(--fm-admin-card)'
export const ADMIN_BORDER = 'var(--fm-admin-border)'
export const ADMIN_TEXT   = 'var(--fm-admin-text)'
export const ADMIN_MUTED  = 'var(--fm-admin-muted)'

// Literal brand hexes, for the few places a var() cannot reach (map pin URLs,
// meta theme-color, canvas). Keep in step with index.css.
export const HEX = { neon: '#ccff00', olive: '#243800', moss: '#4C6900' }
