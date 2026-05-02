import { redirect } from 'next/navigation'

import { StockOverviewSwitcher } from '../../components/StockOverviewSwitcher'
import { getMarketBySlug } from '../marketRoute'

interface FinanceStockMarketPageProps {
  params: Promise<{ market: string }>
}

/**
 * Stock overview page for a specific market route.
 *
 * @param props Route params
 * @returns Stock overview switcher page
 */
export default async function FinanceStockMarketPage(props: FinanceStockMarketPageProps) {
  const params = await props.params
  const market = getMarketBySlug(params.market)
  if (!market) {
    redirect('/finance/stock/tasi')
  }
  return <StockOverviewSwitcher market={market} />
}
