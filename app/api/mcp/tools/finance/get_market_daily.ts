import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import {
  getMarketDailyWithOptionalSync,
  INDICATOR_WARMUP_DAYS_MAX,
  INDICATOR_WARMUP_DAYS_MIN,
  isMarketDailyOhlcvSymbolSetAllowedForSync,
  marketDailySymbolsRejectionMessage,
  parseSymbols,
  toPublicOhlcvRecord,
} from '@/services/finance/market/daily'

/**
 * MCP tool: query market daily OHLCV for six-digit symbols or **XAUUSD** (precious spot).
 */
export const get_market_daily = tool(
  'get_market_daily',
  'Get exchange daily OHLCV for six-digit symbols (e.g. 518880) or XAUUSD. Canonical REST per symbol: GET /api/finance/fund/{symbol}/ohlcv/daily. Fund NAV codes must use get_fund_nav_daily. Requires symbols,startDate,endDate; optional withIndicators; optional indicatorWarmup computes indicators with a 120-calendar-day lookback instead of legacy window cold-start; optional indicatorWarmupDays (35-250) sets an explicit calendar-day lookback; optional syncIfEmpty (default true) re-fetches from Eastmoney when Turso is empty or has a large internal gap for allowlisted fund/ETF symbols; optional forceSync refreshes the requested range. Each item always includes macdUp and macdDown (null unless withIndicators and enriched). Returns items plus synced when a backfill ingest ran.',
  z.object({
    symbols: z.string().describe('Comma-separated symbols: six-digit codes and/or XAUUSD, e.g. 518880,510300 or XAUUSD'),
    startDate: z.string().describe('Start date YYYY-MM-DD'),
    endDate: z.string().describe('End date YYYY-MM-DD'),
    withIndicators: z
      .boolean()
      .optional()
      .describe('When true, computes MACD streak counts on the latest bar per symbol; items always include macdUp and macdDown keys (null when false or insufficient history)'),
    indicatorWarmup: z
      .boolean()
      .optional()
      .describe('When true, computes range indicators with a 120-calendar-day lookback before returning the requested window. Defaults false for legacy-service parity'),
    indicatorWarmupDays: z
      .number()
      .int()
      .min(INDICATOR_WARMUP_DAYS_MIN)
      .max(INDICATOR_WARMUP_DAYS_MAX)
      .optional()
      .describe('Explicit indicator warmup in calendar days. Valid range is 35-250. When provided, it implies indicator warmup'),
    syncIfEmpty: z.boolean().optional().describe('When true (default), attempt allowlisted on-demand ingest if first read is empty'),
    forceSync: z.boolean().optional().describe('When true, refresh the requested range before reading cached rows (allowlisted symbols only)'),
  }),
  async (params) => {
    const syncIfEmpty = params.syncIfEmpty !== false
    const symbols = parseSymbols(params.symbols)
    const reject = marketDailySymbolsRejectionMessage(symbols)
    if (reject) {
      throw new Error(reject)
    }
    const allowOnDemandIngest = isMarketDailyOhlcvSymbolSetAllowedForSync(symbols)
    const { items, synced } = await getMarketDailyWithOptionalSync({
      symbolsRaw: params.symbols,
      startDate: params.startDate,
      endDate: params.endDate,
      withIndicators: params.withIndicators ?? false,
      indicatorWarmup: params.indicatorWarmup ?? false,
      indicatorWarmupDays: params.indicatorWarmupDays,
      syncIfEmpty,
      forceSync: params.forceSync ?? false,
      allowOnDemandIngest,
    })
    const publicItems = items.map(toPublicOhlcvRecord).filter((row): row is NonNullable<typeof row> => row != null)
    return { items: publicItems, synced }
  }
)
