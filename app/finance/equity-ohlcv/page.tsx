import { redirect } from 'next/navigation'

import { FUND_ETF_DEFAULT_SYMBOL } from '../fund/fundSymbolRoute'

/**
 * Legacy path: redirect to fund symbol route.
 */
export default function FinanceEquityOhlcvPage() {
  redirect(`/finance/fund/${FUND_ETF_DEFAULT_SYMBOL}`)
}
