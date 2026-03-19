/**
 * Basic fuzzy match scoring for search suggestions.
 * @param source Candidate text
 * @param query Search text
 * @returns Match flag and score
 */
export function fuzzyMatch(source: string, query: string): { matched: boolean; score: number } {
  const src = source.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) {
    return { matched: true, score: 1 }
  }

  let srcIndex = 0
  let matchedCount = 0
  let score = 0
  for (let i = 0; i < q.length; i++) {
    const ch = q[i]
    const found = src.indexOf(ch, srcIndex)
    if (found === -1) {
      return { matched: false, score: 0 }
    }
    matchedCount++
    if (found === srcIndex) {
      score += 2
    } else {
      score += 1
    }
    srcIndex = found + 1
  }

  score += matchedCount / Math.max(src.length, 1)
  return { matched: true, score }
}
