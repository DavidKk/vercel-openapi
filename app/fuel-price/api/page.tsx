import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { FuelPriceApiPlayground } from './components'

/**
 * Fuel price REST API page.
 * Left: list of all fuel-price endpoints. Right: playground to call any of them.
 */
export default function FuelPriceApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Fuel price REST API" subtitle="All endpoints below. Responses are cached on the edge when possible." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/fuel-price" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              All provinces. Returns <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">current</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">previous</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">latestUpdated</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">previousUpdated</code>.
            </p>
          </div>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/fuel-price/:province" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>Single province (path param, e.g. 北京). Same shape with one province in current/previous.</p>
          </div>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/fuel-price/:province/promo" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Query: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">fuelType</code> (b92|b95|b98|b0),{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">amount</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">bonus</code>. Returns
              recharge promo result.
            </p>
          </div>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>Response example (GET /api/fuel-price)</h2>
          <pre className="max-h-64 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{
  "current": [
    {
      "province": "Beijing",
      "b92": 8.12,
      "b95": 8.71,
      "b98": 9.39,
      "b0": 7.34
    }
  ],
  "previous": [],
  "latestUpdated": 1700000000000,
  "previousUpdated": 0
}`}
          </pre>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <FuelPriceApiPlayground />
        </div>
      </section>
    </div>
  )
}
