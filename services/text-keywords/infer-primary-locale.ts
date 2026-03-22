/**
 * Locale hints for keyword tokenization (Chinese vs English heuristics).
 */
export type TextKeywordLocaleHint = 'zh' | 'en'

/**
 * Infer whether a short string is primarily Chinese (CJK) or English (Latin) for tokenizer selection.
 * Uses a simple codepoint ratio; ties favor Chinese when any CJK is present.
 * @param text Arbitrary user-visible text (e.g. a headline)
 * @returns `'zh'` when CJK density is at least that of Latin letters, otherwise `'en'`
 */
export function inferPrimaryKeywordLocale(text: string): TextKeywordLocaleHint {
  const t = text.trim()
  if (t.length === 0) {
    return 'en'
  }
  let cjk = 0
  let latin = 0
  for (const ch of t) {
    if (/[\u4e00-\u9fff]/.test(ch)) {
      cjk += 1
    } else if (/[A-Za-z]/.test(ch)) {
      latin += 1
    }
  }
  if (cjk === 0 && latin === 0) {
    return 'en'
  }
  return cjk >= latin ? 'zh' : 'en'
}
