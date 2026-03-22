import { decodeXmlEntities } from '../parsing/parse-rss'

/**
 * Keywords at least this long must appear as a contiguous literal substring of the merged document
 * (title + HTML summary stripped). Shorter tags are kept (e.g. 2–3 char outlets / acronyms).
 */
const MIN_KEYWORD_LENGTH_FOR_LITERAL_SUBSTRING_CHECK = 4

/**
 * Strip HTML tags and normalize whitespace for matching RSS keywords against article text.
 * @param summary RSS `description` / `content:encoded` HTML or plain text
 * @returns Single-line plain text (may be empty)
 */
export function stripHtmlSummaryToPlain(summary: string | null | undefined): string {
  if (!summary?.trim()) {
    return ''
  }
  const noTags = summary.replace(/<[^>]+>/g, ' ')
  return decodeXmlEntities(noTags).replace(/\s+/g, ' ').trim()
}

/**
 * Build one searchable plain string from title and optional HTML summary.
 * @param title Item title
 * @param summary HTML or null
 * @returns Normalized plain document for substring checks
 */
export function buildPlainDocumentForKeywordCheck(title: string, summary: string | null | undefined): string {
  const t = title.trim().replace(/\s+/g, ' ')
  const b = stripHtmlSummaryToPlain(summary)
  return `${t} ${b}`.replace(/\s+/g, ' ').trim()
}

/**
 * Drop RSS-style keyword chips that never occur literally in the article (catches bogus
 * bigrams like 海峡霍尔木 or 霍尔木霍尔木兹海峡 from upstream feeds).
 * @param keywords Candidate labels (order preserved)
 * @param plainDocument Output of {@link buildPlainDocumentForKeywordCheck} or merged plain from several items
 * @returns Filtered list; empty strings removed
 */
export function filterFeedKeywordsLiteralInPlain(keywords: string[], plainDocument: string): string[] {
  const plain = plainDocument.replace(/\s+/g, ' ').trim()
  const out: string[] = []
  for (const raw of keywords) {
    const k = raw.trim()
    if (!k) {
      continue
    }
    if (k.length < MIN_KEYWORD_LENGTH_FOR_LITERAL_SUBSTRING_CHECK) {
      out.push(k)
      continue
    }
    if (plain.includes(k)) {
      out.push(k)
    }
  }
  return out
}
