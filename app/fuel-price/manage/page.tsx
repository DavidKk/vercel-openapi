import { ModuleManagePlaceholder } from '@/components/ModuleManagePlaceholder'
import { checkAccess } from '@/services/auth/access'

/**
 * Fuel price module manage page. Requires authenticated session.
 * @returns Fuel price manage page content
 */
export default async function FuelPriceManagePage() {
  await checkAccess({ isApiRouter: false })
  return <ModuleManagePlaceholder moduleName="Fuel Price" />
}
