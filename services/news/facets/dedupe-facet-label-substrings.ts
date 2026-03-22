import { partial_ratio, ratio, token_sort_ratio } from 'fuzzball'

/**
 * fuzzball options: keep CJK intact (defaults strip non-ASCII during `full_process`).
 * Used only from Node news feed path (`/api/news/feed`), not Edge.
 */
const FUZZBALL_OPTS = { full_process: false as const, astral: true }

/** Minimum shorter-side length for `partial_ratio` merges (avoids 木/国-level noise). */
const PARTIAL_MIN_SHORTER_LEN = 3

/** Minimum length on both sides before char-spaced `token_sort_ratio` (avoids 蜜蜂/蜂蜜-style 2-char collisions). */
const TOKEN_SORT_MIN_BOTH_LEN = 4

/** Max |len(a)-len(b)| when using char-spaced token sort (covers mild truncation, not full substring). */
const TOKEN_SORT_MAX_LEN_DELTA = 2

/** Score threshold on fuzzball’s 0–100 scale for `partial_ratio` / `token_sort_ratio` merges. */
const FUZZ_MERGE_MIN_SCORE = 90

/** Minimum length on both sides before plain `ratio` (same-length typos; avoids 2–3 char noise). */
const RATIO_MIN_BOTH_LEN = 4

/**
 * Minimum `ratio` score for same-length pairs when partial/token_sort did not already clear {@link FUZZ_MERGE_MIN_SCORE}
 * (Latin one-char typos land ~86; stricter than lowering the global threshold).
 */
const RATIO_SAME_LEN_MIN_SCORE = 86

/**
 * Whether `shorter` appears as an ordered subsequence inside `longer` (same code units, not necessarily contiguous).
 * @param shorter Candidate to drop when this holds and length guards pass
 * @param longer Candidate that may absorb counts / display preference
 * @returns True when every character of `shorter` occurs in `longer` in order
 */
function isOrderedSubsequence(shorter: string, longer: string): boolean {
  if (shorter.length === 0 || shorter.length >= longer.length) {
    return false
  }
  let i = 0
  for (let j = 0; j < longer.length && i < shorter.length; j++) {
    if (longer[j] === shorter[i]) {
      i++
    }
  }
  return i === shorter.length
}

/**
 * Collapse immediate consecutive repeats of the same 2–8 character chunk (RSS/media keywords sometimes stutter).
 * ASCII-only strings are returned unchanged.
 * @param text Raw facet label
 * @returns Shortened string when a repeat was removed
 */
export function collapseConsecutiveRepeatedChineseRuns(text: string): string {
  if (!/[\u4e00-\u9fff]/.test(text)) {
    return text
  }
  let s = text
  let changed = true
  while (changed) {
    changed = false
    outer: for (let unit = Math.min(8, Math.floor(s.length / 2)); unit >= 2; unit--) {
      for (let i = 0; i + unit * 2 <= s.length; i++) {
        const chunk = s.slice(i, i + unit)
        let end = i + unit
        while (end + unit <= s.length && s.slice(end, end + unit) === chunk) {
          end += unit
        }
        const repeats = (end - i) / unit
        if (repeats >= 2) {
          s = s.slice(0, i + unit) + s.slice(end)
          changed = true
          break outer
        }
      }
    }
  }
  return s
}

/**
 * True when the code unit is ASCII and treated as trimmable clutter at label edges (RSS noise).
 * @param ch Single UTF-16 code unit
 * @returns True for ASCII whitespace / common punctuation only
 */
