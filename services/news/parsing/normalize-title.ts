/**
 * Strip lightweight markup and whitespace for comparing RSS titles across feeds.
 * @param title Raw title from RSS
 * @returns Collapsed plain text; empty when unusable
 */
export function normalizeTitleKey(title: string): string {
  if (!title) {
    return ''
  }
  return title
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[。！？…\.!?]+$/g, '')
    .trim()
}
