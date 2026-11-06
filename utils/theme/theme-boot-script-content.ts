/** Inline boot script: apply stored theme before first paint (ticket-janitor pattern). */
export const THEME_BOOT_SCRIPT = `(() => {
  const key = 'unbnd.theme';
  const valid = (value) => value === 'light' || value === 'dark' || value === 'auto';
  let preference = 'auto';
  try { preference = valid(window.localStorage.getItem(key)) ? window.localStorage.getItem(key) : 'auto'; } catch {}
  let systemDark = false;
  try { systemDark = Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); } catch {}
  const resolved = preference === 'dark' || (preference === 'auto' && systemDark) ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
})();`

export const THEME_BOOT_SCRIPT_ID = 'unbnd-theme-boot'

/**
 * Props for the inline theme boot script in root layout.
 * @param nonce Optional CSP nonce
 * @returns Script element props
 */
export function themeBootScriptProps(nonce?: string) {
  return {
    id: THEME_BOOT_SCRIPT_ID,
    nonce,
    suppressHydrationWarning: true as const,
    dangerouslySetInnerHTML: { __html: THEME_BOOT_SCRIPT },
  }
}