function isAsciiFacetEdgeChar(ch: string): boolean {
  if (ch.length !== 1) {
    return false
  }
  const c = ch.charCodeAt(0)
  if (c > 0x7f) {
    return false
  }
  return /[\s.,;:!?'"()[\]{}<>|`~/*#&%+=\\^-]/.test(ch)
}

/**
 * Light surface normalization safe for mixed CJK/Latin facets: trim ASCII edge punctuation/space,
 * collapse internal whitespace, lowercase Latin letters only (Han etc. unchanged). Does not apply NFKC.
 * @param raw RSS-derived category or keyword label
 * @returns Normalized surface string before CJK run-collapse
 */
export function normalizeFacetLabelSurface(raw: string): string {
  let s = raw.trim()
  while (s.length > 0 && isAsciiFacetEdgeChar(s[0]!)) {
    s = s.slice(1).trim()
  }
  while (s.length > 0 && isAsciiFacetEdgeChar(s[s.length - 1]!)) {
    s = s.slice(0, -1).trim()
  }
  s = s.replace(/\s+/g, ' ')
  return s.replace(/[A-Za-z]/g, (ch) => ch.toLowerCase())
}

/**
 * Normalization key for comparing facet labels (ASCII-safe surface + collapse stuttered CJK runs).
 * @param raw Trimmed or untrimmed label
 * @returns Key used for substring / subsequence superseding checks
 */
function facetNormKey(raw: string): string {
  return collapseConsecutiveRepeatedChineseRuns(normalizeFacetLabelSurface(raw))
}

/**
 * Join Unicode code points with spaces so `token_sort_ratio` can reorder CJK tokens (e.g. 高层论坛 vs 论坛高层).
 * @param s Non-empty string
 * @returns Spaced code-point sequence
 */
function spacedCodePoints(s: string): string {
  return [...s].join(' ')
}

/**
 * True when two labels should merge under fuzzy rules (fuzzball-backed).
 * Order: `partial_ratio` (short ⊂ long), char-spaced `token_sort_ratio`, then same-length `ratio` with a lower bar
 * only if the first two did not reach {@link FUZZ_MERGE_MIN_SCORE}.
 * @param a Raw or trimmed label
 * @param b Raw or trimmed label
 * @returns True when any applicable rule accepts the pair
 */
function shouldFuzzyMergeFacets(a: string, b: string): boolean {
  const x = normalizeFacetLabelSurface(a)
  const y = normalizeFacetLabelSurface(b)
  if (!x || !y) {
    return false
  }
  if (x === y) {
    return true
  }
  const lenA = x.length
  const lenB = y.length
  const shorter = lenA <= lenB ? x : y
  const longer = lenA <= lenB ? y : x
  let best = 0
  if (shorter.length >= PARTIAL_MIN_SHORTER_LEN && shorter.length < longer.length) {
    best = Math.max(best, partial_ratio(shorter, longer, FUZZBALL_OPTS))
  }
  if (lenA >= TOKEN_SORT_MIN_BOTH_LEN && lenB >= TOKEN_SORT_MIN_BOTH_LEN && Math.abs(lenA - lenB) <= TOKEN_SORT_MAX_LEN_DELTA) {
    best = Math.max(best, token_sort_ratio(spacedCodePoints(x), spacedCodePoints(y), FUZZBALL_OPTS))
  }
  if (best >= FUZZ_MERGE_MIN_SCORE) {
    return true
  }
  if (lenA === lenB && lenA >= RATIO_MIN_BOTH_LEN) {
    const r = ratio(x, y, FUZZBALL_OPTS)
    if (r >= RATIO_SAME_LEN_MIN_SCORE) {
      return true
    }
  }
  return false
}

/**
 * Union–find over indices 0..n-1.
 * @param n Number of elements
 * @returns find / union closures
 */
function createUnionFind(n: number): { find: (i: number) => number; union: (i: number, j: number) => void } {
  const parent = Array.from({ length: n }, (_, i) => i)
  function find(i: number): number {
    if (parent[i] !== i) {
      parent[i] = find(parent[i]!)
    }
    return parent[i]!
  }
  function union(i: number, j: number): void {
    const ri = find(i)
    const rj = find(j)
    if (ri !== rj) {
      parent[ri] = rj
    }
  }
  return { find, union }
}

/**
 * Prefer longer raw; same length prefer surface-canonical (raw equals {@link normalizeFacetLabelSurface}(raw)); else lexicographically smaller.
 * @param a Candidate display string
 * @param b Candidate display string
 * @returns Preferred label for histogram / dedupe display
 */
function pickBetterDisplayRaw(a: string, b: string): string {
  if (b.length > a.length) {
    return b
  }
  if (b.length < a.length) {
    return a
  }
  const sa = normalizeFacetLabelSurface(a)
  const sb = normalizeFacetLabelSurface(b)
  const aCanon = a === sa
  const bCanon = b === sb
  if (bCanon && !aCanon) {
    return b
  }
  if (aCanon && !bCanon) {
    return a
  }
  return b.localeCompare(a) < 0 ? b : a
}

/** Labels at least this long use “shorter wins” when choosing a representative for merged **category** facet buckets. */
const HISTOGRAM_DISPLAY_MIN_LEN_FOR_SHORTER_PREFERENCE = 4

/**
 * Pick display for merged **category** histogram buckets: when both labels are long enough, prefer the **shorter** head term
 * (e.g. 霍尔木兹海峡 over 霍尔木兹海峡威胁). If only one side meets the minimum length, prefer that one. If neither does, keep legacy “longer wins” to limit noise.
 * Same effective tier → higher aggregated `count`; tie → {@link pickBetterDisplayRaw}.
 * @param labelA Candidate display string
 * @param countA Pool count summed for exact `labelA`
 * @param labelB Other candidate
 * @param countB Pool count summed for exact `labelB`
 * @returns Winning label and its exact-string count (for chained compares)
 */
function pickBetterHistogramDisplay(labelA: string, countA: number, labelB: string, countB: number): { label: string; count: number } {
  const minW = HISTOGRAM_DISPLAY_MIN_LEN_FOR_SHORTER_PREFERENCE
  const aOk = labelA.length >= minW
  const bOk = labelB.length >= minW
  if (aOk && bOk) {
    if (labelA.length !== labelB.length) {
      return labelA.length < labelB.length ? { label: labelA, count: countA } : { label: labelB, count: countB }
    }
    if (countB > countA) {
      return { label: labelB, count: countB }
    }
    if (countB < countA) {
      return { label: labelA, count: countA }
    }
    const w = pickBetterDisplayRaw(labelA, labelB)
    return w === labelB ? { label: labelB, count: countB } : { label: labelA, count: countA }
  }
  if (aOk !== bOk) {
    return aOk ? { label: labelA, count: countA } : { label: labelB, count: countB }
  }
  if (labelB.length > labelA.length) {
    return { label: labelB, count: countB }
  }
  if (labelB.length < labelA.length) {
    return { label: labelA, count: countA }
  }
  if (countB > countA) {
    return { label: labelB, count: countB }
  }
  if (countB < countA) {
    return { label: labelA, count: countA }
  }
  const w = pickBetterDisplayRaw(labelA, labelB)
  return w === labelB ? { label: labelB, count: countB } : { label: labelA, count: countA }
}

/**
 * Pick one representative string per fuzzy cluster using {@link pickBetterDisplayRaw} (no pool weights).
 * @param labels Labels in one cluster
 * @returns Chosen display string
 */
function pickClusterRepresentative(labels: string[]): string {
  return labels.reduce((best, cur) => pickBetterDisplayRaw(best, cur))
}

/**
 * Pick cluster display using per-label pool counts from the merged histogram map.
 * @param labels Distinct display keys in the cluster
 * @param countByDisplay Count for each exact display key before collapse
 * @returns Representative label
 */
function pickClusterRepresentativeWeighted(labels: string[], countByDisplay: ReadonlyMap<string, number>): string {
  if (labels.length === 0) {
    return ''
  }
  let bestLabel = labels[0]!
  let bestCount = countByDisplay.get(bestLabel) ?? 0
  for (let k = 1; k < labels.length; k++) {
    const cur = labels[k]!
    const curCount = countByDisplay.get(cur) ?? 0
    const picked = pickBetterHistogramDisplay(bestLabel, bestCount, cur, curCount)
    bestLabel = picked.label
    bestCount = picked.count
  }
  return bestLabel
}

/**
 * Collapse remaining near-duplicate labels after deterministic rules (fuzzball).
 * @param labels Distinct trimmed survivors (caller order preserved by first-seen cluster)
 * @returns One label per fuzzy equivalence class
 */
function fuzzyCollapseDistinctLabels(labels: string[]): string[] {
  if (labels.length <= 1) {
    return [...labels]
  }
  const n = labels.length
  const { find, union } = createUnionFind(n)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shouldFuzzyMergeFacets(labels[i]!, labels[j]!)) {
        union(i, j)
      }
    }
  }
  const rootToLabels = new Map<number, string[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    const list = rootToLabels.get(r) ?? []
    list.push(labels[i]!)
    rootToLabels.set(r, list)
  }
  const seenRoot = new Set<number>()
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const r = find(i)
    if (seenRoot.has(r)) {
      continue
    }
    seenRoot.add(r)
    out.push(pickClusterRepresentative(rootToLabels.get(r)!))
  }
  return out
}

