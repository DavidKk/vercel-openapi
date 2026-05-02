import { redirect } from 'next/navigation'

/**
 * Stock default route redirects to TASI market route.
 */
export default function FinanceStockPage() {
  redirect('/finance/stock/tasi')
}
