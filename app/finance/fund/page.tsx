import { redirect } from 'next/navigation'

import { FUND_ETF_DEFAULT_SYMBOL } from './fundSymbolRoute'

/**
 * Fund root: redirect to default ETF symbol route (same pattern as `/finance/stock` → TASI).
 */
export default function FinanceFundPage() {
  redirect(`/finance/fund/${FUND_ETF_DEFAULT_SYMBOL}`)
}
