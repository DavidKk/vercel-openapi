import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { MoviesApiPlayground } from './components'

/**
 * Movies REST API page.
 * Left side shows documentation for REST endpoints, right side is an interactive playground.
 */
export default function MoviesApiPage() {
  return (
    <div className="flex h-full">
      {/* Left: documentation */}
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col border-r border-gray-200 bg-white">
        <DocPanelHeader title="Movies API" subtitle="Get latest movies list (cached; read-only for public)." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/movies" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>Returns latest movies list from cache (GIST). No auth required.</p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Response example</h2>
          <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{
  "code": 0,
  "message": "ok",
  "data": { "movies": [], "cachedAt": 1234567890 }
}`}
          </pre>
        </div>
      </section>

      {/* Right: playground */}
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col bg-gray-50">
        <div className="flex min-h-0 flex-1 flex-col">
          <MoviesApiPlayground />
        </div>
      </section>
    </div>
  )
}
