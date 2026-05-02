import { redirect } from 'next/navigation'

/**
 * Legacy route for TASI overview.
 * Redirects to /finance/stock.
 */
export default function FinanceTasiPage() {
  redirect('/finance/stock')
}