/**
 * True when `longerNorm` should absorb `shorterNorm` (strictly longer string, substring or gated CJK subsequence).
 * @param longerNorm Normalized longer candidate
 * @param shorterNorm Normalized shorter candidate
 * @returns True when the shorter label is redundant w.r.t. the longer one
 */
function normSupersedes(longerNorm: string, shorterNorm: string): boolean {
  if (shorterNorm.length === 0 || longerNorm.length <= shorterNorm.length) {
    return false
  }
  if (longerNorm.includes(shorterNorm)) {
    return true
  }
  if (shorterNorm.length < 4) {
    return false
  }
  const chars = [...shorterNorm]
  const cjk = chars.filter((ch) => /[\u4e00-\u9fff]/.test(ch)).length
  if (cjk / chars.length < 0.5) {
    return false
  }
  return isOrderedSubsequence(shorterNorm, longerNorm)
}

/**
 * Drop normalized keys that are strictly absorbed by another normalized key.
 * @param norms Distinct normalization keys
 * @returns Keys with no strict superseding other in the list
 */
function dropSupersededNorms(norms: string[]): string[] {
  return norms.filter((n) => !norms.some((other) => other !== n && normSupersedes(other, n)))
}

/**
 * Pick the shortest norm in a cluster; prefer strings with length ≥ {@link minW} when any exist (avoids using 2–3 char fragments as the bucket id when a longer peer exists).
 * @param members Distinct norm keys in one substring/subsequence cluster
 * @param minW Minimum length for “substantive” preference
 * @returns Representative norm for counts and (when multi-member) facet display
 */
