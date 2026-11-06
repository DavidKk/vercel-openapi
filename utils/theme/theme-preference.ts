/** localStorage key for theme preference (aligned with ticket-janitor pattern). */
export const THEME_STORAGE_KEY = 'unbnd.theme'

export type ThemePreference = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

/**
 * Narrow unknown values to a valid theme preference.
 * @param value Candidate value
 * @returns True when value is light, dark, or auto
 */
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'auto'
}

/**
 * Normalize stored or unknown preference; invalid values become auto.
 * @param value Candidate preference
 * @returns Normalized preference
 */
export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : 'auto'
}

/**
 * Resolve preference + system dark flag into light or dark.
 * @param preference User preference
 * @param systemDark Whether OS prefers dark
 * @returns Resolved theme
 */
export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'dark') return 'dark'
  if (preference === 'light') return 'light'
  return systemDark ? 'dark' : 'light'
}

/**
 * Apply resolved theme to the document element before paint / on change.
 * @param theme Resolved light or dark
 * @param documentElement html element
 */
export function applyResolvedTheme(theme: ResolvedTheme, documentElement: HTMLElement): void {
  documentElement.dataset.theme = theme
  documentElement.style.colorScheme = theme
}
