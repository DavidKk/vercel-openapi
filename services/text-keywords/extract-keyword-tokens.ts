import nlp from 'compromise'
import { cut } from 'jieba-wasm/node'

import { inferPrimaryKeywordLocale } from './infer-primary-locale'
import { ZH_STOPWORDS } from './zh-stopwords'

/**
 * Tokenize a headline or short line into keyword-like strings using jieba (Chinese) or compromise nouns (English).
 * Intended for Node.js runtimes (jieba-wasm loads WASM from disk).
 * @param text Source text; whitespace is normalized
 * @returns Non-empty tokens (Chinese: length ≥ 2 and not in a small stop set; English: compromise `#Noun` phrases, lowercased)
 */
export function extractKeywordTokensFromText(text: string): string[] {
  const raw = text.trim().replace(/\s+/g, ' ')
  if (raw.length === 0) {
    return []
  }
  const locale = inferPrimaryKeywordLocale(raw)
  if (locale === 'zh') {
    return tokenizeChineseWithJieba(raw)
  }
  return tokenizeEnglishNounsWithCompromise(raw)
}

/**
 * Run jieba `cut` and filter obvious noise for tag mining.
 * @param normalized Whitespace-normalized text
 * @returns Chinese keyword candidates
 */
function tokenizeChineseWithJieba(normalized: string): string[] {
  const parts = cut(normalized, false)
  const out: string[] = []
  for (const w of parts) {
    const t = w.trim()
    if (t.length < 2) {
      continue
    }
    if (ZH_STOPWORDS.has(t)) {
      continue
    }
    out.push(t)
  }
  return out
}

/**
 * Use compromise noun phrases as English keyword candidates.
 * @param normalized Whitespace-normalized text
 * @returns Lowercased noun strings
 */
function tokenizeEnglishNounsWithCompromise(normalized: string): string[] {
  const doc = nlp(normalized)
  const chunks = doc.nouns().out('array') as string[]
  const out: string[] = []
  for (const chunk of chunks) {
    const lower = chunk.toLowerCase().replace(/\s+/g, ' ').trim()
    if (lower.length < 2) {
      continue
    }
    if (!/[a-z0-9]/.test(lower)) {
      continue
    }
    out.push(lower)
  }
  return out
}
