import { extractKeywordTokensFromText } from './extract-keyword-tokens'

/**
 * One aggregated tag with coverage across multiple titles.
 */
export interface AggregatedTextTag {
  /** Normalized token (English lowercased; Chinese as returned by jieba) */
  tag: string
  /** How many distinct titles contained this tag at least once */
  docCount: number
  /** Sum of occurrences across all titles (a title may repeat a token) */
  totalOccurrences: number
}

/**
 * Mine recurring tags from a batch of titles (e.g. one RSS list). Uses per-title tokenization then document frequency.
 * @param titles Headlines or short lines
 * @param options `topK` caps the result length; `minDocCount` requires a tag to appear in at least this many titles
 * @returns Tags sorted by `docCount` desc, then `totalOccurrences` desc
 */
export function aggregateTopTagsFromTitles(titles: string[], options?: { topK?: number; minDocCount?: number }): AggregatedTextTag[] {
  const topK = options?.topK ?? 20
  const minDocCount = options?.minDocCount ?? 2
  const docFreq = new Map<string, number>()
  const totalOcc = new Map<string, number>()

  for (const title of titles) {
    const tokens = extractKeywordTokensFromText(title)
    const seenInDoc = new Set<string>()
    for (const tok of tokens) {
      totalOcc.set(tok, (totalOcc.get(tok) ?? 0) + 1)
      seenInDoc.add(tok)
    }
    for (const tok of seenInDoc) {
      docFreq.set(tok, (docFreq.get(tok) ?? 0) + 1)
    }
  }

  const rows: AggregatedTextTag[] = []
  for (const [tag, dc] of docFreq) {
    if (dc < minDocCount) {
      continue
    }
    rows.push({
      tag,
      docCount: dc,
      totalOccurrences: totalOcc.get(tag) ?? 0,
    })
  }
  rows.sort((a, b) => {
    if (b.docCount !== a.docCount) {
      return b.docCount - a.docCount
    }
    return b.totalOccurrences - a.totalOccurrences
  })
  return rows.slice(0, topK)
}
