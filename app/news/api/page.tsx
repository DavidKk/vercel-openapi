import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { NewsApiPlayground } from './components'

/**
 * News REST API page: docs + playground.
 */
export default function NewsApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="News API" subtitle="List RSS sources and aggregate feeds (read-only; latest snapshot)." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/news/sources" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>Optional query: category, region (cn | hk_tw). Returns sources and baseUrl.</p>
          </div>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/news/feed" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Optional: category, region, limit (items, max 100), maxFeeds (sources, max 25). Returns items, fetchedAt, baseUrl; partial errors per source when upstream fails.
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Response shape</h2>
          <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "title": "...",
        "link": "https://...",
        "publishedAt": "2025-03-21T08:00:00.000Z",
        "summary": null,
        "sourceId": "thepaper",
        "sourceLabel": "澎湃新闻",
        "category": "general-news",
        "region": "cn"
      }
    ],
    "fetchedAt": "...",
    "baseUrl": "https://rsshub.app"
  }
}`}
          </pre>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <NewsApiPlayground />
        </div>
      </section>
    </div>
  )
}
