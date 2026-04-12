import { ModuleManagePlaceholder } from '@/components/ModuleManagePlaceholder'
import { checkAccess } from '@/services/auth/access'

/**
 * China Fuel Price module manage page. Requires authenticated session.
 * @returns China Fuel Price manage page content
 */
export default async function FuelPriceManagePage() {
  await checkAccess({ isApiRouter: false })
  return <ModuleManagePlaceholder moduleName="China Fuel Price" />
}
