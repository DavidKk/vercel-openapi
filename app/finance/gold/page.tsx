import { redirect } from 'next/navigation'

/**
 * Legacy URL: `/finance/gold` → canonical precious metals route.
 */
export default function FinanceGoldRedirectPage() {
  redirect('/finance/precious-metals')
}
