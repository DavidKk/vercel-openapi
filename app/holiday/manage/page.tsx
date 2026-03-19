import { ModuleManagePlaceholder } from '@/components/ModuleManagePlaceholder'
import { checkAccess } from '@/services/auth/access'

/**
 * Holiday module manage page. Requires authenticated session.
 * @returns Holiday manage page content
 */
export default async function HolidayManagePage() {
  await checkAccess({ isApiRouter: false })
  return <ModuleManagePlaceholder moduleName="Holiday" />
}
