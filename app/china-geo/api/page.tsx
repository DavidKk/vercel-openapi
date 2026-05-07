import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { GeoApiPlayground } from './components'

/**
 * China GEO REST API page.
 * Left: documentation for GET/POST /api/geo. Right: interactive playground (GET for browser cache).
 */
export default function GeoApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="China GEO API" subtitle="Reverse geocode latitude/longitude to province/city/district (China only, Supabase). Prefer GET for cache." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/geo" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Query: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">latitude</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">longitude</code>{' '}
              (numbers). Cacheable (long-lived). Returns <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">province</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">city</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">district</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">latitude</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">longitude</code>.
            </p>
            <DocEndpointRow method="POST" path="/api/geo" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ latitude, longitude }'}</code> (numbers). Same response.
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Response example</h2>
          <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{
  "province": "北京市",
  "city": "",
  "district": "",
  "latitude": 39.9042,
  "longitude": 116.4074
}`}
          </pre>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <GeoApiPlayground />
        </div>
      </section>
    </div>
  )
}
