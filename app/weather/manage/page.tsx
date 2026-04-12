import { ModuleManagePlaceholder } from '@/components/ModuleManagePlaceholder'
import { checkAccess } from '@/services/auth/access'

/**
 * Weather module manage page. Requires authenticated session.
 * @returns Weather manage page content
 */
export default async function WeatherManagePage() {
  await checkAccess({ isApiRouter: false })
  return <ModuleManagePlaceholder moduleName="China Weather" />
}
