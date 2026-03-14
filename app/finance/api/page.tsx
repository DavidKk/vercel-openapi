import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { TasiApiPlayground } from './components'

/**
 * Finance REST API page. Left: docs; Right: playground.
 */
export default function FinanceTasiApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader title="Finance REST API" subtitle="Company daily and market summary (currently TASI). Today from feed; history and K-line from Turso." />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Endpoints</h2>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/tasi/company/daily" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              No params = today all companies. <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date=YYYY-MM-DD</code> = that day.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">code</code> + <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">from</code> +{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">to</code> = company K-line.
            </p>
          </div>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/tasi/summary/daily" />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              No params = today. <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date=YYYY-MM-DD</code> = that day.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">from</code> + <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">to</code> = market K-line.
            </p>
          </div>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>Response example (company daily)</h2>
          <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`[{"code":"1120","name":"SNB","date":"2025-03-14","open":42.5,"high":43,"low":42.2,"lastPrice":42.8,"volume":1000000}]`}
          </pre>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <TasiApiPlayground />
        </div>
      </section>
    </div>
  )
}