function pickShortestNormRepresentative(members: string[], minW: number): string {
  let best = members[0]!
  for (let k = 1; k < members.length; k++) {
    const cur = members[k]!
    const bestOk = best.length >= minW
    const curOk = cur.length >= minW
    if (curOk && !bestOk) {
      best = cur
      continue
    }
    if (bestOk && !curOk) {
      continue
    }
    if (cur.length < best.length) {
      best = cur
    } else if (cur.length === best.length && cur.localeCompare(best, 'und') < 0) {
      best = cur
    }
  }
  return best
}

/**
 * Group norm keys linked by {@link normSupersedes} (substring / gated CJK subsequence) so pool histogram buckets use one shared count.
 * @param norms Keys from {@link facetNormKey}
 * @param minW Passed to {@link pickShortestNormRepresentative}
 * @returns Disjoint clusters with `rep` = shortest substantive norm per cluster
 */
function clusterFacetNormsForPoolHistogram(norms: string[], minW: number): { rep: string; members: string[] }[] {
  const list = [...norms]
  const n = list.length
  if (n === 0) {
    return []
  }
  const { find, union } = createUnionFind(n)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = list[i]!
      const b = list[j]!
      const longer = a.length >= b.length ? a : b
      const shorter = a.length >= b.length ? b : a
      if (normSupersedes(longer, shorter)) {
        union(i, j)
      }
    }
  }
  const byRoot = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    const idxs = byRoot.get(r) ?? []
    idxs.push(i)
    byRoot.set(r, idxs)
  }
  return [...byRoot.values()].map((idxs) => {
    const members = idxs.map((i) => list[i]!)
    const rep = pickShortestNormRepresentative(members, minW)
    return { rep, members }
  })
}

/**
 * One longest display string per normalization bucket.
 * @param raws Distinct trimmed labels
 * @returns Longest raw per {@link facetNormKey}
 */
function longestRawPerNorm(raws: string[]): string[] {
  const byNorm = new Map<string, string>()
  for (const raw of raws) {
    const n = facetNormKey(raw)
    const cur = byNorm.get(n)
    if (!cur) {
      byNorm.set(n, raw)
    } else {
      byNorm.set(n, pickBetterDisplayRaw(cur, raw))
    }
  }
  return [...byNorm.values()]
}

/**
 * Merge histogram rows whose display keys are fuzzy-equivalent; sums counts and picks representative via
 * {@link pickClusterRepresentativeWeighted}.
 * @param merged Display label → aggregated count after deterministic merge
 * @returns New map with fuzzy-collapsed keys
 */
function fuzzyMergeHistogramDisplayMap(merged: Map<string, number>): Map<string, number> {
  const entries = [...merged.entries()]
  if (entries.length <= 1) {
    return merged
  }
  const labels = entries.map(([k]) => k)
  const n = labels.length
  const { find, union } = createUnionFind(n)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shouldFuzzyMergeFacets(labels[i]!, labels[j]!)) {
        union(i, j)
      }
    }
  }
  const clusterIndices = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    const list = clusterIndices.get(r) ?? []
    list.push(i)
    clusterIndices.set(r, list)
  }
  const out = new Map<string, number>()
  const countByDisplay = new Map(entries.map(([k, c]) => [k, c]))
  for (const idxs of clusterIndices.values()) {
    const groupLabels = idxs.map((i) => labels[i]!)
    const rep = pickClusterRepresentativeWeighted(groupLabels, countByDisplay)
    let sum = 0
    for (const i of idxs) {
      sum += entries[i]![1]
    }
    out.set(rep, sum)
  }
  return out
}

