/**
 * Normalize a label for comparison: trim, Unicode NFKC, and lowercase when ASCII-only.
 * @param raw Display name or RSS tag fragment
 * @returns Normalized key (empty when only whitespace)
 */
export function normalizeLabelForOutletMatch(raw: string): string {
  const t = raw.trim().normalize('NFKC')
  if (!t) {
    return ''
  }
  if (/^[\x00-\x7f]+$/.test(t)) {
    return t.toLowerCase()
  }
  return t
}
