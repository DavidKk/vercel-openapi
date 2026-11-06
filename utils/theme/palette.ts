/**
 * Neutral black/white theme palette (channel RGB, no blue tint).
 * Wired through CSS variables in `app/globals.css` and Tailwind `gray` / `white` / `black`.
 *
 * Light mode uses the natural scale (50 light → 950 dark).
 * Dark mode inverts the scale so existing utilities (`bg-white`, `bg-gray-50`, `text-gray-900`)
 * flip automatically — prefer light-mode class names; avoid `dark:bg-gray-*` / `dark:text-gray-*`.
 *
 * Fixed (never inverted):
 * - `--brand-plate` — BrandMark white plate
 * - `--pure-white` / `--pure-black` — accent ink + modal/drawer scrims (`bg-pure-black/40`)
 */

/** Light-mode gray scale (neutral). */
export const GRAY_LIGHT = {
  50: '250 250 250',
  100: '245 245 245',
  200: '229 229 229',
  300: '212 212 212',
  400: '163 163 163',
  500: '115 115 115',
  600: '82 82 82',
  700: '64 64 64',
  800: '38 38 38',
  900: '23 23 23',
  950: '10 10 10',
} as const

/**
 * Dark-mode gray scale — inverted so `bg-gray-50` / `text-gray-900` stay readable
 * without per-component `dark:` overrides.
 */
export const GRAY_DARK = {
  50: GRAY_LIGHT[950],
  100: GRAY_LIGHT[900],
  200: GRAY_LIGHT[800],
  300: GRAY_LIGHT[700],
  400: GRAY_LIGHT[600],
  500: GRAY_LIGHT[500],
  600: GRAY_LIGHT[400],
  700: GRAY_LIGHT[300],
  800: GRAY_LIGHT[200],
  900: GRAY_LIGHT[100],
  950: GRAY_LIGHT[50],
} as const

/** Always-white brand plate (favicon / dark-mode logo chip). */
export const BRAND_PLATE = '255 255 255'
