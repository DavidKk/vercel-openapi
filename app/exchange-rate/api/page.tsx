import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { ExchangeRateApiPlayground } from './components'

/**
 * Exchange rate REST API page.
 * Left: docs for GET and POST /api/exchange-rate. Right: playground.
 */
export default function ExchangeRateApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Exchange rate REST API" subtitle="Get rates for a base currency or convert an amount." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/exchange-rate" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Query: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">base</code> (default USD). Returns{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">base</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">rates</code>.
            </p>
          </div>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="POST" path="/api/exchange-rate" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Body: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{'{ from, to, amount }'}</code>. Returns{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">from</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">to</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">amount</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">result</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">rate</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date</code>.
            </p>
          </div>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>Response example (GET)</h2>
          <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{
  "base": "USD",
  "date": "2025-01-15",
  "rates": { "CNY": 7.24, "EUR": 0.92 }
}`}
          </pre>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <ExchangeRateApiPlayground />
        </div>
      </section>
    </div>
  )
}
