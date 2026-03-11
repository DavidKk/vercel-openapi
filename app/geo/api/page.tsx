import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { GeoApiPlayground } from './components'

/**
 * Geolocation REST API page.
 * Left: documentation for POST /api/geo. Right: interactive playground.
 */
export default function GeoApiPage() {
  return (
    <div className="flex h-full">
      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col border-r border-gray-200 bg-white">
        <DocPanelHeader title="Geolocation API" subtitle="Reverse geocode latitude/longitude to get province (mainland China only)." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/geo" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ latitude, longitude }'}</code> (numbers). Returns{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">country</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">province</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">city</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">district</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">latitude</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">longitude</code>.
            </p>
          </div>
          <h2 className={DOC_SECTION_TITLE_CLASS}>Response example</h2>
          <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{
  "country": "中国",
  "province": "北京市",
  "city": "",
  "district": "",
  "latitude": 39.9042,
  "longitude": 116.4074
}`}
          </pre>
        </div>
      </section>

      <section className="flex min-h-0 w-1/2 min-w-[320px] flex-1 flex-col bg-gray-50">
        <div className="flex min-h-0 flex-1 flex-col">
          <GeoApiPlayground />
        </div>
      </section>
    </div>
  )
}
