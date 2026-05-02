import { type NextRequest, NextResponse } from 'next/server'

import { getStockSummary, getStockSummaryBatch, parseStockMarket, type StockMarket } from '@/services/finance/stock'

export const runtime = 'nodejs'

/**
 * Return one market summary for Stock overview.
 *
 * @param req Next request
 * @returns JSON summary payload
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const marketsRaw = req.nextUrl.searchParams.get('markets')?.trim() ?? ''
  if (marketsRaw) {
    const markets = marketsRaw
      .split(',')
      .map((value) => value.trim())
      .map((value) => parseStockMarket(value))
      .filter((value): value is StockMarket => value != null)
    if (markets.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid markets',
        },
        { status: 400 }
      )
    }
    try {
      const items = await getStockSummaryBatch(markets)
      return NextResponse.json({ ok: true, items })
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }
  }

  const marketRaw = req.nextUrl.searchParams.get('market')?.trim() ?? 'TASI'
  const market = parseStockMarket(marketRaw)
  if (!market) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid market',
      },
      { status: 400 }
    )
  }

  try {
    const summary = await getStockSummary(market)
    return NextResponse.json({ ok: true, market, summary })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
