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
          subtitle="Grouped like the finance sidebar: stocks (index snapshot + exchange daily/hourly + constituents; feed TASI-only today), funds (two six-digit daily shapes), precious metals (XAUUSD on market/daily + Turso source eastmoney-precious-spot)."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>
            {FINANCE_MAJOR.stocks} — {STOCKS_API_SECTION_TITLE}
          </h2>
          <p className="mb-2 text-[10px] leading-relaxed text-gray-600">
            These are <strong className="font-medium">stock-market</strong> series (指数与成分). Paths use <code className="rounded bg-gray-100 px-1 py-0.5">market=</code> where
            noted; <strong className="font-medium">only TASI is wired</strong> for exchange-feed routes today — other markets return <strong className="font-medium">400</strong>.
            Use <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/stock/summary</code> for other overview indices. Legacy{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/tasi/…</code> aliases the same handlers.
          </p>

          <h3 className={SUBHEAD}>{STOCKS_API_SUBGROUP.indexSnapshotMultiMarket}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/stock/summary" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Envelope <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">{`{ code, message, data }`}</code>: single →{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">data.market</code> + <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">data.summary</code>;
              batch → <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">data.items</code>.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=TASI</code> (default) or S&amp;P 500, Dow Jones, Nasdaq, … — latest snapshot (TASI from feed
              path; others from FMP where supported).
            </p>
          </div>

          <h3 className={SUBHEAD}>{STOCKS_API_SUBGROUP.indexDailyFromFeed}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/market/summary/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=TASI</code> (default). No params = today index summary.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date=</code> single day; <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">from</code> +{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">to</code> = index K-line.
            </p>
          </div>

          <h3 className={SUBHEAD}>{STOCKS_API_SUBGROUP.indexHourlyFromFeed}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/market/summary/hourly" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Optional <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=TASI</code> (default). <strong className="font-medium">TASI only</strong> — SAHMK vs
              daily summary field alignment. <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">SAHMK_API_KEY</code> server-side.
            </p>
          </div>

          <h3 className={SUBHEAD}>{STOCKS_API_SUBGROUP.constituentsDailyFromFeed}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/market/company/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=TASI</code> (default). No extra params = today all companies.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date=YYYY-MM-DD</code> = that day.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">code</code> + <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">from</code> +{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">to</code> = company K-line.
            </p>
          </div>

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>
            {FINANCE_MAJOR.funds} — {FUNDS_API_SECTION_TITLE}
          </h2>
          <p className="mb-2 text-[10px] leading-relaxed text-gray-600">
            Six-digit catalog: two <strong className="font-medium">daily</strong> response families — <strong className="font-medium">exchange OHLCV</strong> (listed/traded) vs{' '}
            <strong className="font-medium">NAV disclosure</strong> (unit + daily %). Do not mix symbols across routes.
          </p>

          <h3 className={SUBHEAD}>{FUNDS_DAILY_SUBTYPE.exchangeDailyBars}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/market/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Required: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">symbols</code> (six-digit or{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">XAUUSD</code>), <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">startDate</code>,{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">endDate</code>. Optional{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">withIndicators</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">syncIfEmpty</code>.
              Turso stores <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">source=eastmoney</code> vs{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">eastmoney-precious-spot</code> for XAUUSD. Fund NAV-only codes →{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/fund/nav/daily</code>.
            </p>
          </div>

          <h3 className={SUBHEAD}>{FUNDS_DAILY_SUBTYPE.navDisclosureDaily}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/fund/nav/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Required: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">symbols</code> (configured NAV codes only),{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">startDate</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">endDate</code>. Optional{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">syncIfEmpty</code>. Response rows:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">unitNav</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">dailyChangePercent</code>{' '}
              only.
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

          <h2 className={`${DOC_SECTION_TITLE_CLASS} mt-3`}>Response example (company daily)</h2>
          <pre className="max-h-48 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {`[{"code":"1120","name":"SNB","date":"2025-03-14","open":42.5,"high":43,"low":42.2,"lastPrice":42.8,"volume":1000000}]`}
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
