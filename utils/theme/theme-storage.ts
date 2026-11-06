import { normalizeThemePreference, THEME_STORAGE_KEY, type ThemePreference } from '@/utils/theme/theme-preference'

/**
 * Read theme preference from storage.
 * @param storage Browser localStorage (or null when unavailable)
 * @returns Preference (defaults to auto)
 */
export function readStoredTheme(storage: Pick<Storage, 'getItem'> | null | undefined): ThemePreference {
  try {
    return normalizeThemePreference(storage?.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'auto'
  }
}

/**
 * Persist theme preference.
 * @param storage Browser localStorage (or null when unavailable)
 * @param preference Preference to store
 * @returns True when write succeeded
 */
export function writeStoredTheme(storage: Pick<Storage, 'setItem'> | null | undefined, preference: ThemePreference): boolean {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference)
    return true
  } catch {
    return false
  }
}
