import { redirect } from 'next/navigation'

/**
 * Finance root: redirect to TASI market overview.
 */
export default function FinancePage() {
  redirect('/finance/tasi')
}
