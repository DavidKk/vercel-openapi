import { ModuleManagePlaceholder } from '@/components/ModuleManagePlaceholder'
import { checkAccess } from '@/services/auth/access'

/**
 * DNS module manage page. Requires authenticated session.
 * @returns DNS manage page content
 */
export default async function DnsManagePage() {
  await checkAccess({ isApiRouter: false })
  return <ModuleManagePlaceholder moduleName="DNS Query" />
}
