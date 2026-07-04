import { DOC_ENDPOINT_BOX_CLASS, DOC_ENDPOINT_DESC_CLASS, DOC_SECTION_TITLE_CLASS } from '@/app/Nav/constants'
import { DocEndpointRow } from '@/components/DocEndpointRow'
import { DocPanelHeader } from '@/components/DocPanelHeader'

import {
  FINANCE_MAJOR,
  FUNDS_API_SECTION_TITLE,
  FUNDS_DAILY_SUBTYPE,
  FUNDS_OVERVIEW_STOCKLIST_TITLE,
  PRECIOUS_METALS_API_PLACEHOLDER,
  PRECIOUS_METALS_API_SECTION_SUBTITLE,
  STOCKS_API_SECTION_TITLE,
  STOCKS_API_SUBGROUP,
} from '../constants/financeApiTaxonomy'
import { FinanceApiPlayground } from './components'

const SUBHEAD = 'mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-700'

/**
 * Finance REST API page. Left: docs grouped like sidebar (Stocks / Funds / Precious metals); Right: playground.
 */
export default function FinanceApiPage() {
  return (
    <div className="flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible">
      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1">
        <DocPanelHeader
          title="Finance REST API"
          subtitle="Grouped like the finance sidebar: stocks (TASI via /api/finance/stock/summary?market=TASI like other markets), funds, precious metals."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>
            {FINANCE_MAJOR.stocks} — {STOCKS_API_SECTION_TITLE}
          </h2>
          <p className="mb-2 text-[10px] leading-relaxed text-gray-600">
            Stock index snapshots — <strong className="font-medium">TASI</strong> uses the same path as other markets:{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/stock/summary?market=TASI</code>.
          </p>

          <h3 className={SUBHEAD}>{STOCKS_API_SUBGROUP.indexSnapshotMultiMarket}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/stock/summary" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Envelope <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{`{ code, message, data }`}</code>: single →{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">data.market</code> + <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">data.summary</code>;
              batch → <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">data.items</code>.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=TASI</code> (default) or S&amp;P 500, Dow Jones, Nasdaq, …
            </p>
          </div>

          <details className="mb-3 rounded border border-gray-200 bg-gray-50/80">
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold text-gray-800">
              Legacy TASI exchange feed &amp; company paths (historical / deprecated)
            </summary>
            <div className="space-y-2 border-t border-gray-200 px-3 py-2">
              <p className="text-[10px] leading-relaxed text-gray-600">
                Not for latest TASI index or constituents. Company latest/list → <strong className="font-medium">400</strong>. Historical K-line only where noted.
              </p>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-700">{STOCKS_API_SUBGROUP.indexDailyFromFeed}</h4>
              <div className={DOC_ENDPOINT_BOX_CLASS}>
                <DocEndpointRow method="GET" path="/api/finance/stock/tasi/summary/daily" enableCopy />
                <DocEndpointRow method="GET" path="/api/finance/stock/tasi/summary/daily/latest" enableCopy />
                <DocEndpointRow method="GET" path="/api/finance/stock/tasi/daily/latest" enableCopy />
              </div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-700">{STOCKS_API_SUBGROUP.indexHourlyFromFeed}</h4>
              <div className={DOC_ENDPOINT_BOX_CLASS}>
                <DocEndpointRow method="GET" path="/api/finance/stock/tasi/summary/hourly" enableCopy />
              </div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-700">{STOCKS_API_SUBGROUP.constituentsDailyFromFeed}</h4>
              <div className={DOC_ENDPOINT_BOX_CLASS}>
                <DocEndpointRow method="GET" path="/api/finance/stock/tasi/company/daily" enableCopy />
                <DocEndpointRow method="GET" path="/api/finance/stock/tasi/company/daily/latest" enableCopy />
                <DocEndpointRow method="GET" path="/api/finance/market/company/daily" enableCopy />
                <DocEndpointRow method="GET" path="/api/finance/market/company/daily/latest" enableCopy />
              </div>
            </div>
          </details>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>
            {FINANCE_MAJOR.funds} — {FUNDS_API_SECTION_TITLE}
          </h2>
          <p className="mb-2 text-[10px] leading-relaxed text-gray-600">
            Six-digit catalog: two <strong className="font-medium">daily</strong> response families — <strong className="font-medium">exchange OHLCV</strong> (listed/traded) vs{' '}
            <strong className="font-medium">NAV disclosure</strong> (unit + daily %). Canonical paths mirror{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">/finance/fund/:symbol</code> (symbol in the URL). Multi-symbol batch remains on legacy{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/market/daily?symbols=…</code>.
          </p>

          <h3 className={SUBHEAD}>{FUNDS_DAILY_SUBTYPE.exchangeDailyBars}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/fund/518880/ohlcv/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Replace <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">518880</code> with a six-digit code or{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">XAUUSD</code>. Query: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">startDate</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">endDate</code>; optional{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">withIndicators</code> (legacy cold-start by default),{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">indicatorWarmup</code> (120 days),{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">indicatorWarmupDays</code> (35-250),{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">syncIfEmpty</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">forceSync</code>.
              Legacy: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/market/daily?symbols=…</code>.
            </p>
            <DocEndpointRow method="GET" path="/api/finance/fund/518880/ohlcv/daily/latest" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Latest one OHLCV bar for that path symbol. Response <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{`{ asOf, items, synced }`}</code>.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">withIndicators</code> defaults <strong className="font-medium">true</strong> (pass{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">false</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">0</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">no</code>, or <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">off</code> to skip MACD
              streak); <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">syncIfEmpty</code> defaults <strong className="font-medium">true</strong> when omitted. Legacy:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/market/daily/latest?symbols=…</code>.
            </p>
          </div>

          <h3 className={SUBHEAD}>{FUNDS_DAILY_SUBTYPE.navDisclosureDaily}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/fund/012922/nav/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Replace <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">012922</code> with a configured NAV six-digit code. Query:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">startDate</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">endDate</code>; optional{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">syncIfEmpty</code>. Legacy:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/fund/nav/daily?symbols=…</code>.
            </p>
            <DocEndpointRow method="GET" path="/api/finance/fund/012922/nav/daily/latest" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Latest one NAV row for that path symbol. <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">syncIfEmpty</code> defaults{' '}
              <strong className="font-medium">true</strong> when omitted. Legacy:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/fund/nav/daily/latest?symbols=…</code>.
            </p>
          </div>

          <h3 className={SUBHEAD}>{FUNDS_OVERVIEW_STOCKLIST_TITLE}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/overview/stock-list" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Required: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">symbols</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">startDate</code>
              , <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">endDate</code>. Returns{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">data.stockList</code> (latest bar per symbol + MACD streak). Optional{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">syncIfEmpty</code> for allowlisted fund/ETF symbols.
            </p>
          </div>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>
            {FINANCE_MAJOR.preciousMetals} — {PRECIOUS_METALS_API_SECTION_SUBTITLE}
          </h2>
          <p className="text-[10px] leading-relaxed text-gray-600">{PRECIOUS_METALS_API_PLACEHOLDER}</p>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>Response example (stock summary — TASI)</h2>
          <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`{"code":0,"message":"ok","data":{"market":"TASI","summary":{"market":"TASI","date":"2025-03-14","open":12000,"high":12100,"low":11950,"close":12050,"change":50,"changePercent":0.42,"volumeTraded":100000000,"valueTraded":2500000000,"source":"tasi"}}}`}
          </pre>
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1">
        <div className="flex min-h-0 flex-1 flex-col">
          <FinanceApiPlayground />
        </div>
      </section>
    </div>
  )
}
