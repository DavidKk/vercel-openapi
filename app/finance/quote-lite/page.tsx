import { redirect } from 'next/navigation'

/**
 * Legacy quote-lite route → canonical precious metals overview.
 */
export default function FinanceQuoteLitePage() {
  redirect('/finance/precious-metals')
}