/**
 * Drop labels redundant after normalization: substring containment, repeated-run collapse, (CJK-only, len≥4)
 * ordered-subsequence containment, then fuzzball merge (partial + gated token_sort).
 * @param raws Trimmed unique labels
 * @returns Survivors with counts rolled implicitly only when callers merge histograms separately
 */
export function dropOverlappingFacetLabels(raws: string[]): string[] {
  const reduced = longestRawPerNorm(raws)
  const norms = reduced.map((r) => facetNormKey(r))
  const uniqueNorms = [...new Set(norms)]
  const keptNorms = new Set(dropSupersededNorms(uniqueNorms))
  const deterministic = reduced.filter((r, i) => keptNorms.has(norms[i]!))
  return fuzzyCollapseDistinctLabels(deterministic)
}

/**
 * Per-item RSS labels: deterministic dedupe then fuzzball merge for reorder / fragment variants.
 * @param labels Trimmed facet strings on one aggregated row
 * @returns Deduped list (may be empty)
 */
export function dedupeFacetLabelListForItem(labels: string[]): string[] {
  const uniq = [...new Set(labels.map((x) => x.trim()).filter((x) => x.length > 0))]
  if (uniq.length === 0) {
    return []
  }
  return dropOverlappingFacetLabels(uniq)
}

/**
 * Merge pool-level facet histogram rows: sum counts for exact duplicates, merge buckets that share the same
 * normalization key, cluster norms linked by {@link normSupersedes} and use the **shortest** norm in each cluster
 * as the facet `value` when the cluster has more than one member (e.g. 霍尔木兹 + 霍尔木兹海峡 → 霍尔木兹), then
 * fuzzball-collapse display keys among survivors.
 * @param rows Histogram rows from a `Map` iteration
 * @returns Sorted by count desc, then label asc
 */
export function mergeFacetHistogramRowsBySubstring(rows: { value: string; count: number }[]): { value: string; count: number }[] {
  const sumByNorm = new Map<string, number>()
  const displayCountByNorm = new Map<string, Map<string, number>>()
  for (const { value, count } of rows) {
    const v = value.trim()
    if (!v) {
      continue
    }
    const norm = facetNormKey(v)
    sumByNorm.set(norm, (sumByNorm.get(norm) ?? 0) + count)
    let byDisplay = displayCountByNorm.get(norm)
    if (!byDisplay) {
      byDisplay = new Map<string, number>()
      displayCountByNorm.set(norm, byDisplay)
    }
    byDisplay.set(v, (byDisplay.get(v) ?? 0) + count)
  }
  const displayByNorm = new Map<string, string>()
  for (const norm of sumByNorm.keys()) {
    const byDisplay = displayCountByNorm.get(norm)
    if (!byDisplay || byDisplay.size === 0) {
      displayByNorm.set(norm, norm)
      continue
    }
    const pairList = [...byDisplay.entries()]
    let best = { label: pairList[0]![0], count: pairList[0]![1] }
    for (let i = 1; i < pairList.length; i++) {
      const [lab, c] = pairList[i]!
      best = pickBetterHistogramDisplay(best.label, best.count, lab, c)
    }
    displayByNorm.set(norm, best.label)
  }
  const normKeys = [...sumByNorm.keys()]
  if (normKeys.length === 0) {
    return []
  }
  const minW = HISTOGRAM_DISPLAY_MIN_LEN_FOR_SHORTER_PREFERENCE
  const clusters = clusterFacetNormsForPoolHistogram(normKeys, minW)
  const merged = new Map<string, number>()
  for (const { rep, members } of clusters) {
    let sum = 0
    for (const m of members) {
      sum += sumByNorm.get(m) ?? 0
    }
    /** Multi-member cluster: facet value is the shortest norm (e.g. 霍尔木兹 ⊂ 霍尔木兹海峡). Singleton keeps per-norm display polish. */
    const display = members.length === 1 ? (displayByNorm.get(rep) ?? rep) : rep
    merged.set(display, (merged.get(display) ?? 0) + sum)
  }
  const fuzzyPass = fuzzyMergeHistogramDisplayMap(merged)
  return [...fuzzyPass.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}
