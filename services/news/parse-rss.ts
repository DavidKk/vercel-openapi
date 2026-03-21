import type { ParsedFeedItem } from './types'

/**
 * Decode a small subset of XML entities used in RSS titles/descriptions.
 * @param raw Raw text that may contain &amp; etc.
 * @returns Decoded string
 */
export function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/**
 * Normalize raw inner XML for one tag (CDATA, strip nested tags, entities).
 * @param raw Matched group inside opening/closing tag
 * @returns Plain text or empty
 */
function normalizeRawTagInner(raw: string): string {
  let inner = raw.trim()
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i)
  if (cdata) {
    inner = cdata[1].trim()
  }
  return decodeXmlEntities(inner.replace(/<[^>]+>/g, '')).trim()
}

/**
 * Deduplicate strings while preserving first-seen order.
 * @param values Raw values
 * @returns Deduped non-empty strings
 */
function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const t = v.trim()
    if (!t || seen.has(t)) {
      continue
    }
    seen.add(t)
    out.push(t)
  }
  return out
}

/**
 * Escape a tag name for use inside a RegExp (supports `dc:subject`, `media:keywords`).
 * @param tagName XML local or qualified name
 * @returns Escaped pattern fragment
 */
function escapeTagForRegex(tagName: string): string {
  return tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Collect all inner texts for repeated tags (e.g. multiple `category`).
 * @param block XML fragment (one item)
 * @param tagName Tag name including namespace prefix if present
 * @returns Non-empty normalized strings
 */
function allTagInnerTexts(block: string, tagName: string): string[] {
  const esc = escapeTagForRegex(tagName)
  const re = new RegExp(`<${esc}[^>]*>([\\s\\S]*?)<\\/${esc}>`, 'gi')
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(block)) !== null) {
    const t = normalizeRawTagInner(m[1])
    if (t) {
      out.push(t)
    }
  }
  return dedupePreserveOrder(out)
}

/**
 * Extract inner text for a tag, including CDATA sections (RSS 2.0).
 * @param block XML fragment
 * @param tag Local tag name (case-insensitive)
 * @returns Trimmed text or null
 */
function firstTagText(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = block.match(re)
  if (!m) {
    return null
  }
  const t = normalizeRawTagInner(m[1])
  return t || null
}

/**
 * RSS/Atom category-like fields merged into one list.
 * @param itemBlock XML for one item
 * @returns Deduped category labels
 */
function parseItemFeedCategories(itemBlock: string): string[] {
  const a = allTagInnerTexts(itemBlock, 'category')
  const b = allTagInnerTexts(itemBlock, 'dc:subject')
  return dedupePreserveOrder([...a, ...b])
}

/**
 * Keyword blobs split into tokens (`media:keywords`, plain `keywords`).
 * @param itemBlock XML for one item
 * @returns Deduped keyword strings
 */
function parseItemFeedKeywords(itemBlock: string): string[] {
  const blobs = [...allTagInnerTexts(itemBlock, 'media:keywords'), ...allTagInnerTexts(itemBlock, 'keywords')]
  const parts: string[] = []
  for (const b of blobs) {
    for (const p of b.split(/[,，;；|｜]/)) {
      const t = p.trim()
      if (t) {
        parts.push(t)
      }
    }
  }
  return dedupePreserveOrder(parts)
}

/**
 * Parse link from RSS item (handles plain &lt;link&gt;...&lt;/link&gt;).
 * @param itemBlock XML for one &lt;item&gt;
 * @returns URL string or empty string
 */
function parseItemLink(itemBlock: string): string {
  const textLink = firstTagText(itemBlock, 'link')
  if (textLink) {
    return textLink
  }
  const m = itemBlock.match(/<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*\/?>/i)
  return m ? decodeXmlEntities(m[1].trim()) : ''
}

/**
 * Parse pubDate to ISO string when possible.
 * @param itemBlock XML for one item
 * @returns ISO date or null
 */
function parsePubDateIso(itemBlock: string): string | null {
  const raw = firstTagText(itemBlock, 'pubDate')
  if (!raw) {
    return null
  }
  const t = Date.parse(raw)
  if (Number.isNaN(t)) {
    return null
  }
  return new Date(t).toISOString()
}

/**
 * Extract RSS 2.0 items from XML body (best-effort; no full XML parser).
 * @param xml Full RSS XML text
 * @returns Parsed items (may be empty if not RSS 2.0 or malformed)
 */
export function parseRssItems(xml: string): ParsedFeedItem[] {
  const items: ParsedFeedItem[] = []
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    const title = firstTagText(block, 'title') ?? ''
    const link = parseItemLink(block)
    if (!link && !title) {
      continue
    }
    const description = firstTagText(block, 'description') ?? firstTagText(block, 'content:encoded')
    const feedCategories = parseItemFeedCategories(block)
    const feedKeywords = parseItemFeedKeywords(block)
    const row: ParsedFeedItem = {
      title: title || link,
      link: link || title,
      publishedAt: parsePubDateIso(block),
      summary: description,
    }
    if (feedCategories.length > 0) {
      row.feedCategories = feedCategories
    }
    if (feedKeywords.length > 0) {
      row.feedKeywords = feedKeywords
    }
    items.push(row)
  }
  return items
}
