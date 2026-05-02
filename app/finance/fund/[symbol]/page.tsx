import { redirect } from 'next/navigation'

import { FundOverviewSwitcher } from '../../components/FundOverviewSwitcher'
import { FUND_ETF_DEFAULT_SYMBOL, getFundEtfSymbolBySlug } from '../fundSymbolRoute'

interface FinanceFundSymbolPageProps {
  params: Promise<{ symbol: string }>
}

/**
 * Fund/ETF OHLCV overview for one configured six-digit symbol.
 *
 * @param props Dynamic route params
 * @returns Fund overview with symbol switcher
 */
export default async function FinanceFundSymbolPage(props: Readonly<FinanceFundSymbolPageProps>) {
  const params = await props.params
  const symbol = getFundEtfSymbolBySlug(params.symbol)
  if (!symbol) {
    redirect(`/finance/fund/${FUND_ETF_DEFAULT_SYMBOL}`)
  }
  return <FundOverviewSwitcher symbol={symbol} />
}
