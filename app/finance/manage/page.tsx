import { ModuleManagePlaceholder } from '@/components/ModuleManagePlaceholder'
import { checkAccess } from '@/services/auth/access'

/**
 * Finance module manage page. Requires authenticated session.
 * @returns Finance manage page content
 */
export default async function FinanceManagePage() {
  await checkAccess({ isApiRouter: false })
  return <ModuleManagePlaceholder moduleName="Finance" />
}
