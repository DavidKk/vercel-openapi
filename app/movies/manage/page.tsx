import { ModuleManagePlaceholder } from '@/components/ModuleManagePlaceholder'
import { checkAccess } from '@/services/auth/access'

/**
 * Movies module manage page. Requires authenticated session.
 * @returns Movies manage page content
 */
export default async function MoviesManagePage() {
  await checkAccess({ isApiRouter: false })
  return <ModuleManagePlaceholder moduleName="Movies" />
}
