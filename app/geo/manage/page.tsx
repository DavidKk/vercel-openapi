import { ModuleManagePlaceholder } from '@/components/ModuleManagePlaceholder'
import { checkAccess } from '@/services/auth/access'

/**
 * GEO module manage page. Requires authenticated session.
 * @returns GEO manage page content
 */
export default async function GeoManagePage() {
  await checkAccess({ isApiRouter: false })
  return <ModuleManagePlaceholder moduleName="China GEO" />
}
