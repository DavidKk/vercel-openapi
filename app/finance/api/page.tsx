import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import { TasiApiPlayground } from './components'

/**
 * Finance REST API page. Left: docs; Right: playground.
 */
export default function FinanceApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader
          title="Finance REST API"
          subtitle="Stock overview markets (FMP + TASI), Saudi company/index daily (TASI feed + Turso), six-digit OHLCV, and hourly alignment. Prefer market query on canonical paths below."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>Stock summary (all overview markets)</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/stock/summary" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=TASI</code> (default) or{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">S&amp;P 500</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">Dow Jones</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">Nasdaq</code>, … — latest index snapshot (TASI from feed path; others from FMP where supported). Batch:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">markets=TASI,S&amp;P 500,Dow Jones</code>.
            </p>
          </div>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>Market-scoped daily &amp; hourly (generic URL; TASI only today)</h2>
          <p className="mb-2 text-[10px] leading-relaxed text-gray-600">
            All paths below use a <code className="rounded bg-gray-100 px-1 py-0.5">market</code> query (default <code className="rounded bg-gray-100 px-1 py-0.5">TASI</code>). The
            interface is generic; <strong className="font-medium">only TASI is implemented</strong> for these feeds — other markets return{' '}
            <strong className="font-medium">400</strong>. Use <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/stock/summary</code> for other indices. Legacy{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/tasi/…</code> aliases the same handlers.
          </p>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/market/company/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=TASI</code> (default). No extra params = today all companies.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date=YYYY-MM-DD</code> = that day.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">code</code> + <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">from</code> +{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">to</code> = company K-line.
            </p>
          </div>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/market/summary/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=TASI</code> (default). No params = today index summary.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date=</code> single day; <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">from</code> +{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">to</code> = index K-line.
            </p>
          </div>

          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/market/summary/hourly" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Optional <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=TASI</code> (default). <strong className="font-medium">TASI only</strong> — SAHMK vs
              daily summary field alignment. <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">SAHMK_API_KEY</code> server-side.
            </p>
          </div>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>Six-digit market OHLCV</h2>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/market/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Required: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">symbols</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">startDate</code>
              , <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">endDate</code>. Optional{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">withIndicators=true</code>.
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
