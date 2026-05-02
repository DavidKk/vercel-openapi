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
          subtitle="Grouped like the finance sidebar: stocks (index snapshot + TASI feed under /api/finance/stock/tasi/… matching /finance/stock/tasi), funds (per-symbol /api/finance/fund/:symbol/… matching /finance/fund/:symbol), precious metals (XAUUSD via /api/finance/fund/XAUUSD/ohlcv/… + Turso eastmoney-precious-spot)."
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800">
          <h2 className={DOC_SECTION_TITLE_CLASS}>
            {FINANCE_MAJOR.stocks} — {STOCKS_API_SECTION_TITLE}
          </h2>
          <p className="mb-2 text-[10px] leading-relaxed text-gray-600">
            These are <strong className="font-medium">stock-market</strong> series (指数与成分). <strong className="font-medium">Canonical TASI feed URLs</strong> mirror the web
            app route <code className="rounded bg-gray-100 px-1 py-0.5">/finance/stock/tasi</code> — use{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/stock/tasi/…</code> (same slug as the UI). <strong className="font-medium">Only TASI</strong> is wired
            for that feed; other markets → <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/stock/summary?market=…</code>. Legacy{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/market/…</code> and <code className="rounded bg-gray-100 px-1 py-0.5">/api/finance/tasi/…</code> remain
            supported.
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
            <DocEndpointRow method="GET" path="/api/finance/stock/tasi/summary/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              No <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">market=</code> query — slug is in the path. No params = today index summary.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date=</code> single day; <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">from</code> +{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">to</code> = index K-line. Legacy:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/market/summary/daily?market=TASI</code>.
            </p>
            <DocEndpointRow method="GET" path="/api/finance/stock/tasi/summary/dailylatest" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Latest index session + <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">asOf</code> /{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">dataDate</code>. Legacy:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/market/summary/daily/latest</code>.
            </p>
            <DocEndpointRow method="GET" path="/api/finance/stock/tasi/dailylatest" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              One call: latest <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">summary</code> + full{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">items</code> (companies) with shared{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">asOf</code> / <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">dataDate</code>.
            </p>
          </div>

          <h3 className={SUBHEAD}>{STOCKS_API_SUBGROUP.indexHourlyFromFeed}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/stock/tasi/summary/hourly" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              <strong className="font-medium">TASI only</strong> — SAHMK vs daily summary field alignment.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">SAHMK_API_KEY</code> server-side. Legacy:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/market/summary/hourly?market=TASI</code>.
            </p>
          </div>

          <h3 className={SUBHEAD}>{STOCKS_API_SUBGROUP.constituentsDailyFromFeed}</h3>
          <div className={DOC_ENDPOINT_BOX_CLASS}>
            <DocEndpointRow method="GET" path="/api/finance/stock/tasi/company/daily" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              No extra params = today all companies. <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">date=YYYY-MM-DD</code> = that day.{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">code</code> + <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">from</code> +{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">to</code> = company K-line. Legacy:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/market/company/daily?market=TASI</code>.
            </p>
            <DocEndpointRow method="GET" path="/api/finance/stock/tasi/company/dailylatest" enableCopy />
            <p className={DOC_ENDPOINT_DESC_CLASS}>
              Latest company list + <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">asOf</code> /{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">dataDate</code>. Legacy:{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/market/company/daily/latest</code>.
            </p>
          </div>

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
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">withIndicators</code>, <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">syncIfEmpty</code>.
              Legacy: <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">GET /api/finance/market/daily?symbols=…</code>.
            </p>
            <DocEndpointRow method="GET" path="/api/finance/fund/518880/ohlcv/dailylatest" enableCopy />
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
            <DocEndpointRow method="GET" path="/api/finance/fund/012922/nav/dailylatest" enableCopy />
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
