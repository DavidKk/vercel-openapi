import { ModuleManagePlaceholder } from '@/components/ModuleManagePlaceholder'
import { checkAccess } from '@/services/auth/access'

/**
 * Exchange rate module manage page. Requires authenticated session.
 * @returns Exchange rate manage page content
 */
export default async function ExchangeRateManagePage() {
  await checkAccess({ isApiRouter: false })
  return <ModuleManagePlaceholder moduleName="Exchange Rate" />
}
